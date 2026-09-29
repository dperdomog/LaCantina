'use client';

import { useRouter } from 'next/navigation';

const ROLE_COLORS = {
  Carry:     'bg-yellow',
  Flex:      'bg-green',
  Frontline: 'bg-[#f97316]',
  Support:   'bg-cyan',
  Pick:      'bg-[#a78bfa]',
  Roamer:    'bg-pink',
};

export default function TeamRoster({ members, captainId, teamId, isCaptain }) {
  const router = useRouter();

  async function handleKick(userId, name) {
    if (!confirm(`¿Eliminar a ${name} del equipo?`)) return;
    await fetch('/api/teams/kick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: teamId, user_id: userId }),
    });
    router.refresh();
  }

  if (!members?.length) return <p className="text-ink-dim text-[15px]">Todavía no hay miembros.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {members.map(m => {
        const name = m.profiles?.display_name ?? m.profiles?.discord_username ?? 'Jugador';
        const isCap = m.user_id === captainId;
        return (
          <div key={m.user_id}
            className="flex items-center gap-3 p-4 rounded-2xl bg-surface-2 border-[3px] border-line group">

            <a href={`/jugador/${m.user_id}`} className="flex items-center gap-3 no-underline flex-1 min-w-0 text-ink">
              {m.profiles?.avatar_url
                ? <img src={m.profiles.avatar_url} alt=""
                    className="w-12 h-12 rounded-full border-[3px] border-line object-cover shrink-0" />
                : <div className="w-12 h-12 rounded-full bg-green border-[3px] border-line flex items-center justify-center font-display text-[20px] text-on-color shrink-0">
                    {name[0]}
                  </div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-ink text-[16px] font-bold truncate group-hover:underline underline-offset-2">{name}</span>
                  {isCap && <span className="pill bg-yellow text-on-color py-0.5 px-2 text-[11px]">⚡ Capitán</span>}
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {m.profiles?.player_role && (
                    <span className={`pill text-on-color text-[11px] ${ROLE_COLORS[m.profiles.player_role] ?? 'bg-surface'}`}>
                      {m.profiles.player_role}
                    </span>
                  )}
                  {m.profiles?.statlocker_url && (
                    <span className="text-[12px] font-bold text-ink-dim">StatLocker ↗</span>
                  )}
                </div>
              </div>
            </a>

            {/* Botón kick — solo capitán, no en sí mismo */}
            {isCaptain && !isCap && (
              <button
                onClick={() => handleKick(m.user_id, name)}
                className="shrink-0 w-9 h-9 rounded-full border-[3px] border-line bg-red text-white font-bold text-[14px] flex items-center justify-center hover:-translate-y-0.5 transition-transform"
                title="Eliminar del equipo"
                aria-label={`Eliminar a ${name} del equipo`}
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
