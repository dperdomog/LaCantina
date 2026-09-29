'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import InviteButton from '@/components/InviteButton';

function PlayerAvatar({ src, name }) {
  return src
    ? <img src={src} alt="" className="w-11 h-11 rounded-full border-[3px] border-line object-cover shrink-0" />
    : <div className="w-11 h-11 rounded-full bg-green border-[3px] border-line flex items-center justify-center font-display text-[17px] text-on-color shrink-0">
        {(name ?? '?')[0]}
      </div>;
}

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
    <div className="sticker bg-yellow text-on-color p-6 md:p-8 mb-8">
      <span className="font-display text-[15px] uppercase tracking-wider">
        📬 Solicitudes pendientes ({applications.length})
      </span>
      <div className="flex flex-col gap-3 mt-5">
        {applications.map(app => (
          <div key={app.id} className="flex items-center justify-between gap-4 flex-wrap bg-white border-[3px] border-[#1c1c1c] rounded-2xl px-4 py-3">
            <a href={`/jugador/${app.applicant_id}`} className="flex items-center gap-3 no-underline text-[#1c1c1c] group min-w-0">
              <PlayerAvatar src={app.profiles?.avatar_url} name={app.profiles?.display_name} />
              <div className="min-w-0">
                <span className="text-[16px] font-bold group-hover:underline underline-offset-2">
                  {app.profiles?.display_name ?? app.profiles?.discord_username ?? 'Jugador'}
                </span>
                {app.profiles?.discord_username && (
                  <p className="text-[13px] text-[#1c1c1c]/60 truncate">@{app.profiles.discord_username}</p>
                )}
              </div>
            </a>
            <div className="flex gap-2">
              <button onClick={() => respond(app.id, true)} className="btn btn-sm bg-green text-on-color">
                Aceptar
              </button>
              <button onClick={() => respond(app.id, false)} className="btn btn-sm bg-white text-[#1c1c1c]">
                Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Jugadores sin equipo que el capitán puede invitar
export function InvitePlayersSection({ players, teamId }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return players.filter(p =>
      `${p.display_name ?? ''} ${p.discord_username ?? ''}`.toLowerCase().includes(q)
    );
  }, [players, search]);

  return (
    <div className="sticker p-6 md:p-8 mb-8">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <h2 className="font-display text-[28px] leading-none text-ink">Invitar jugadores</h2>
        <input
          type="text"
          placeholder="Buscar por nombre o @discord…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="field rounded-full py-2.5 w-full sm:w-[280px]"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="text-ink-dim text-[15px]">
          {players.length === 0
            ? 'No hay jugadores sin equipo por ahora. Cuando alguien inicie sesión con Discord, aparecerá aquí.'
            : 'Ningún jugador coincide con la búsqueda.'}
        </p>
      ) : (
        <div className="flex flex-col gap-3 max-h-[440px] overflow-y-auto pr-1">
          {filtered.map(p => (
            <div key={p.id} className="flex items-center justify-between gap-4 flex-wrap bg-surface-2 border-[3px] border-line rounded-2xl px-4 py-3">
              <a href={`/jugador/${p.id}`} className="flex items-center gap-3 no-underline text-ink group min-w-0">
                <PlayerAvatar src={p.avatar_url} name={p.display_name} />
                <div className="min-w-0">
                  <span className="text-[16px] font-bold group-hover:underline underline-offset-2">
                    {p.display_name ?? p.discord_username ?? 'Jugador'}
                  </span>
                  <p className="text-[13px] text-ink-dim truncate">
                    {[p.discord_username && `@${p.discord_username}`, p.player_role].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </a>
              {p.invited
                ? <span className="pill bg-green text-on-color">✓ Invitación enviada</span>
                : <InviteButton teamId={teamId} inviteeId={p.id} />}
            </div>
          ))}
        </div>
      )}
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
    <div className="sticker bg-cyan text-on-color p-6 mb-8 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <span className="font-display text-[15px] uppercase tracking-wider block mb-1">📨 Invitación pendiente</span>
        <p className="text-[17px] font-bold">Este equipo te invitó a unirte.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => respond(true)} className="btn btn-primary">
          Aceptar →
        </button>
        <button onClick={() => respond(false)} className="btn bg-white text-[#1c1c1c]">
          Rechazar
        </button>
      </div>
    </div>
  );
}
