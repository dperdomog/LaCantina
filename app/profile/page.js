import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import StatlockerForm from '@/components/StatlockerForm';
import TeamRoleForm from '@/components/TeamRoleForm';
import TeamSection from '@/components/TeamSection';
import InvitationsSection from '@/components/InvitationsSection';
import UsernameForm from '@/components/UsernameForm';
import CountryForm from '@/components/CountryForm';
import BannerUpload from '@/components/BannerUpload';
import RankBadge from '@/components/RankBadge';
import { countryInfo } from '@/lib/countries';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlayerStats } from '@/lib/playerStats';
import PlayerStats from '@/components/PlayerStats';
import BannedNotice from '@/components/BannedNotice';

export const metadata = { title: 'Mi Perfil — La Cantina' };

const STRIPES = ['#00d97e', '#00c8f0', '#ffd400', '#ff7043', '#ff2d2d'];

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single();

  const meta            = user.user_metadata ?? {};
  const discordIdentity = user.identities?.find(i => i.provider === 'discord');
  const avatarUrl       = profile?.avatar_url ?? meta.avatar_url;
  const bannerUrl       = profile?.custom_banner_url ?? profile?.banner_url;
  const country         = countryInfo(profile?.country);
  const username        = profile?.discord_username
                        || meta.user_name
                        || discordIdentity?.identity_data?.user_name
                        || null;
  const displayName     = profile?.display_name ?? meta.full_name;
  const email           = profile?.email ?? user.email;

  // Equipo actual
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id, teams(id, name, region, captain_id, logo_url)')
    .eq('user_id', user.id).single();

  const team      = membership?.teams ?? null;
  const isCaptain = team?.captain_id === user.id;

  // Solicitudes pendientes al equipo (si es capitán)
  let applications = [];
  if (isCaptain) {
    const { data } = await supabase
      .from('team_applications')
      .select('id, applicant_id, profiles!team_applications_applicant_id_fkey(display_name, discord_username, avatar_url)')
      .eq('team_id', team.id)
      .eq('status', 'pending');
    applications = data ?? [];
  }

  // Estadísticas de partidas (caché de 3 h; null si no hay datos)
  const stats = profile ? await getPlayerStats(createAdminClient(), profile) : null;

  // Invitaciones pendientes para el usuario
  const { data: invitations } = await supabase
    .from('team_invitations')
    .select('id, team_id, teams(name)')
    .eq('invitee_id', user.id)
    .eq('status', 'pending');

  return (
    <main className="min-h-screen">
      <div className="max-w-[860px] mx-auto px-5 py-14 md:py-20">

        {profile?.banned_at && <BannedNotice reason={profile.ban_reason} className="mb-8" />}

        {/* Portada + identidad */}
        <div className="sticker overflow-hidden">
          <div className="relative h-[150px] md:h-[190px] border-b-[3px] border-line">
            {bannerUrl
              ? <img src={bannerUrl} alt="Banner del perfil" className="w-full h-full object-cover" />
              : <div className="absolute inset-0 flex">
                  {STRIPES.map(c => <span key={c} className="flex-1" style={{ background: c }} />)}
                </div>
            }
            <BannerUpload userId={user.id} hasCustom={!!profile?.custom_banner_url} />
          </div>
          <div className="px-6 pb-6 flex flex-col sm:flex-row gap-4 sm:gap-5">
            {avatarUrl
              ? <img src={avatarUrl} alt={displayName ?? 'Avatar'}
                  className="w-28 h-28 rounded-full border-[4px] border-line bg-surface object-cover shadow-sticker-sm shrink-0 relative -mt-14" />
              : <div className="w-28 h-28 rounded-full border-[4px] border-line bg-yellow flex items-center justify-center font-display text-[48px] text-on-color shadow-sticker-sm shrink-0 relative -mt-14">
                  {(displayName ?? email ?? '?')[0].toUpperCase()}
                </div>
            }
            <div className="flex-1 min-w-0 flex items-start justify-between gap-4 flex-wrap sm:pt-4">
              <div className="min-w-0">
                <span className="mono-label">Mi perfil</span>
                <h1 className="font-display text-[clamp(30px,5vw,48px)] leading-none text-ink break-words mt-1">
                  {displayName ?? username ?? 'Jugador'}
                </h1>
                {username && <p className="text-[15px] text-ink-dim mt-1.5">@{username}{country ? ` · ${country.flag} ${country.name}` : ''}</p>}
                {profile?.rank_badge != null && <div className="mt-2"><RankBadge badge={profile.rank_badge} /></div>}
              </div>
              <a href={`/jugador/${user.id}`} className="btn btn-secondary btn-sm">Ver perfil público →</a>
            </div>
          </div>
        </div>

        {/* Tarjetas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8 items-start">

          {/* Invitaciones pendientes — ancho completo */}
          <InvitationsSection invitations={invitations ?? []} />

          {/* Equipo actual — ancho completo */}
          {team
            ? <TeamSection team={team} isCaptain={isCaptain} applications={applications} />
            : (
              <div className="sticker bg-cyan text-on-color p-6 col-span-full flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <span className="font-display text-[15px] uppercase tracking-wider block mb-1">🛡️ Mi equipo</span>
                  <p className="text-[16px]">Todavía no tienes equipo. Eres free agent.</p>
                </div>
                <a href="/equipos" className="btn bg-white text-[#1c1c1c]">Ver equipos →</a>
              </div>
            )
          }

          {/* StatLocker */}
          <StatlockerForm initialUrl={profile?.statlocker_url ?? null} initialRank={profile?.rank_badge ?? null} />

          {/* Identidad — editable */}
          <UsernameForm
            initialDisplayName={profile?.display_name ?? null}
            discordUsername={username ?? null}
          />

          <CountryForm initialCountry={profile?.country ?? null} />

          <div className="sticker p-6 sm:col-span-2">
            <span className="mono-label block mb-4">✉️ Contacto</span>
            <dl className="flex flex-col gap-4">
              <div>
                <dt className="mono-label text-[11px] mb-1">Email</dt>
                <dd className="text-ink text-[15px] break-all">{email ?? '—'}</dd>
              </div>
              <div>
                <dt className="mono-label text-[11px] mb-1">Miembro desde</dt>
                <dd className="text-ink-dim text-[15px]">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Rol — ancho completo */}
          <TeamRoleForm
            initialTeam={null}
            initialRole={profile?.player_role ?? null}
          />

          {/* Partidas — ancho completo */}
          <PlayerStats stats={stats} hasStatlocker={!!profile?.statlocker_url} isOwnProfile />

        </div>

        <div className="mt-8">
          <a href="/" className="font-display text-[17px] text-ink underline decoration-[3px] underline-offset-4">
            ← Volver al inicio
          </a>
        </div>
      </div>
    </main>
  );
}
