import { createClient } from '@/lib/supabase/server';
import JugadoresPage from '@/components/JugadoresPage';

export const metadata = {
  title: 'Jugadores — La Cantina',
  description: 'Directorio de jugadores de Deadlock en LATAM: filtra por rol, rango y país.',
  openGraph: {
    title: 'Jugadores — La Cantina',
    description: 'Directorio de jugadores de Deadlock en LATAM: filtra por rol, rango y país.',
    images: ['/og.png'],
  },
};

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetchear perfiles y membresías por separado para evitar joins ambiguos
  const [{ data: profiles }, { data: memberships }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, discord_username, avatar_url, player_role, rank_badge, country')
      .order('created_at', { ascending: false }),
    supabase
      .from('team_members')
      .select('user_id, teams(id, name)'),
  ]);

  // Mapear user_id → equipo
  const teamByUser = {};
  for (const m of memberships ?? []) {
    if (m.teams) teamByUser[m.user_id] = m.teams;
  }

  const players = (profiles ?? []).map(p => ({
    ...p,
    team: teamByUser[p.id] ?? null,
  }));

  // Si el visitante es capitán, obtener su team_id
  let viewerTeamId = null;
  if (user) {
    const { data: myTeam } = await supabase
      .from('teams').select('id').eq('captain_id', user.id).single();
    viewerTeamId = myTeam?.id ?? null;
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-[1180px] mx-auto px-5 py-14 md:py-20">
        <JugadoresPage
          players={players}
          currentUserId={user?.id ?? null}
          viewerTeamId={viewerTeamId}
        />
      </div>
    </main>
  );
}
