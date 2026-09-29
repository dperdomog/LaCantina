'use client';

import { useMemo, useState } from 'react';
import { ACTIVE_HERO_IDS, PENDING_HERO_IDS, heroInfo } from '@/lib/heroes';
import { TEAM_COLOR } from './BoardSvg';
import { useImageOk } from './useImageOk';

const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const ALL = [...ACTIVE_HERO_IDS, ...PENDING_HERO_IDS];
const PENDING = new Set(PENDING_HERO_IDS);

function Thumb({ id }) {
  const h = heroInfo(id);
  const src = h.image ?? h.card;
  const ok = useImageOk(src);
  return ok
    ? <img src={src} alt={h.name} crossOrigin="anonymous" className="w-full h-full object-cover" />
    : <span className="w-full h-full bg-surface-2 flex items-center justify-center font-display text-[16px] text-ink">{h.name[0]?.toUpperCase()}</span>;
}

// Elegir héroe y equipo para colocar fichas en el mapa
export default function HeroPalette({ heroId, team, onHero, onTeam }) {
  const [search, setSearch] = useState('');
  const list = useMemo(() => {
    const q = norm(search.trim());
    return q ? ALL.filter(id => norm(heroInfo(id).name).includes(q)) : ALL;
  }, [search]);

  return (
    <div className="sticker p-4 flex flex-col gap-3 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="mono-label">Equipo</span>
        {['A', 'B'].map(t => (
          <button key={t} type="button" onClick={() => onTeam(t)} aria-pressed={team === t}
            className={`pill !text-[13px] !py-1.5 ${team === t ? 'text-on-color' : 'bg-surface text-ink'}`}
            style={team === t ? { background: TEAM_COLOR[t] } : undefined}>
            Equipo {t}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar héroe…" aria-label="Buscar héroe"
          className="field !py-2 !text-[14px] flex-1 min-w-[140px]" />
      </div>
      {list.length === 0 ? (
        <p className="text-[14px] text-ink-dim">Ningún héroe coincide con la búsqueda.</p>
      ) : (
        <div className="grid grid-cols-6 min-[480px]:grid-cols-8 sm:grid-cols-10 lg:grid-cols-6 gap-1.5 max-h-[240px] overflow-y-auto pr-1">
          {list.map(id => {
            const h = heroInfo(id);
            const on = heroId === id;
            return (
              <button key={id} type="button" onClick={() => onHero(id)} title={h.name} aria-pressed={on}
                className={`relative rounded-lg overflow-hidden border-2 aspect-square min-w-0 transition-transform hover:-translate-y-0.5 ${on ? 'border-line outline outline-4 outline-offset-1 outline-yellow' : 'border-line/30'}`}>
                <Thumb id={id} />
                {PENDING.has(id) && <span className="absolute bottom-0 inset-x-0 bg-green text-on-color text-[8px] font-bold text-center leading-tight">Nuevo</span>}
              </button>
            );
          })}
        </div>
      )}
      <p className="text-[12px] text-ink-dim">
        {heroId ? <>Toca el mapa para colocar a <b className="text-ink">{heroInfo(heroId).name}</b>.</> : 'Elige un héroe y toca el mapa.'}
      </p>
    </div>
  );
}
