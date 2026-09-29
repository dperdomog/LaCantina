// Datos del inicio: Discord, torneos, equipos y jugadores recientes (server-side)

async function getDiscordCounts() {
  // Código del invite: https://discord.gg/CODIGO
  const code = (process.env.NEXT_PUBLIC_DISCORD_INVITE ?? '').split('/').pop();
  if (!code || code === '#discord') return { members: 0, online: 0 };

  try {
    const res = await fetch(
      `https://discord.com/api/v10/invites/${code}?with_counts=true`,
      { headers: { 'User-Agent': 'LaCantina/1.0' }, next: { revalidate: 60 } },
    );
    if (!res.ok) throw new Error('Discord API error');
    const data = await res.json();
    return {
      members: data.approximate_member_count  ?? 0,
      online:  data.approximate_presence_count ?? 0,
    };
  } catch {
    return { members: 0, online: 0 };
  }
}

export async function loadHomeData(supabase) {
  const [discord, torneosRes, regsRes, playersRes, teamsRes] = await Promise.all([
    getDiscordCounts(),
    supabase.from('tournaments')
      .select('id, name, format, date_display, time_display, starts_at, status, max_slots, prize, region, featured')
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('registrations').select('tournament_id'),
    supabase.from('profiles')
      .select('id, display_name, discord_username, avatar_url', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('teams')
      .select('id, slug, name, team_members(count)')
      .order('created_at', { ascending: false }),
  ]);

  const filled = {};
  for (const r of regsRes.data ?? []) filled[r.tournament_id] = (filled[r.tournament_id] ?? 0) + 1;
  const torneos = (torneosRes.data ?? []).map(t => ({ ...t, filled: filled[t.id] ?? 0 }));

  const teams = (teamsRes.data ?? []).map(t => ({ ...t, members: t.team_members?.[0]?.count ?? 0 }));

  return {
    ...discord,
    next:        torneos.find(t => t.status === 'open' || t.status === 'live') ?? torneos.find(t => t.status === 'soon') ?? null,
    torneoCount: torneos.length,
    players:     playersRes.data ?? [],
    playerCount: playersRes.count ?? 0,
    teams,
  };
}
