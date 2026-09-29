import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import InviteButton from '@/components/InviteButton';
import CopyButton from '@/components/CopyButton';

const ROLE_COLORS = {
  Carry:     'bg-yellow',
  Flex:      'bg-green',
  Frontline: 'bg-[#f97316]',
  Support:   'bg-cyan',
  Pick:      'bg-[#a78bfa]',
  Roamer:    'bg-pink',
};
const STRIPES = ['#00d97e', '#00c8f0', '#ffd400', '#ff7043', '#ff2d2d'];

export default async function JugadorPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
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
    <main className="min-h-screen">
      <div className="max-w-[860px] mx-auto px-5 py-14 md:py-20">

        {/* Portada + identidad */}
        <div className="sticker overflow-hidden">
          <div className="relative h-[150px] md:h-[190px] border-b-[3px] border-line">
            {profile.banner_url
              ? <img src={profile.banner_url} alt="" className="w-full h-full object-cover" />
              : <div className="absolute inset-0 flex">
                  {STRIPES.map(c => <span key={c} className="flex-1" style={{ background: c }} />)}
                </div>
            }
          </div>
          <div className="px-6 pb-6 flex flex-col sm:flex-row gap-4 sm:gap-5">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={profile.display_name ?? ''}
                  className="w-28 h-28 rounded-full border-[4px] border-line bg-surface object-cover shadow-sticker-sm shrink-0 relative -mt-14" />
              : <div className="w-28 h-28 rounded-full border-[4px] border-line bg-yellow flex items-center justify-center font-display text-[48px] text-on-color shadow-sticker-sm shrink-0 relative -mt-14">
                  {(profile.display_name ?? '?')[0].toUpperCase()}
                </div>
            }
            <div className="flex-1 min-w-0 flex items-start justify-between gap-4 flex-wrap sm:pt-4">
              <div className="min-w-0">
                <h1 className="font-display text-[clamp(30px,5vw,48px)] leading-none text-ink break-words">
                  {profile.display_name ?? profile.discord_username ?? 'Jugador'}
                </h1>
                {profile.discord_username && (
                  <p className="text-[15px] text-ink-dim mt-1.5">@{profile.discord_username}</p>
                )}
              </div>
              {canInvite && <InviteButton teamId={viewerTeamId} inviteeId={profile.id} />}
              {isOwnProfile && (
                <a href="/profile" className="btn btn-secondary btn-sm">Editar perfil →</a>
              )}
            </div>
          </div>
        </div>

        {/* Tarjetas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">

          {/* Equipo y rol */}
          <div className="sticker p-6">
            <span className="mono-label block mb-4">🛡️ Equipo y rol</span>
            <dl className="flex flex-col gap-4">
              <div>
                <dt className="mono-label text-[11px] mb-1">Equipo</dt>
                <dd className="font-display text-[20px]">
                  {membership?.teams?.name
                    ? <a href="/equipos" className="text-ink underline decoration-[3px] decoration-yellow underline-offset-4 hover:decoration-ink">
                        {membership.teams.name}
                      </a>
                    : <span className="pill bg-cyan text-on-color">Free agent</span>
                  }
                </dd>
              </div>
              <div>
                <dt className="mono-label text-[11px] mb-1.5">Rol</dt>
                <dd>
                  {profile.player_role
                    ? <span className={`pill text-on-color ${ROLE_COLORS[profile.player_role] ?? 'bg-surface-2'}`}>
                        {profile.player_role}
                      </span>
                    : <span className="text-ink-dim text-[15px]">Sin rol elegido</span>
                  }
                </dd>
              </div>
            </dl>
          </div>

          {/* StatLocker */}
          <div className="sticker p-6 flex flex-col">
            <span className="mono-label block mb-4">📈 Deadlock · StatLocker</span>
            {profile.statlocker_url
              ? <a href={profile.statlocker_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary self-start">
                  Ver en StatLocker ↗
                </a>
              : <p className="text-ink-dim text-[15px]">Todavía no vinculó su perfil de StatLocker.</p>
            }
          </div>

          {/* Contacto */}
          <div className="sticker bg-yellow text-on-color p-6 sm:col-span-2">
            <span className="font-display text-[15px] uppercase tracking-wider block mb-3">💬 Contacto</span>
            {profile.discord_username ? (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="font-display text-[26px] leading-tight break-all">@{profile.discord_username}</p>
                  <p className="text-[14px] mt-1">Busca este usuario en Discord para contactarlo.</p>
                </div>
                <CopyButton text={profile.discord_username} />
              </div>
            ) : (
              <p className="text-[15px]">Este jugador no tiene usuario de Discord registrado.</p>
            )}
          </div>

        </div>

        <div className="mt-8">
          <a href="/equipos" className="font-display text-[17px] text-ink underline decoration-[3px] underline-offset-4">
            ← Ver todos los equipos
          </a>
        </div>
      </div>
    </main>
  );
}
