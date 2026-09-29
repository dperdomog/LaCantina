import { rankInfo } from '@/lib/ranks';

// Insignia de rango de Deadlock (imagen + nombre). No muestra nada sin dato.
export default function RankBadge({ badge, size = 'sm' }) {
  const r = rankInfo(badge);
  if (!r) return null;

  if (size === 'lg') {
    return (
      <span className="inline-flex items-center gap-3">
        <img src={r.image} alt="" className="w-14 h-14 object-contain shrink-0" />
        <span>
          <span className="font-display text-[24px] leading-none block text-ink">{r.name}</span>
          <span className="text-[13px] text-ink-dim">Rango en Deadlock</span>
        </span>
      </span>
    );
  }

  return (
    <span className="pill bg-surface text-ink !pl-1" title={`Rango: ${r.name}`}>
      <img src={r.image} alt="" className="w-5 h-5 object-contain" />
      {r.name}
    </span>
  );
}
