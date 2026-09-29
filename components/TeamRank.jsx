import { rankInfo } from '@/lib/ranks';

// Promedio de rangos. Los subrangos van de 1 a 6, así que se promedia en una
// escala lineal (tier-1)*6 + (sub-1) y se vuelve a convertir a badge.
// Ignora jugadores sin rango (badge 0/null). Devuelve null si nadie tiene rango.
export function averageBadge(badges) {
  const ranked = badges.filter(b => b && Math.floor(b / 10) > 0);
  if (ranked.length === 0) return null;
  const linear = ranked.map(b => (Math.floor(b / 10) - 1) * 6 + (Math.max(1, Math.min(6, b % 10)) - 1));
  const avg    = Math.round(linear.reduce((a, b) => a + b, 0) / linear.length);
  return (Math.floor(avg / 6) + 1) * 10 + (avg % 6) + 1;
}

// Chip con la insignia y el nombre del rango
export function RankChip({ badge, className = '' }) {
  const info = rankInfo(badge);
  if (!info) return null;
  return (
    <span className={`pill bg-surface text-ink ${info.badge ? '' : 'opacity-60'} ${className}`}>
      <img src={info.image} alt="" className="w-5 h-5 -my-1 object-contain" />
      {info.name}
    </span>
  );
}
