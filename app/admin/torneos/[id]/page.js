import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import TorneoAdmin from '@/components/admin/TorneoAdmin';

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Admin: ${id} — La Cantina` };
}

export default async function AdminTorneoPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();

  if (!tournament) notFound();

  const [{ data: registrations }, { data: matches }] = await Promise.all([
    supabase
      .from('registrations')
      .select('id, team_name, captain_nick, captain_discord, region, members, experience, created_at, checked_in_at, seed')
      .eq('tournament_id', id)
      .order('created_at', { ascending: true }),
    supabase.from('matches').select('*').eq('tournament_id', id),
  ]);

  return (
    <TorneoAdmin
      tournament={tournament}
      registrations={registrations ?? []}
      matches={matches ?? []}
    />
  );
}
