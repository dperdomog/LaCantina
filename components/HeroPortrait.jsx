import { heroInfo } from '@/lib/heroes';

// Retrato de héroe para el draft.
// variant 'card' = retrato vertical (picks), 'icon' = cuadrado (bans y grilla).
// heroId null → casilla vacía; lost → ban perdido por tiempo; crossed → X roja (baneado).
export default function HeroPortrait({ heroId, variant = 'card', crossed = false, lost = false, active = false, className = '' }) {
  const shape = variant === 'card' ? 'aspect-[3/4] rounded-xl' : 'aspect-square rounded-lg';
  const pulse = active ? 'animate-pulse ring-4 ring-ink/30' : '';

  if (lost) {
    return (
      <div className={`${shape} border-[3px] border-line bg-surface-2 flex items-center justify-center text-center ${className}`}>
        <span className="text-[10px] font-bold text-ink-dim leading-tight px-1">Perdido</span>
      </div>
    );
  }

  if (heroId == null) {
    return <div className={`${shape} border-[3px] border-dashed border-ink/25 bg-surface-2/60 ${pulse} ${className}`} />;
  }

  const hero = heroInfo(heroId);
  const src  = variant === 'card' ? hero.card ?? hero.image : hero.image ?? hero.card;

  return (
    <div className={`relative ${shape} border-[3px] border-line overflow-hidden bg-surface-2 ${pulse} ${className}`} title={hero.name}>
      {src
        ? <img src={src} alt={hero.name} loading="lazy" className={`w-full h-full object-cover ${crossed ? 'grayscale opacity-60' : ''}`} />
        : <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-ink-dim text-center px-1">{hero.name}</span>}
      {crossed && (
        <span className="absolute inset-0 flex items-center justify-center" aria-label="Baneado">
          <svg viewBox="0 0 24 24" className="w-3/4 h-3/4 text-red drop-shadow" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </span>
      )}
      {variant === 'card' && (
        <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[10px] sm:text-[11px] font-bold text-center truncate px-1 py-0.5">
          {hero.name}
        </span>
      )}
    </div>
  );
}
