import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TorneoDetallePage from '@/components/TorneoDetallePage';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: t } = await supabase
    .from('tournaments')
    .select('name, description, format, prize')
    .eq('id', id)
    .single();
  if (!t) return { title: 'Torneo — La Cantina' };

  const title       = `${t.name} — La Cantina`;
  const description = t.description ?? `Torneo ${t.format} de Deadlock en La Cantina${t.prize ? ` · Premio: ${t.prize}` : ''}.`;
  return { title, description, openGraph: { title, description, images: ['/og.png'] } };
}

export default async function Page({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();

  if (!tournament) notFound();

  // Normalizar nombres de campo para TorneoDetallePage
  const torneo = {
    ...tournament,
    date:     tournament.date_display ?? 'Por definir',
    time:     tournament.time_display ?? 'Por definir',
    maxSlots: tournament.max_slots,
  };

  const [{ data: { user } }, { data: registrations }, { data: matches }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('registrations')
      .select('id, user_id, team_name, captain_nick, captain_discord, region, created_at, checked_in_at')
      .eq('tournament_id', id)
      .order('created_at', { ascending: true }),
    supabase.from('matches').select('*').eq('tournament_id', id),
  ]);

  const regs = registrations ?? [];
  const myRegistration = user ? regs.find(r => r.user_id === user.id) ?? null : null;

  return (
    <TorneoDetallePage
      torneo={torneo}
      registrations={regs.map(({ user_id, ...r }) => r)}
      matches={matches ?? []}
      myRegistration={myRegistration && { id: myRegistration.id, checked_in_at: myRegistration.checked_in_at }}
    />
  );
}
