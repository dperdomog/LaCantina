import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import TeamActions from '@/components/TeamActions';
import { TeamApplicationsSection, PendingInvitationBanner } from '@/components/TeamPageActions';
import TeamRoster from '@/components/TeamRoster';

export async function generateMetadata({ params }) {
  const supabase = await createClient();
  const { data: team } = await supabase.from('teams').select('name').eq('id', params.id).single();
  return { title: team ? `${team.name} — La Cantina` : 'Equipo — La Cantina' };
}


export default async function TeamPage({ params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Aceptar tanto slug (los-lobos) como UUID para compatibilidad
  const isUuid = /^[0-9a-f-]{36}$/i.test(params.id);
  const teamQuery = supabase
    .from('teams')
    .select(`
      id, name, slug, region, logo_url, description, commitment, created_at, captain_id,
      profiles!teams_captain_id_fkey (id, display_name, discord_username, avatar_url),
      team_members (
        user_id, joined_at,
        profiles!team_members_user_id_fkey (id, display_name, discord_username, avatar_url, player_role, statlocker_url)
      )
    `);

  const { data: team } = await (isUuid
    ? teamQuery.eq('id', params.id)
    : teamQuery.eq('slug', params.id)
  ).single();

  if (!team) notFound();

  // Estado del usuario respecto al equipo
  let userTeamId       = null;
  let hasApplied       = false;
  let applications     = [];
  let pendingInvitation = null;

  if (user) {
    const { data: membership } = await supabase
      .from('team_members').select('team_id').eq('user_id', user.id).single();
    userTeamId = membership?.team_id ?? null;

    if (!userTeamId) {
      const { data: app } = await supabase
        .from('team_applications')
        .select('id').eq('team_id', team.id).eq('applicant_id', user.id).eq('status', 'pending').single();
      hasApplied = !!app;

      // Invitación pendiente de este equipo para el visitante
      const { data: inv } = await supabase
        .from('team_invitations')
        .select('id').eq('team_id', team.id).eq('invitee_id', user.id).eq('status', 'pending').single();
      pendingInvitation = inv ?? null;
    }

    // Solicitudes pendientes al equipo (solo capitán)
    if (team.captain_id === user.id) {
      const { data: apps } = await supabase
        .from('team_applications')
        .select('id, applicant_id, profiles!team_applications_applicant_id_fkey(display_name, discord_username, avatar_url)')
        .eq('team_id', team.id)
        .eq('status', 'pending');
      applications = apps ?? [];
    }
  }

  const isMember  = team.team_members?.some(m => m.user_id === user?.id);
  const isCaptain = team.captain_id === user?.id;
  const canApply  = user && !userTeamId && !hasApplied;
  const memberCount = team.team_members?.length ?? 0;

  return (
    <main className="min-h-screen bg-[#06070a] py-16 px-6 md:px-14">
      <div className="max-w-[860px] mx-auto">

        {/* Back */}
        <a href="/equipos" className="mono-label text-ink-dim hover:text-yellow transition-colors no-underline mb-10 block">
          ← Todos los equipos
        </a>

        {/* Header del equipo */}
        <div className="bg-[#0d0f15] border border-[rgba(255,214,10,0.2)] rounded-[20px] p-8 mb-6 glow-yellow">
          <div className="flex items-start gap-6 flex-wrap">

            {/* Logo */}
            {team.logo_url
              ? <img src={team.logo_url} alt={team.name}
                  className="w-24 h-24 rounded-[16px] object-cover border border-[rgba(255,214,10,0.2)] shrink-0" />
              : <div className="w-24 h-24 rounded-[16px] bg-yellow/10 border border-yellow/20 flex items-center justify-center font-display text-[40px] text-yellow shrink-0">
                  {team.name[0].toUpperCase()}
                </div>
            }

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
                <div>
                  <span className="mono-label text-yellow">// EQUIPO</span>
                  <h1 className="font-display text-[clamp(36px,6vw,64px)] leading-none text-ink mt-1">
                    {team.name}
                  </h1>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {team.commitment && (
                    <span className={`pill border text-[11px] font-semibold ${
                      team.commitment === 'Serio'
                        ? 'border-yellow/40 bg-yellow/10 text-yellow'
                        : 'border-cyan/40 bg-cyan/10 text-cyan'
                    }`}>
                      {team.commitment === 'Serio' ? '⚡ Serio' : '🎮 Por diversión'}
                    </span>
                  )}
                  {team.region && (
                    <span className="pill border border-[rgba(241,237,229,0.12)] text-ink-dim text-[11px]">
                      {team.region}
                    </span>
                  )}
                </div>
              </div>

              {team.description && (
                <p className="text-ink-dim text-[14px] leading-relaxed mt-2 max-w-[540px]">
                  {team.description}
                </p>
              )}

              <div className="flex items-center gap-4 mt-4 flex-wrap">
                <div className="flex items-center gap-2">
                  {team.profiles?.avatar_url
                    ? <img src={team.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                    : <div className="w-6 h-6 rounded-full bg-yellow/20 flex items-center justify-center mono-label text-[9px] text-yellow">
                        {(team.profiles?.display_name ?? '?')[0]}
                      </div>
                  }
                  <span className="mono-label text-[10px]">
                    Capitán: <a href={`/jugador/${team.captain_id}`} className="text-ink hover:text-yellow transition-colors no-underline">
                      {team.profiles?.display_name ?? team.profiles?.discord_username ?? '—'}
                    </a>
                  </span>
                </div>
                <span className="mono-label text-[10px] text-ink-dim">{memberCount}/9 miembros</span>
                <span className="mono-label text-[10px] text-ink-dim">
                  Creado {new Date(team.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Barra de ocupación */}
          <div className="mt-6">
            <div className="flex justify-between mono-label mb-2">
              <span>Cupos</span><span>{memberCount} / 9</span>
            </div>
            <div className="h-[4px] bg-[rgba(241,237,229,0.07)] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow to-[#ffe566] rounded-full transition-all"
                style={{ width: `${(memberCount / 9) * 100}%` }} />
            </div>
          </div>

          {/* Acciones */}
          <TeamActions
            teamId={team.id}
            isMember={isMember}
            isCaptain={isCaptain}
            canApply={canApply}
            hasApplied={hasApplied}
            isLoggedIn={!!user}
          />
        </div>

        {/* Solicitudes pendientes — solo capitán */}
        <TeamApplicationsSection applications={applications} teamId={team.id} />

        {/* Invitación pendiente — solo para el invitado */}
        <PendingInvitationBanner invitation={pendingInvitation} />

        {/* Miembros */}
        <div className="bg-[#0d0f15] border border-[rgba(241,237,229,0.08)] rounded-[20px] p-8">
          <span className="mono-label text-yellow block mb-6">// ROSTER</span>
          <TeamRoster
            members={team.team_members}
            captainId={team.captain_id}
            teamId={team.id}
            isCaptain={isCaptain}
          />
        </div>

      </div>
    </main>
  );
}
