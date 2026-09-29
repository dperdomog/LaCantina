// Mapa de coaching: formato y validación de lo que se dibuja (sin I/O).
// Coordenadas del tablero: 0..1000 en x e y (y hacia abajo), como lib/mapData.js.
import { HEROES } from '@/lib/heroes';

export const COLORS = ['#ffd400', '#00c8f0', '#ff2d2d', '#00d97e', '#ff7043', '#ffffff'];
export const KINDS  = ['line', 'arrow', 'pen', 'hero', 'text'];
export const LIMITS = { elements: 400, penPoints: 300, text: 80, title: 80, bytes: 150_000 };
export const DEFAULT_LAYERS = { ziplines: true, mid_tunnels: false, rat_tunnels: false };

const clampPt = v => Math.max(0, Math.min(1000, Math.round(Number(v))));
const isPt = p => Array.isArray(p) && p.length === 2 && p.every(v => Number.isFinite(Number(v)));

// Limpia un elemento; devuelve null si no es válido
export function sanitizeElement(el) {
  if (!el || typeof el !== 'object' || !KINDS.includes(el.kind)) return null;
  const id = typeof el.id === 'string' && /^[A-Za-z0-9_-]{1,24}$/.test(el.id) ? el.id : null;
  if (!id) return null;
  const color = COLORS.includes(el.color) ? el.color : COLORS[0];
  const pts = Array.isArray(el.points) ? el.points.filter(isPt).map(p => [clampPt(p[0]), clampPt(p[1])]) : [];

  switch (el.kind) {
    case 'line':
    case 'arrow':
      if (pts.length !== 2) return null;
      return { id, kind: el.kind, color, width: el.width === 'thick' ? 'thick' : 'thin', points: pts };
    case 'pen':
      if (pts.length < 2) return null;
      return { id, kind: 'pen', color, width: el.width === 'thick' ? 'thick' : 'thin', points: pts.slice(0, LIMITS.penPoints) };
    case 'hero': {
      const heroId = Number(el.hero_id);
      if (!HEROES[heroId] || pts.length !== 1) return null;
      return { id, kind: 'hero', hero_id: heroId, team: el.team === 'B' ? 'B' : 'A', points: pts };
    }
    case 'text': {
      const text = typeof el.text === 'string' ? el.text.trim().slice(0, LIMITS.text) : '';
      if (!text || pts.length !== 1) return null;
      return { id, kind: 'text', color, text, points: pts };
    }
    default:
      return null;
  }
}

// Limpia todo el tablero. Lanza Error con mensaje para el usuario si se pasa de los límites.
export function sanitizeBoard(data) {
  const raw = Array.isArray(data?.elements) ? data.elements : [];
  if (raw.length > LIMITS.elements) throw new Error(`El mapa puede tener hasta ${LIMITS.elements} elementos.`);
  const seen = new Set();
  const elements = [];
  for (const el of raw) {
    const clean = sanitizeElement(el);
    if (clean && !seen.has(clean.id)) { seen.add(clean.id); elements.push(clean); }
  }
  const layers = { ...DEFAULT_LAYERS };
  for (const k of Object.keys(DEFAULT_LAYERS)) if (typeof data?.layers?.[k] === 'boolean') layers[k] = data.layers[k];
  const out = { elements, layers };
  if (JSON.stringify(out).length > LIMITS.bytes) throw new Error('El mapa es demasiado grande. Borra algunos trazos.');
  return out;
}

// Fichas iniciales a partir de un draft terminado: A abajo, B arriba, en fila cerca de su base
export function tokensFromDraft(draft) {
  const picks = { A: [], B: [] };
  for (const a of draft.actions ?? []) if (a.type === 'pick' && a.hero_id != null) picks[a.side].push(a.hero_id);
  const row = (ids, team, y) => ids.map((heroId, i) => ({
    id: `${team.toLowerCase()}${i}`,
    kind: 'hero', hero_id: heroId, team,
    points: [[Math.round(500 + (i - (ids.length - 1) / 2) * 70), y]],
  }));
  return [...row(picks.A, 'A', 900), ...row(picks.B, 'B', 100)];
}

// Simplifica un trazo libre (Ramer–Douglas–Peucker) para que no pese de más
export function simplify(points, tolerance = 2) {
  if (points.length < 3) return points;
  const [a, b] = [points[0], points[points.length - 1]];
  const dist = p => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
  };
  let max = 0, idx = 0;
  for (let i = 1; i < points.length - 1; i++) { const d = dist(points[i]); if (d > max) { max = d; idx = i; } }
  if (max <= tolerance) return [a, b];
  return [...simplify(points.slice(0, idx + 1), tolerance).slice(0, -1), ...simplify(points.slice(idx), tolerance)];
}
