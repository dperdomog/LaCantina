'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TeamSection({ team, isCaptain, applications }) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLeave() {
    if (!confirm(isCaptain ? '¿Disolver el equipo? Esta acción no se puede deshacer.' : '¿Salir del equipo?')) return;
    setLoading(true);
    await fetch('/api/teams/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: team.id }),
    });
    router.refresh();
  }

  async function respondApp(appId, accept) {
    await fetch('/api/teams/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'application', id: appId, accept }),
    });
    router.refresh();
  }

  return (
    <div className="sticker p-6 col-span-full">
      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="mono-label">🛡️ Mi equipo</span>
        <button onClick={handleLeave} disabled={loading}
          className="btn btn-sm bg-red text-white">
          {isCaptain ? 'Disolver equipo' : 'Salir del equipo'}
        </button>
      </div>

      <a href={`/equipos/${team.slug ?? team.id}`} className="flex items-center gap-3 mb-1 no-underline group flex-wrap">
        {team.logo_url
          ? <img src={team.logo_url} alt={team.name} className="w-14 h-14 rounded-2xl object-cover border-[3px] border-line shrink-0" />
          : <div className="w-14 h-14 rounded-2xl bg-yellow border-[3px] border-line flex items-center justify-center font-display text-[24px] text-on-color shrink-0">
              {team.name[0].toUpperCase()}
            </div>
        }
        <h3 className="font-display text-[28px] text-ink leading-none group-hover:underline">{team.name}</h3>
        {isCaptain && <span className="pill bg-yellow text-on-color">Capitán</span>}
      </a>
      {team.region && <p className="text-[14px] text-ink-dim mt-2">{team.region}</p>}

      {/* Solicitudes pendientes (solo capitán) */}
      {isCaptain && applications?.length > 0 && (
        <div className="mt-5 pt-5 border-t-[3px] border-line">
          <span className="mono-label block mb-3">
            SOLICITUDES PENDIENTES ({applications.length})
          </span>
          <div className="flex flex-col gap-3">
            {applications.map(app => (
              <div key={app.id} className="flex items-center justify-between gap-4 flex-wrap bg-surface-2 border-[3px] border-line rounded-2xl px-4 py-3">
                <a href={`/jugador/${app.applicant_id}`}
                  className="flex items-center gap-2 no-underline group">
                  {app.profiles?.avatar_url
                    ? <img src={app.profiles.avatar_url} alt="" className="w-9 h-9 rounded-full border-[3px] border-line" />
                    : <div className="w-9 h-9 rounded-full bg-yellow border-[3px] border-line flex items-center justify-center font-display text-[14px] text-on-color">
                        {(app.profiles?.display_name ?? '?')[0]}
                      </div>
                  }
                  <span className="text-ink font-bold text-[15px] group-hover:underline">
                    {app.profiles?.display_name ?? app.profiles?.discord_username ?? 'Jugador'}
                  </span>
                </a>
                <div className="flex gap-2">
                  <button onClick={() => respondApp(app.id, true)}
                    className="btn btn-sm bg-green text-on-color">
                    Aceptar
                  </button>
                  <button onClick={() => respondApp(app.id, false)}
                    className="btn btn-secondary btn-sm">
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
