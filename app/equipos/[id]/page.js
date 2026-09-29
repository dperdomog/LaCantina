import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import TeamActions from '@/components/TeamActions';
import { TeamApplicationsSection, PendingInvitationBanner, InvitePlayersSection } from '@/components/TeamPageActions';
import TeamRoster from '@/components/TeamRoster';
import TeamLogo from '@/components/TeamLogo';
import TeamEditPanel from '@/components/TeamEditPanel';
import TransferCaptain from '@/components/TransferCaptain';
import ScrimsSection from '@/components/ScrimsSection';
import TeamTrophies from '@/components/TeamTrophies';
import { averageBadge, RankChip } from '@/components/TeamRank';
import { refreshStaleRanks } from '@/lib/ranks';
import { createAdminClient } from '@/lib/supabase/admin';

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
  const memberIds   = (team.team_members ?? []).map(m => m.user_id);

  // Rangos del roster (se refrescan si tienen más de 6 h). Si la consulta o la
  // API fallan, simplemente no se muestran.
  let rankById = {};
  if (memberIds.length) {
    const { data: rankProfiles, error: rankErr } = await supabase
      .from('profiles').select('id, statlocker_url, rank_badge, rank_updated_at').in('id', memberIds);
    if (!rankErr && rankProfiles) {
      let fresh = rankProfiles;
      try { fresh = await refreshStaleRanks(createAdminClient(), rankProfiles); } catch {}
      rankById = Object.fromEntries(fresh.map(p => [p.id, p.rank_badge]));
    }
  }
  const teamAvg = averageBadge(Object.values(rankById));

  // Trofeos: torneos cuyo campeón es una inscripción de este equipo
  let trophies = [];
  const { data: teamRegs } = await supabase.from('registrations').select('id').eq('team_id', team.id);
  if (teamRegs?.length) {
    const { data: won } = await supabase.from('tournaments')
      .select('id, name, starts_at, date_display')
      .in('winner_registration_id', teamRegs.map(r => r.id));
    trophies = won ?? [];
  }

  // Scrims (solo miembros): pendientes y confirmados que no pasaron hace más de 3 h
  let scrims = [];
  let rivals = [];
  if (isMember) {
    const [{ data: scrimRows }, { data: otherTeams }] = await Promise.all([
      supabase.from('scrims')
        .select('id, from_team, to_team, proposed_at, message, status')
        .or(`from_team.eq.${team.id},to_team.eq.${team.id}`)
        .in('status', ['pending', 'accepted'])
        .gte('proposed_at', new Date(Date.now() - 3 * 3600e3).toISOString())
        .order('proposed_at'),
      supabase.from('teams').select('id, name, slug').neq('id', team.id).order('name'),
    ]);
    const teamsById = Object.fromEntries((otherTeams ?? []).map(t => [t.id, t]));
    scrims = (scrimRows ?? []).map(s => {
      const otherId = s.from_team === team.id ? s.to_team : s.from_team;
      return {
        ...s,
        direction: s.from_team === team.id ? 'sent' : 'received',
        other:     teamsById[otherId] ?? { id: otherId, name: 'Equipo' },
      };
    });
    if (isCaptain) rivals = (otherTeams ?? []).map(t => ({ id: t.id, name: t.name }));
  }

  // Miembros a los que el capitán puede pasar la capitanía
  const transferable = (team.team_members ?? [])
    .filter(m => m.user_id !== team.captain_id)
    .map(m => ({ id: m.user_id, name: m.profiles?.display_name ?? m.profiles?.discord_username ?? 'Jugador' }));

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
                {teamAvg && (
                  <span className="flex items-center gap-2">Rango promedio: <RankChip badge={teamAvg} /></span>
                )}
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

        {/* Trofeos */}
        <TeamTrophies trophies={trophies} />

        {/* Solicitudes pendientes — solo capitán */}
        <TeamApplicationsSection applications={applications} teamId={team.id} />

        {/* Invitar jugadores — solo capitán, si hay cupo */}
        {isCaptain && memberCount < 9 && <InvitePlayersSection players={freeAgents} teamId={team.id} />}

        {/* Invitación pendiente — solo para el invitado */}
        <PendingInvitationBanner invitation={pendingInvitation} />

        {/* Ajustes — solo capitán */}
        {isCaptain && (
          <details className="sticker p-6 md:p-8 mb-8 group">
            <summary className="font-display text-[24px] text-ink cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-3">
              ⚙️ Ajustes del equipo
              <span className="text-[20px] transition-transform group-open:rotate-180">▾</span>
            </summary>
            <div className="mt-6 flex flex-col gap-8">
              <TeamEditPanel team={{ id: team.id, description: team.description, region: team.region, commitment: team.commitment }} />
              <div className="border-t-[3px] border-line pt-6">
                <h3 className="font-display text-[20px] text-ink">Pasar la capitanía</h3>
                <p className="text-[14px] text-ink-dim mt-1 mb-4">El nuevo capitán podrá gestionar el equipo y tú quedarás como miembro.</p>
                <TransferCaptain teamId={team.id} members={transferable} />
              </div>
            </div>
          </details>
        )}

        {/* Scrims — solo miembros */}
        {isMember && <ScrimsSection teamId={team.id} isCaptain={isCaptain} scrims={scrims} rivals={rivals} />}

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
            rankById={rankById}
          />
        </div>

      </div>
    </main>
  );
}
