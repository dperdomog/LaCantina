import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import TorneoAdmin from '@/components/admin/TorneoAdmin';

export async function generateMetadata({ params }) {
  return { title: `Admin: ${params.id} — La Cantina` };
}

export default async function AdminTorneoPage({ params }) {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!tournament) notFound();

  const { data: registrations } = await supabase
    .from('registrations')
    .select('id, team_name, captain_nick, captain_discord, region, members, experience, created_at')
    .eq('tournament_id', params.id)
    .order('created_at', { ascending: true });

  return (
    <TorneoAdmin
      tournament={tournament}
      registrations={registrations ?? []}
    />
  );
}
