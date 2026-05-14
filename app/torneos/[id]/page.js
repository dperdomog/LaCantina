import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TorneoDetallePage from '@/components/TorneoDetallePage';

export async function generateMetadata({ params }) {
  const supabase = await createClient();
  const { data: t } = await supabase
    .from('tournaments')
    .select('name')
    .eq('id', params.id)
    .single();
  return { title: t ? `${t.name} — La Cantina` : 'Torneo — La Cantina' };
}

export default async function Page({ params }) {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!tournament) notFound();

  // Normalizar nombres de campo para TorneoDetallePage
  const torneo = {
    ...tournament,
    date:     tournament.date_display ?? 'Por definir',
    time:     tournament.time_display ?? 'Por definir',
    maxSlots: tournament.max_slots,
  };

  const { data: registrations } = await supabase
    .from('registrations')
    .select('id, team_name, captain_nick, captain_discord, region, created_at')
    .eq('tournament_id', params.id)
    .order('created_at', { ascending: true });

  return (
    <TorneoDetallePage
      torneo={torneo}
      registrations={registrations ?? []}
    />
  );
}
