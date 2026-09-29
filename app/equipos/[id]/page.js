import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import TeamActions from '@/components/TeamActions';
import { TeamApplicationsSection, PendingInvitationBanner, InvitePlayersSection } from '@/components/TeamPageActions';
import TeamRoster from '@/components/TeamRoster';
import TeamLogo from '@/components/TeamLogo';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const isUuid = /^[0-9a-f-]{36}$/i.test(id);
  const { data: team } = await supabase.from('teams')
    .select('name, description, logo_url')
    .eq(isUuid ? 'id' : 'slug', id)
    .single();
  if (!team) return { title: 'Equipo — La Cantina' };

  const title       = `${team.name} — La Cantina`;
  const description = team.description ?? `Equipo de Deadlock en La Cantina. Mira su roster y postula.`;
  return {
    title,
    description,
    openGraph: { title, description, images: [team.logo_url ?? '/og.png'] },
  };
}


export default async function TeamPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Aceptar tanto slug (los-lobos) como UUID para compatibilidad
  const isUuid = /^[0-9a-f-]{36}$/i.test(id);
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
    ? teamQuery.eq('id', id)
    : teamQuery.eq('slug', id)
  ).single();

  if (!team) notFound();

  // Estado del usuario respecto al equipo
  let userTeamId       = null;
  let hasApplied       = false;
  let applications     = [];
  let pendingInvitation = null;
  let freeAgents       = [];

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

      // Jugadores sin equipo para invitar, marcando los ya invitados
      const [{ data: profiles }, { data: members }, { data: invites }] = await Promise.all([
        supabase.from('profiles')
          .select('id, display_name, discord_username, avatar_url, player_role')
          .order('created_at', { ascending: false }),
        supabase.from('team_members').select('user_id'),
        supabase.from('team_invitations').select('invitee_id').eq('team_id', team.id).eq('status', 'pending'),
      ]);
      const inTeam  = new Set((members ?? []).map(m => m.user_id));
      const invited = new Set((invites ?? []).map(i => i.invitee_id));
      freeAgents = (profiles ?? [])
        .filter(p => !inTeam.has(p.id))
        .map(p => ({ ...p, invited: invited.has(p.id) }));
    }
  }

  const isMember  = team.team_members?.some(m => m.user_id === user?.id);
  const isCaptain = team.captain_id === user?.id;
  const canApply  = user && !userTeamId && !hasApplied;
  const memberCount = team.team_members?.length ?? 0;

  return (
    <main className="min-h-screen bg-bg">
      <div className="max-w-[960px] mx-auto px-5 py-14 md:py-20">

        {/* Back */}
        <a href="/equipos" className="font-display text-[17px] text-ink hover:underline underline-offset-4 no-underline mb-8 inline-block">
          ← Todos los equipos
        </a>

        {/* Header del equipo */}
        <div className="sticker p-6 md:p-8 mb-8">
          <div className="flex items-start gap-6 flex-wrap">

            {/* Logo (el capitán puede cambiarlo) */}
            <TeamLogo teamId={team.id} name={team.name} logoUrl={team.logo_url} canEdit={isCaptain} />

            <div className="flex-1 min-w-0">
              <span className="mono-label">🛡️ Equipo</span>
              <h1 className="font-display text-[clamp(36px,6vw,60px)] leading-[1] tracking-[-0.02em] text-ink mt-1 break-words">
                {team.name}
              </h1>

              {(team.commitment || team.region) && (
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  {team.commitment && (
                    <span className={`pill text-on-color ${team.commitment === 'Serio' ? 'bg-yellow' : 'bg-cyan'}`}>
                      {team.commitment === 'Serio' ? '⚡ Serio' : '🎮 Por diversión'}
                    </span>
                  )}
                  {team.region && (
                    <span className="pill bg-surface text-ink">{team.region}</span>
                  )}
                </div>
              )}

              {team.description && (
                <p className="text-ink-dim text-[16px] leading-relaxed mt-4 max-w-[560px]">
                  {team.description}
                </p>
              )}

              <div className="flex items-center gap-x-5 gap-y-2 mt-5 flex-wrap text-[14px] text-ink-dim">
                <div className="flex items-center gap-2">
                  {team.profiles?.avatar_url
                    ? <img src={team.profiles.avatar_url} alt="" className="w-7 h-7 rounded-full border-2 border-line" />
                    : <div className="w-7 h-7 rounded-full bg-green border-2 border-line flex items-center justify-center font-display text-[12px] text-on-color">
                        {(team.profiles?.display_name ?? '?')[0]}
                      </div>
                  }
                  <span>
                    Capitán: <a href={`/jugador/${team.captain_id}`} className="text-ink font-bold hover:underline underline-offset-2 no-underline">
                      {team.profiles?.display_name ?? team.profiles?.discord_username ?? '—'}
                    </a>
                  </span>
                </div>
                <span>{memberCount}/9 miembros</span>
                <span>
                  Creado el {new Date(team.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Barra de ocupación */}
          <div className="mt-7">
            <div className="flex justify-between text-[14px] font-bold mb-2">
              <span>Cupos</span><span>{memberCount} / 9</span>
            </div>
            <div className="h-4 bg-surface-2 border-[3px] border-line rounded-full overflow-hidden">
              <div className="h-full bg-orange transition-all"
                style={{ width: `${Math.min(100, (memberCount / 9) * 100)}%` }} />
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

        {/* Invitar jugadores — solo capitán, si hay cupo */}
        {isCaptain && memberCount < 9 && <InvitePlayersSection players={freeAgents} teamId={team.id} />}

        {/* Invitación pendiente — solo para el invitado */}
        <PendingInvitationBanner invitation={pendingInvitation} />

        {/* Miembros */}
        <div className="sticker p-6 md:p-8">
          <div className="flex items-baseline justify-between gap-4 mb-6">
            <h2 className="font-display text-[30px] leading-none text-ink">Roster</h2>
            <span className="mono-label">{memberCount} {memberCount === 1 ? 'jugador' : 'jugadores'}</span>
          </div>
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
