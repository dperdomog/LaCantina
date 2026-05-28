'use client';

import { useRouter } from 'next/navigation';

// Sección de solicitudes pendientes (vista del capitán)
export function TeamApplicationsSection({ applications, teamId }) {
  const router = useRouter();

  async function respond(appId, accept) {
    await fetch('/api/teams/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'application', id: appId, accept }),
    });
    router.refresh();
  }

  if (!applications?.length) return null;

  return (
    <div className="bg-[#0d0f15] border border-[rgba(255,214,10,0.25)] rounded-[20px] p-8 mt-6">
      <span className="mono-label text-yellow block mb-5">
        // SOLICITUDES PENDIENTES ({applications.length})
      </span>
      <div className="flex flex-col gap-4">
        {applications.map(app => (
          <div key={app.id} className="flex items-center justify-between gap-4 flex-wrap">
            <a href={`/jugador/${app.applicant_id}`} className="flex items-center gap-3 no-underline group">
              {app.profiles?.avatar_url
                ? <img src={app.profiles.avatar_url} alt="" className="w-9 h-9 rounded-full" />
                : <div className="w-9 h-9 rounded-full bg-yellow/20 flex items-center justify-center mono-label text-[11px] text-yellow">
                    {(app.profiles?.display_name ?? '?')[0]}
                  </div>
              }
              <div>
                <span className="text-ink text-[14px] font-semibold group-hover:text-yellow transition-colors">
                  {app.profiles?.display_name ?? app.profiles?.discord_username ?? 'Jugador'}
                </span>
                {app.profiles?.discord_username && (
                  <p className="mono-label text-[10px] text-ink-dim">@{app.profiles.discord_username}</p>
                )}
              </div>
            </a>
            <div className="flex gap-2">
              <button onClick={() => respond(app.id, true)}
                className="px-4 py-2 rounded-full bg-yellow/10 border border-yellow/40 text-yellow mono-label text-[10px] hover:bg-yellow/20 transition-colors">
                Aceptar
              </button>
              <button onClick={() => respond(app.id, false)}
                className="px-4 py-2 rounded-full border border-[rgba(241,237,229,0.08)] text-ink-dim mono-label text-[10px] hover:border-ink-dim transition-colors">
                Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Banner para el invitado: acepta/rechaza la invitación de este equipo
export function PendingInvitationBanner({ invitation }) {
  const router = useRouter();

  async function respond(accept) {
    await fetch('/api/teams/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'invitation', id: invitation.id, accept }),
    });
    router.refresh();
  }

  if (!invitation) return null;

  return (
    <div className="bg-[#0d0f15] border border-[rgba(127,227,255,0.35)] rounded-[20px] p-6 mt-6 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <span className="mono-label text-cyan block mb-1">// INVITACIÓN PENDIENTE</span>
        <p className="text-ink text-[14px]">Este equipo te invitó a unirte</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => respond(true)}
          className="px-5 py-2.5 rounded-full bg-yellow text-[#0a0a0a] font-bold text-[13px] hover:opacity-90 transition-opacity">
          Aceptar →
        </button>
        <button onClick={() => respond(false)}
          className="px-5 py-2.5 rounded-full border border-[rgba(241,237,229,0.08)] text-ink-dim text-[13px] hover:border-ink-dim transition-colors">
          Rechazar
        </button>
      </div>
    </div>
  );
}
