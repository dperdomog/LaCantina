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
    <div className="bg-[#0d0f15] border border-[rgba(255,214,10,0.25)] rounded-[16px] p-5 col-span-full">
      <div className="flex items-center justify-between mb-4">
        <span className="mono-label text-yellow">// MI EQUIPO</span>
        <button onClick={handleLeave} disabled={loading}
          className="mono-label text-[10px] text-pink hover:opacity-80 transition-opacity disabled:opacity-40">
          {isCaptain ? 'Disolver equipo' : 'Salir del equipo'}
        </button>
      </div>

      <a href={`/equipos/${team.id}`} className="flex items-center gap-3 mb-1 no-underline group">
        {team.logo_url
          ? <img src={team.logo_url} alt={team.name} className="w-10 h-10 rounded-[8px] object-cover border border-[rgba(255,214,10,0.2)] shrink-0" />
          : <div className="w-10 h-10 rounded-[8px] bg-yellow/10 border border-yellow/20 flex items-center justify-center font-display text-[18px] text-yellow shrink-0">
              {team.name[0].toUpperCase()}
            </div>
        }
        <h3 className="font-display text-[24px] text-ink leading-none group-hover:text-yellow transition-colors">{team.name}</h3>
        {isCaptain && <span className="pill border border-yellow/40 bg-yellow/10 text-yellow text-[10px]">Capitán</span>}
      </a>
      {team.region && <p className="mono-label text-[10px] mt-1">{team.region}</p>}

      {/* Solicitudes pendientes (solo capitán) */}
      {isCaptain && applications?.length > 0 && (
        <div className="mt-5 pt-5 border-t border-[rgba(241,237,229,0.08)]">
          <span className="mono-label text-yellow text-[10px] block mb-3">
            SOLICITUDES PENDIENTES ({applications.length})
          </span>
          <div className="flex flex-col gap-3">
            {applications.map(app => (
              <div key={app.id} className="flex items-center justify-between gap-4">
                <a href={`/jugador/${app.applicant_id}`}
                  className="flex items-center gap-2 no-underline group">
                  {app.profiles?.avatar_url
                    ? <img src={app.profiles.avatar_url} alt="" className="w-7 h-7 rounded-full" />
                    : <div className="w-7 h-7 rounded-full bg-yellow/20 flex items-center justify-center mono-label text-[10px]">
                        {(app.profiles?.display_name ?? '?')[0]}
                      </div>
                  }
                  <span className="text-ink-dim text-[13px] group-hover:text-ink transition-colors">
                    {app.profiles?.display_name ?? app.profiles?.discord_username ?? 'Jugador'}
                  </span>
                </a>
                <div className="flex gap-2">
                  <button onClick={() => respondApp(app.id, true)}
                    className="px-3 py-1.5 rounded-full bg-green/10 border border-green/30 text-green mono-label text-[10px] hover:bg-green/20 transition-colors">
                    Aceptar
                  </button>
                  <button onClick={() => respondApp(app.id, false)}
                    className="px-3 py-1.5 rounded-full bg-transparent border border-[rgba(241,237,229,0.08)] text-ink-dim mono-label text-[10px] hover:border-ink-dim transition-colors">
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
