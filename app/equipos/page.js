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
      id, name, slug, region, logo_url, description, commitment, captain_id, created_at,
      profiles!teams_captain_id_fkey (display_name, discord_username, avatar_url),
      team_members (
        user_id,
        profiles!team_members_user_id_fkey (display_name, discord_username, avatar_url, player_role)
      )
    `)
    .order('created_at', { ascending: false });

  // Rango guardado de cada miembro (sin refrescar aquí, para no gastar la API).
  // Consulta aparte: si falla, las tarjetas simplemente no muestran el rango.
  const memberIds = (teams ?? []).flatMap(t => (t.team_members ?? []).map(m => m.user_id));
  let rankById = {};
  if (memberIds.length) {
    const { data: ranked, error: rankErr } = await supabase
      .from('profiles').select('id, rank_badge').in('id', memberIds);
    if (!rankErr) rankById = Object.fromEntries((ranked ?? []).map(p => [p.id, p.rank_badge]));
  }

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
    <main className="min-h-screen bg-bg">
      <div className="max-w-[1180px] mx-auto px-5 py-14 md:py-20">
        <EquiposClient
          teams={teams ?? []}
          currentUserId={user?.id ?? null}
          userTeamId={userTeamId}
          appliedTeamIds={appliedTeamIds}
          rankById={rankById}
        />
      </div>
    </main>
  );
}
