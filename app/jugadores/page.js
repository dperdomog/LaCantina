import { createClient } from '@/lib/supabase/server';
import JugadoresPage from '@/components/JugadoresPage';

export const metadata = { title: 'Jugadores — La Cantina' };

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetchear perfiles y membresías por separado para evitar joins ambiguos
  const [{ data: profiles }, { data: memberships }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, discord_username, avatar_url, player_role')
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
    <main className="min-h-screen bg-[#06070a] py-24 px-6 md:px-14">
      <div className="max-w-[1160px] mx-auto">
        <JugadoresPage
          players={players}
          currentUserId={user?.id ?? null}
          viewerTeamId={viewerTeamId}
        />
      </div>
    </main>
  );
}
