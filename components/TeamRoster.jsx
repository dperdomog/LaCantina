'use client';

import { useRouter } from 'next/navigation';

const ROLE_COLORS = {
  Carry:     'text-yellow  border-yellow/40    bg-yellow/10',
  Flex:      'text-green   border-green/40     bg-green/10',
  Frontline: 'text-[#f97316] border-[#f97316]/40 bg-[#f97316]/10',
  Support:   'text-cyan    border-cyan/40      bg-cyan/10',
  Pick:      'text-[#a78bfa] border-[#a78bfa]/40 bg-[#a78bfa]/10',
  Roamer:    'text-pink    border-pink/40      bg-pink/10',
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

  if (!members?.length) return <p className="text-ink-dim text-[13px]">Sin miembros aún.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {members.map(m => {
        const name = m.profiles?.display_name ?? m.profiles?.discord_username ?? 'Jugador';
        const isCap = m.user_id === captainId;
        return (
          <div key={m.user_id}
            className="flex items-center gap-4 p-4 rounded-[14px] bg-[#06070a] border border-[rgba(241,237,229,0.06)] hover:border-[rgba(255,214,10,0.1)] transition-all group">

            <a href={`/jugador/${m.user_id}`} className="flex items-center gap-4 no-underline flex-1 min-w-0">
              {m.profiles?.avatar_url
                ? <img src={m.profiles.avatar_url} alt=""
                    className="w-12 h-12 rounded-full border-2 border-[rgba(241,237,229,0.1)] shrink-0" />
                : <div className="w-12 h-12 rounded-full bg-yellow/10 border-2 border-yellow/20 flex items-center justify-center font-display text-[20px] text-yellow shrink-0">
                    {name[0]}
                  </div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-ink text-[14px] font-semibold truncate">{name}</span>
                  {isCap && <span className="mono-label text-yellow text-[9px]">CAP</span>}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {m.profiles?.player_role && (
                    <span className={`pill border text-[10px] font-semibold ${ROLE_COLORS[m.profiles.player_role] ?? 'text-ink-dim'}`}>
                      {m.profiles.player_role}
                    </span>
                  )}
                  {m.profiles?.statlocker_url && (
                    <span className="mono-label text-[9px] text-ink-faint">StatLocker ↗</span>
                  )}
                </div>
              </div>
            </a>

            {/* Botón kick — solo capitán, no en sí mismo */}
            {isCaptain && !isCap && (
              <button
                onClick={() => handleKick(m.user_id, name)}
                className="shrink-0 mono-label text-[10px] text-pink/60 hover:text-pink border border-transparent hover:border-pink/30 px-2 py-1 rounded-[6px] transition-colors"
                title="Eliminar del equipo"
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
