import { createClient } from '@/lib/supabase/server';
import EquiposClient from '@/components/EquiposClient';

export const metadata = { title: 'Equipos — La Cantina' };

export default async function EquiposPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Todos los equipos con sus miembros y perfiles
  const { data: teams } = await supabase
    .from('teams')
    .select(`
      id, name, region, logo_url, description, commitment, captain_id, created_at,
      profiles!teams_captain_id_fkey (display_name, discord_username, avatar_url),
      team_members (
        user_id,
        profiles!team_members_user_id_fkey (display_name, discord_username, avatar_url, player_role)
      )
    `)
    .order('created_at', { ascending: false });

  // Equipo actual del usuario
  let userTeamId = null;
  let appliedTeamIds = [];

  if (user) {
    const { data: membership } = await supabase
      .from('team_members').select('team_id').eq('user_id', user.id).single();
    userTeamId = membership?.team_id ?? null;

    const { data: applications } = await supabase
      .from('team_applications')
      .select('team_id')
      .eq('applicant_id', user.id)
      .eq('status', 'pending');
    appliedTeamIds = applications?.map(a => a.team_id) ?? [];
  }

  return (
    <main className="min-h-screen bg-[#06070a] py-24 px-6 md:px-14">
      <div className="max-w-[1160px] mx-auto">
        <EquiposClient
          teams={teams ?? []}
          currentUserId={user?.id ?? null}
          userTeamId={userTeamId}
          appliedTeamIds={appliedTeamIds}
        />
      </div>
    </main>
  );
}
