import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 60;

export async function GET() {
  const supabase = await createClient();

  const [
    discordRes,
    { count: players },
    { count: teams },
    { count: torneos },
  ] = await Promise.all([
    // Miembros de Discord
    fetch(
      `https://discord.com/api/v10/invites/${process.env.NEXT_PUBLIC_DISCORD_INVITE?.split('/').pop()}?with_counts=true`,
      { headers: { 'User-Agent': 'LaCantina/1.0' }, next: { revalidate: 60 } },
    ).then(r => r.ok ? r.json() : { approximate_member_count: 0, approximate_presence_count: 0 })
     .catch(() => ({ approximate_member_count: 0, approximate_presence_count: 0 })),

    // Jugadores registrados en la plataforma
    supabase.from('profiles').select('*', { count: 'exact', head: true }),

    // Equipos activos
    supabase.from('teams').select('*', { count: 'exact', head: true }),

    // Torneos realizados
    supabase.from('tournaments').select('*', { count: 'exact', head: true }),
  ]);

  return NextResponse.json({
    discord_members: discordRes.approximate_member_count ?? 0,
    discord_online:  discordRes.approximate_presence_count ?? 0,
    players:         players  ?? 0,
    teams:           teams    ?? 0,
    torneos:         torneos  ?? 0,
  });
}
