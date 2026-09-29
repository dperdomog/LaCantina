import { buildSequence } from '@/lib/draft';

// Colores por lado: A = amarillo, B = celeste
export const SIDE_STYLE = {
  A: { bg: 'bg-yellow', soft: 'bg-yellow/20', ring: 'ring-yellow', text: 'text-yellow-ink' },
  B: { bg: 'bg-cyan',   soft: 'bg-cyan/20',   ring: 'ring-cyan',   text: 'text-cyan-ink' },
};

// Orden de turnos del draft. `step` marca el turno actual (-1 = solo vista previa).
export default function DraftOrderStrip({ format, bans, step = -1, names }) {
  let seq;
  try { seq = buildSequence(format, bans); } catch { return null; }

  return (
    <ol className="flex flex-wrap gap-1.5" aria-label="Orden de turnos">
      {seq.map((s, i) => {
        const past    = step >= 0 && i < step;
        const current = i === step;
        const isBan   = s.type === 'ban';
        const label   = `${isBan ? 'Ban' : 'Pick'} ${s.side}`;
        return (
          <li
            key={i}
            title={`${i + 1}. ${isBan ? 'Ban' : 'Pick'} de ${names?.[s.side] ?? `lado ${s.side}`}`}
            className={`pill !text-[11px] !px-2 !py-1 ${
              isBan ? 'bg-surface text-ink' : `${SIDE_STYLE[s.side].bg} text-on-color`
            } ${past ? 'opacity-35' : ''} ${current ? 'ring-4 ring-ink/30 animate-pulse' : ''}`}
          >
            {isBan && <span className={`w-2 h-2 rounded-full ${SIDE_STYLE[s.side].bg}`} aria-hidden />}
            {label}
          </li>
        );
      })}
    </ol>
  );
}
