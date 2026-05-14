import { NextResponse } from 'next/server';

export const revalidate = 60; // refrescar cada 60s

export async function GET() {
  const inviteUrl = process.env.NEXT_PUBLIC_DISCORD_INVITE ?? '';

  // Extraer el código del invite: https://discord.gg/CODIGO
  const code = inviteUrl.split('/').pop();

  if (!code || code === '#discord') {
    return NextResponse.json({ members: 0, online: 0 });
  }

  try {
    const res = await fetch(
      `https://discord.com/api/v10/invites/${code}?with_counts=true`,
      { headers: { 'User-Agent': 'LaCantina/1.0' }, next: { revalidate: 60 } },
    );

    if (!res.ok) throw new Error('Discord API error');

    const data = await res.json();
    return NextResponse.json({
      members:  data.approximate_member_count  ?? 0,
      online:   data.approximate_presence_count ?? 0,
      guild_id: data.guild?.id ?? null,
    });
  } catch {
    return NextResponse.json({ members: 0, online: 0 });
  }
}
