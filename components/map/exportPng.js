// Exporta el mapa de coaching a PNG (2000×2000) dibujando en un canvas.
// Las capas del mapa son del mismo dominio; las imágenes de héroes vienen de
// deadlock-api.com, que solo manda Access-Control-Allow-Origin si el pedido trae Origin.
// Por eso se piden con una URL propia (?export=1): si la imagen ya estaba en caché sin
// CORS (p. ej. desde el draft), el canvas quedaría bloqueado.
import { MAP_LAYERS, ZIPLINES } from '@/lib/mapData';
import { heroInfo } from '@/lib/heroes';
import { TEAM_COLOR, STROKE, HERO_R, TEXT_SIZE } from './BoardSvg';

const SIZE = 2000;
const S = SIZE / 1000;
const OUTLINE = '#1c1c1c';

function loadImage(src) {
  return new Promise(resolve => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);            // si falla una imagen, se dibuja sin ella
    img.src = src;
  });
}

function drawArrowHead(ctx, [x1, y1], [x2, y2], width) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const len = Math.max(18, width * 3.2) * S;
  ctx.beginPath();
  ctx.moveTo(x2 * S + Math.cos(angle) * len * 0.3, y2 * S + Math.sin(angle) * len * 0.3);
  ctx.lineTo(x2 * S - Math.cos(angle - Math.PI / 6) * len, y2 * S - Math.sin(angle - Math.PI / 6) * len);
  ctx.lineTo(x2 * S - Math.cos(angle + Math.PI / 6) * len, y2 * S - Math.sin(angle + Math.PI / 6) * len);
  ctx.closePath();
  ctx.fill();
}

export async function exportBoardPng({ elements, layers, title }) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  // Capas del mapa
  const layerSrcs = [MAP_LAYERS.background, MAP_LAYERS.map,
    layers?.mid_tunnels && MAP_LAYERS.mid_tunnels, layers?.rat_tunnels && MAP_LAYERS.rat_tunnels].filter(Boolean);
  const heroIds = [...new Set(elements.filter(e => e.kind === 'hero').map(e => e.hero_id))];
  const [layerImgs, heroImgs] = await Promise.all([
    Promise.all(layerSrcs.map(loadImage)),
    Promise.all(heroIds.map(id => {
      const src = heroInfo(id).image ?? heroInfo(id).card;
      return loadImage(src && `${src}${src.includes('?') ? '&' : '?'}export=1`);
    })),
  ]);
  const heroImg = Object.fromEntries(heroIds.map((id, i) => [id, heroImgs[i]]));
  for (const img of layerImgs) if (img) ctx.drawImage(img, 0, 0, SIZE, SIZE);

  // Tirolesas
  if (layers?.ziplines) {
    ctx.save();
    ctx.scale(S, S);
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (const z of ZIPLINES) { ctx.strokeStyle = z.color; ctx.stroke(new Path2D(z.d)); }
    ctx.restore();
  }

  // Elementos
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const el of elements) {
    const w = STROKE[el.width] ?? STROKE.thin;
    if (el.kind === 'line' || el.kind === 'arrow' || el.kind === 'pen') {
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.color;
      ctx.lineWidth = w * S;
      ctx.beginPath();
      el.points.forEach(([x, y], i) => (i ? ctx.lineTo(x * S, y * S) : ctx.moveTo(x * S, y * S)));
      ctx.stroke();
      if (el.kind === 'arrow') drawArrowHead(ctx, el.points[0], el.points[1], w);
    } else if (el.kind === 'hero') {
      const [[cx, cy]] = el.points;
      const ring = TEAM_COLOR[el.team] ?? TEAM_COLOR.A;
      const r = HERO_R * S;
      ctx.fillStyle = OUTLINE;
      ctx.beginPath(); ctx.arc(cx * S, cy * S, r + 4 * S, 0, Math.PI * 2); ctx.fill();
      const img = heroImg[el.hero_id];
      ctx.save();
      ctx.beginPath(); ctx.arc(cx * S, cy * S, r, 0, Math.PI * 2); ctx.clip();
      if (img) {
        // recorte centrado tipo "cover"
        const k = Math.max((2 * r) / img.width, (2 * r) / img.height);
        const dw = img.width * k, dh = img.height * k;
        ctx.drawImage(img, cx * S - dw / 2, cy * S - dh / 2, dw, dh);
      } else {
        ctx.fillStyle = '#3a3a3a'; ctx.fillRect(cx * S - r, cy * S - r, 2 * r, 2 * r);
        ctx.fillStyle = '#f6efe2'; ctx.font = `800 ${26 * S}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(heroInfo(el.hero_id).name[0]?.toUpperCase() ?? '?', cx * S, cy * S);
      }
      ctx.restore();
      ctx.strokeStyle = ring; ctx.lineWidth = 5 * S;
      ctx.beginPath(); ctx.arc(cx * S, cy * S, r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = ring; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3 * S;
      ctx.beginPath(); ctx.arc((cx + 23) * S, (cy + 23) * S, 11 * S, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = OUTLINE; ctx.font = `800 ${14 * S}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(el.team, (cx + 23) * S, (cy + 24) * S);
    } else if (el.kind === 'text') {
      const [[x, y]] = el.points;
      ctx.font = `800 ${TEXT_SIZE * S}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 7 * S;
      ctx.strokeText(el.text, x * S, y * S);
      ctx.fillStyle = el.color;
      ctx.fillText(el.text, x * S, y * S);
    }
  }

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('No se pudo generar la imagen');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(title || 'mapa').replace(/[\\/:*?"<>|]+/g, '').trim() || 'mapa'}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
