'use client';

// Dibujo del mapa de coaching en SVG (capas del minimapa, tirolesas y elementos).
// Coordenadas del tablero: 0..1000 en x e y, con y hacia abajo.
import { forwardRef } from 'react';
import { MAP_LAYERS, ZIPLINES } from '@/lib/mapData';
import { COLORS } from '@/lib/board';
import { heroInfo } from '@/lib/heroes';
import { useImageOk } from './useImageOk';

export const TEAM_COLOR = { A: '#ffd400', B: '#00c8f0' };
export const STROKE = { thin: 4, thick: 9 };
export const HERO_R = 30;
export const TEXT_SIZE = 28;
const OUTLINE = '#1c1c1c';

const markerId = color => `arrow-${color.replace('#', '')}`;

// Ficha de héroe: inicial de respaldo y la imagen solo cuando cargó
function HeroToken({ el, common }) {
  const [[cx, cy]] = el.points;
  const hero = heroInfo(el.hero_id);
  const ring = TEAM_COLOR[el.team] ?? TEAM_COLOR.A;
  const src = hero.image ?? hero.card;
  const ok = useImageOk(src);
  return (
    <g {...common}>
      <circle cx={cx} cy={cy} r={HERO_R + 4} fill={OUTLINE} data-id={el.id} />
      <circle cx={cx} cy={cy} r={HERO_R} fill="#3a3a3a" data-id={el.id} />
      {!ok && (
        <text x={cx} y={cy + 1} fontSize={26} fontWeight={800} textAnchor="middle" dominantBaseline="middle" fill="#f6efe2"
          style={{ pointerEvents: 'none', fontFamily: 'var(--font-display), sans-serif' }}>{hero.name[0]?.toUpperCase()}</text>
      )}
      {ok && (
        <image href={src} crossOrigin="anonymous" x={cx - HERO_R} y={cy - HERO_R} width={HERO_R * 2} height={HERO_R * 2}
          preserveAspectRatio="xMidYMid slice" clipPath="url(#hero-clip)" data-id={el.id} />
      )}
      <circle cx={cx} cy={cy} r={HERO_R} fill="none" stroke={ring} strokeWidth={5} data-id={el.id} />
      <circle cx={cx + 23} cy={cy + 23} r={11} fill={ring} stroke={OUTLINE} strokeWidth={3} data-id={el.id} />
      <text x={cx + 23} y={cy + 24} fontSize={14} fontWeight={800} textAnchor="middle" dominantBaseline="middle"
        fill={OUTLINE} style={{ pointerEvents: 'none', fontFamily: 'var(--font-display), sans-serif' }}>{el.team}</text>
      <title>{hero.name}</title>
    </g>
  );
}

function Element({ el, hit }) {
  const common = { 'data-id': el.id, style: hit ? { cursor: 'pointer' } : undefined };
  switch (el.kind) {
    case 'line':
    case 'arrow': {
      const [[x1, y1], [x2, y2]] = el.points;
      const w = STROKE[el.width] ?? STROKE.thin;
      return (
        <g {...common}>
          {hit && <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={Math.max(24, w + 16)} data-id={el.id} />}
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={el.color} strokeWidth={w} strokeLinecap="round"
            markerEnd={el.kind === 'arrow' ? `url(#${markerId(el.color)})` : undefined} data-id={el.id} />
        </g>
      );
    }
    case 'pen': {
      const pts = el.points.map(p => p.join(',')).join(' ');
      const w = STROKE[el.width] ?? STROKE.thin;
      return (
        <g {...common}>
          {hit && <polyline points={pts} fill="none" stroke="transparent" strokeWidth={Math.max(24, w + 16)} strokeLinecap="round" strokeLinejoin="round" data-id={el.id} />}
          <polyline points={pts} fill="none" stroke={el.color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" data-id={el.id} />
        </g>
      );
    }
    case 'hero':
      return <HeroToken el={el} common={common} />;
    case 'text': {
      const [[x, y]] = el.points;
      return (
        <text {...common} x={x} y={y} fontSize={TEXT_SIZE} fontWeight={800} textAnchor="middle" dominantBaseline="middle"
          fill={el.color} stroke={OUTLINE} strokeWidth={7} paintOrder="stroke" strokeLinejoin="round"
          style={{ ...(common.style ?? {}), fontFamily: 'var(--font-display), sans-serif', userSelect: 'none' }}>
          {el.text}
        </text>
      );
    }
    default:
      return null;
  }
}

// `hitKinds`: tipos de elemento que reciben clics (mover/borrar); el resto deja pasar el puntero
const BoardSvg = forwardRef(function BoardSvg({ elements, layers, preview, hitKinds, className = '', ...svgProps }, ref) {
  return (
    <svg ref={ref} viewBox="0 0 1000 1000" className={`block w-full h-auto select-none ${className}`}
      style={{ touchAction: 'none' }} role="img" aria-label="Mapa de Deadlock" {...svgProps}>
      <defs>
        <clipPath id="hero-clip" clipPathUnits="objectBoundingBox"><circle cx="0.5" cy="0.5" r="0.5" /></clipPath>
        {COLORS.map(c => (
          <marker key={c} id={markerId(c)} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={c} />
          </marker>
        ))}
      </defs>

      <g style={{ pointerEvents: 'none' }}>
        <image href={MAP_LAYERS.background} x="0" y="0" width="1000" height="1000" />
        <image href={MAP_LAYERS.map} x="0" y="0" width="1000" height="1000" />
        {layers?.mid_tunnels && <image href={MAP_LAYERS.mid_tunnels} x="0" y="0" width="1000" height="1000" />}
        {layers?.rat_tunnels && <image href={MAP_LAYERS.rat_tunnels} x="0" y="0" width="1000" height="1000" />}
        {layers?.ziplines && ZIPLINES.map((z, i) => (
          <path key={i} d={z.d} fill="none" stroke={z.color} strokeWidth={5} opacity={0.9} strokeLinecap="round" />
        ))}
      </g>

      {elements.map(el => (
        <g key={el.id} style={{ pointerEvents: hitKinds?.includes(el.kind) ? 'auto' : 'none' }}>
          <Element el={el} hit={!!hitKinds?.includes(el.kind)} />
        </g>
      ))}

      {preview && <g style={{ pointerEvents: 'none', opacity: 0.85 }}><Element el={preview} hit={false} /></g>}
    </svg>
  );
});

export default BoardSvg;
