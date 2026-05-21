import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import InviteButton from '@/components/InviteButton';
import CopyButton from '@/components/CopyButton';

const ROLE_COLORS = {
  Carry: 'text-yellow border-yellow/40 bg-yellow/10',
  Flex: 'text-green border-green/40 bg-green/10',
  Frontline: 'text-[#f97316] border-[#f97316]/40 bg-[#f97316]/10',
  Support: 'text-cyan border-cyan/40 bg-cyan/10',
  Pick: 'text-[#a78bfa] border-[#a78bfa]/40 bg-[#a78bfa]/10',
  Roamer: 'text-pink border-pink/40 bg-pink/10',
};

export default async function JugadorPage({ params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!profile) notFound();

  // Equipo del jugador
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id, teams(id, name)')
    .eq('user_id', profile.id)
    .single();

  // Si el visitante es capitán, verificarlo
  let viewerTeamId = null;
  if (user && user.id !== profile.id) {
    const { data: viewerTeam } = await supabase
      .from('teams').select('id').eq('captain_id', user.id).single();
    viewerTeamId = viewerTeam?.id ?? null;
  }

  const isOwnProfile = user?.id === profile.id;
  const isFreeAgent  = !membership;
  const canInvite    = viewerTeamId && isFreeAgent && !isOwnProfile;

  return (
    <main className="min-h-screen bg-[#06070a]">

      {/* Banner */}
      <div className="relative w-full h-[200px] md:h-[240px] bg-[#0d0f15] overflow-hidden">
        {profile.banner_url
          ? <img src={profile.banner_url} alt="" className="w-full h-full object-cover" />
          : <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,214,10,0.10)_0%,transparent_70%)]" />
        }
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#06070a]" />
      </div>

      <div className="max-w-[760px] mx-auto px-6 md:px-14 -mt-16 relative z-10 pb-24">

        {/* Avatar + nombre */}
        <div className="flex items-end gap-5 mb-8">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt={profile.display_name ?? ''}
                className="w-28 h-28 rounded-full border-4 border-[#06070a] shadow-[0_0_0_2px_rgba(255,214,10,0.3)] shrink-0" />
            : <div className="w-28 h-28 rounded-full border-4 border-[#06070a] bg-yellow flex items-center justify-center font-display text-[48px] text-[#0a0a0a] shrink-0">
                {(profile.display_name ?? '?')[0].toUpperCase()}
              </div>
          }
          <div className="pb-2 flex-1">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="font-display text-[clamp(28px,5vw,48px)] leading-none text-ink">
                  {profile.display_name ?? profile.discord_username ?? 'Jugador'}
                </h1>
                {profile.discord_username && (
                  <p className="mono-label text-yellow mt-1.5">@{profile.discord_username}</p>
                )}
              </div>
              {canInvite && <InviteButton teamId={viewerTeamId} inviteeId={profile.id} />}
              {isOwnProfile && (
                <a href="/profile" className="mono-label text-ink-dim hover:text-yellow transition-colors no-underline text-[10px]">
                  Editar perfil →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Equipo y rol */}
          <div className="bg-[#0d0f15] border border-[rgba(241,237,229,0.08)] rounded-[16px] p-5">
            <span className="mono-label text-yellow block mb-3">// EQUIPO & ROL</span>
            <dl className="flex flex-col gap-3">
              <div>
                <dt className="mono-label text-[10px] mb-0.5">Equipo</dt>
                <dd className="text-ink text-[15px] font-semibold">
                  {membership?.teams?.name
                    ? <a href="/equipos" className="text-yellow no-underline hover:opacity-80 transition-opacity">
                        {membership.teams.name}
                      </a>
                    : <span className="text-ink-dim">Free Agent</span>
                  }
                </dd>
              </div>
              <div>
                <dt className="mono-label text-[10px] mb-1">Rol</dt>
                <dd>
                  {profile.player_role
                    ? <span className={`pill border text-[12px] font-semibold ${ROLE_COLORS[profile.player_role] ?? 'text-ink-dim'}`}>
                        {profile.player_role}
                      </span>
                    : <span className="text-ink text-[15px]">—</span>
                  }
                </dd>
              </div>
            </dl>
          </div>

          {/* StatLocker */}
          <div className="bg-[#0d0f15] border border-[rgba(241,237,229,0.08)] rounded-[16px] p-5">
            <span className="mono-label text-yellow block mb-3">// DEADLOCK · STATLOCKER</span>
            {profile.statlocker_url
              ? <a href={profile.statlocker_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[rgba(255,214,10,0.3)] text-yellow text-[13px] font-semibold no-underline hover:bg-yellow/10 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                  Ver en StatLocker ↗
                </a>
              : <p className="text-ink-dim text-[13px]">Sin perfil vinculado.</p>
            }
          </div>

          {/* Contacto */}
          <div className="bg-[#0d0f15] border border-[rgba(241,237,229,0.08)] rounded-[16px] p-5 sm:col-span-2">
            <span className="mono-label text-yellow block mb-3">// CONTACTO</span>
            {profile.discord_username ? (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="mono-label text-[10px] mb-1">Discord</p>
                  <p className="text-ink text-[18px] font-semibold">@{profile.discord_username}</p>
                  <p className="text-ink-dim text-[12px] mt-0.5">Buscá este usuario en Discord para contactarlo</p>
                </div>
                <CopyButton text={profile.discord_username} />
              </div>
            ) : (
              <p className="text-ink-dim text-[13px]">Este jugador no tiene usuario de Discord registrado.</p>
            )}
          </div>

        </div>

        <div className="mt-5">
          <a href="/equipos" className="mono-label text-ink-dim hover:text-yellow transition-colors no-underline">
            ← Ver todos los equipos
          </a>
        </div>
      </div>
    </main>
  );
}
