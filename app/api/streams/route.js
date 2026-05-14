import { NextResponse } from 'next/server';

// ─── Editar: usernames de Twitch de los streamers LATAM ───────────────────────
const STREAMERS = [
  'daek_',
  'DaseinDL',
];

let tokenCache = null;

async function getAppToken() {
  if (tokenCache && tokenCache.expires > Date.now()) return tokenCache.token;
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type:    'client_credentials',
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  tokenCache = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
  return tokenCache.token;
}

export const revalidate = 30;

export async function GET() {
  const clientId     = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({
      streamers: STREAMERS.map(u => ({ username: u, live: false, viewers: 0, title: '', game: '', thumbnail: null, avatar: null })),
    });
  }

  try {
    const token = await getAppToken();
    if (!token) throw new Error('No token');

    const params = STREAMERS.map(u => `user_login=${u}`).join('&');
    const [streamsRes, usersRes] = await Promise.all([
      fetch(`https://api.twitch.tv/helix/streams?${params}&first=20`, {
        headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}` },
        next: { revalidate: 30 },
      }),
      fetch(`https://api.twitch.tv/helix/users?${params}`, {
        headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}` },
        next: { revalidate: 3600 },
      }),
    ]);

    const { data: streams } = await streamsRes.json();
    const { data: users }   = await usersRes.json();

    const liveMap = {};
    for (const s of streams ?? []) {
      liveMap[s.user_login.toLowerCase()] = {
        viewers:   s.viewer_count,
        title:     s.title,
        game:      s.game_name,
        thumbnail: s.thumbnail_url
          .replace('{width}', '440')
          .replace('{height}', '248'),
      };
    }

    const avatarMap  = {};
    const offlineMap = {};
    for (const u of users ?? []) {
      avatarMap[u.login.toLowerCase()]  = u.profile_image_url;
      offlineMap[u.login.toLowerCase()] = u.offline_image_url || null;
    }

    const result = STREAMERS.map(username => {
      const key  = username.toLowerCase();
      const live = !!liveMap[key];
      return {
        username,
        live,
        viewers:      live ? liveMap[key].viewers   : 0,
        title:        live ? liveMap[key].title      : '',
        game:         live ? liveMap[key].game       : '',
        thumbnail:    live ? liveMap[key].thumbnail  : null,
        avatar:       avatarMap[key]  ?? null,
        offline_image: offlineMap[key] ?? null,
      };
    });

    // En vivo primero
    result.sort((a, b) => b.live - a.live || b.viewers - a.viewers);

    return NextResponse.json({ streamers: result });
  } catch {
    return NextResponse.json({
      streamers: STREAMERS.map(u => ({ username: u, live: false, viewers: 0, title: '', game: '', thumbnail: null, avatar: null })),
    });
  }
}
