import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import StatlockerForm from '@/components/StatlockerForm';
import TeamRoleForm from '@/components/TeamRoleForm';
import TeamSection from '@/components/TeamSection';
import InvitationsSection from '@/components/InvitationsSection';

export const metadata = { title: 'Mi Perfil — La Cantina' };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single();

  const meta         = user.user_metadata ?? {};
  const avatarUrl    = profile?.avatar_url  ?? meta.avatar_url;
  const bannerUrl    = profile?.banner_url;
  const username     = profile?.discord_username ?? meta.user_name;
  const displayName  = profile?.display_name ?? meta.full_name;
  const email        = profile?.email ?? user.email;

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

  // Invitaciones pendientes para el usuario
  const { data: invitations } = await supabase
    .from('team_invitations')
    .select('id, team_id, teams(name)')
    .eq('invitee_id', user.id)
    .eq('status', 'pending');

  return (
    <main className="min-h-screen bg-[#06070a]">

      {/* Banner */}
      <div className="relative w-full h-[200px] md:h-[260px] bg-[#0d0f15] overflow-hidden">
        {bannerUrl
          ? <img src={bannerUrl} alt="Banner de Discord" className="w-full h-full object-cover" />
          : <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,214,10,0.12)_0%,transparent_70%)]" />
        }
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#06070a]" />
      </div>

      <div className="max-w-[760px] mx-auto px-6 md:px-14 -mt-16 relative z-10 pb-24">

        {/* Avatar + nombre */}
        <div className="flex items-end gap-5 mb-8">
          {avatarUrl
            ? <img src={avatarUrl} alt={displayName ?? 'Avatar'}
                className="w-28 h-28 rounded-full border-4 border-[#06070a] shadow-[0_0_0_2px_rgba(255,214,10,0.3)] shrink-0" />
            : <div className="w-28 h-28 rounded-full border-4 border-[#06070a] bg-yellow flex items-center justify-center font-display text-[48px] text-[#0a0a0a] shrink-0">
                {(displayName ?? email ?? '?')[0].toUpperCase()}
              </div>
          }
          <div className="pb-2">
            <h1 className="font-display text-[clamp(28px,5vw,48px)] leading-none text-ink">
              {displayName ?? username ?? 'Jugador'}
            </h1>
            {username && <p className="mono-label text-yellow mt-1.5">@{username}</p>}
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">

          {/* Invitaciones pendientes — span full */}
          <InvitationsSection invitations={invitations ?? []} />

          {/* Equipo actual — span full */}
          {team
            ? <TeamSection team={team} isCaptain={isCaptain} applications={applications} />
            : (
              <div className="bg-[#0d0f15] border border-[rgba(241,237,229,0.08)] rounded-[16px] p-5 col-span-full flex items-center justify-between gap-4">
                <div>
                  <span className="mono-label text-yellow block mb-1">// MI EQUIPO</span>
                  <p className="text-ink-dim text-[13px]">Sin equipo — Free Agent</p>
                </div>
                <a href="/equipos"
                  className="px-4 py-2 rounded-full border border-yellow text-yellow font-bold text-[13px] no-underline hover:bg-yellow/10 transition-colors">
                  Ver equipos →
                </a>
              </div>
            )
          }

          {/* StatLocker */}
          <StatlockerForm initialUrl={profile?.statlocker_url ?? null} />

          {/* Identidad + Contacto lado a lado */}
          <div className="bg-[#0d0f15] border border-[rgba(241,237,229,0.08)] rounded-[16px] p-5">
            <span className="mono-label text-yellow block mb-3">// IDENTIDAD</span>
            <dl className="flex flex-col gap-3">
              <div>
                <dt className="mono-label text-[10px] mb-0.5">Display name</dt>
                <dd className="text-ink text-[15px] font-semibold">{displayName ?? '—'}</dd>
              </div>
              <div>
                <dt className="mono-label text-[10px] mb-0.5">Username</dt>
                <dd className="text-ink text-[15px]">{username ? `@${username}` : '—'}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-[#0d0f15] border border-[rgba(241,237,229,0.08)] rounded-[16px] p-5">
            <span className="mono-label text-yellow block mb-3">// CONTACTO</span>
            <dl className="flex flex-col gap-3">
              <div>
                <dt className="mono-label text-[10px] mb-0.5">Email</dt>
                <dd className="text-ink text-[15px] break-all">{email ?? '—'}</dd>
              </div>
              <div>
                <dt className="mono-label text-[10px] mb-0.5">Miembro desde</dt>
                <dd className="text-ink-dim text-[13px]">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Rol — franja full width */}
          <TeamRoleForm
            initialTeam={null}
            initialRole={profile?.player_role ?? null}
          />

        </div>

        <div className="mt-6 flex items-center justify-between">
          <a href="/" className="mono-label text-ink-dim hover:text-yellow transition-colors no-underline">
            ← Volver al inicio
          </a>
          <a href={`/jugador/${user.id}`} className="mono-label text-ink-dim hover:text-yellow transition-colors no-underline text-[10px]">
            Ver perfil público →
          </a>
        </div>
      </div>
    </main>
  );
}
