// Descarga el minimapa de Deadlock y sus capas (deadlock-api.com) para el mapa de coaching.
// Guarda las imágenes en public/map/ y las tirolesas en lib/mapData.js.
// Uso: npm run update:map   (volver a correr después de cada parche que cambie el mapa)
import { mkdirSync, writeFileSync } from 'node:fs';

const API = 'https://api.deadlock-api.com/v1/assets/map';
const res = await fetch(API, { headers: { 'User-Agent': 'LaCantina/1.0' } });
if (!res.ok) throw new Error(`deadlock-api respondió ${res.status}`);
const map = await res.json();

// Imágenes (se sirven desde el mismo dominio: sirve para exportar a PNG sin CORS)
const dir = new URL('../public/map/', import.meta.url);
mkdirSync(dir, { recursive: true });
const layers = { background: map.images.background, map: map.images.mid, mid_tunnels: map.images.mid_tunnels, rat_tunnels: map.images.rat_tunnels };
for (const [name, url] of Object.entries(layers)) {
  if (!url) continue;
  const img = await fetch(url);
  if (!img.ok) throw new Error(`No se pudo bajar ${name}: ${img.status}`);
  writeFileSync(new URL(`${name}.png`, dir), Buffer.from(await img.arrayBuffer()));
}

// Tirolesas: puntos del juego → coordenadas del tablero (0..1000, y hacia abajo).
// P0 = puntos de paso, P1/P2 = tangentes de entrada/salida (curvas Bézier cúbicas).
const R = map.radius;
const toBoard = (x, y) => [(x + R) / (2 * R) * 1000, (1 - (y + R) / (2 * R)) * 1000].map(v => Math.round(v * 10) / 10);
const ziplines = map.zipline_paths.map(z => {
  const o = z.origin;
  const at = i => [o[0] + z.P0_points[i][0], o[1] + z.P0_points[i][1]];
  let d = `M ${toBoard(...at(0)).join(' ')}`;
  for (let i = 0; i < z.P0_points.length - 1; i++) {
    const a = at(i), b = at(i + 1);
    const c1 = [a[0] + z.P2_points[i][0], a[1] + z.P2_points[i][1]];
    const c2 = [b[0] + z.P1_points[i + 1][0], b[1] + z.P1_points[i + 1][1]];
    d += ` C ${toBoard(...c1).join(' ')} ${toBoard(...c2).join(' ')} ${toBoard(...b).join(' ')}`;
  }
  return { color: z.color, d };
});

const out = `// Generado por scripts/update-map.mjs (npm run update:map). No editar a mano.
// Capas del minimapa de Deadlock (imágenes en public/map/) y tirolesas en coordenadas
// del tablero: 0..1000 en x e y, con y hacia abajo.
export const MAP_UPDATED = '${new Date().toISOString().slice(0, 10)}';

export const MAP_LAYERS = {
  background:  '/map/background.png',
  map:         '/map/map.png',
  mid_tunnels: '/map/mid_tunnels.png',
  rat_tunnels: '/map/rat_tunnels.png',
};

export const ZIPLINES = ${JSON.stringify(ziplines, null, 2)};
`;
writeFileSync(new URL('../lib/mapData.js', import.meta.url), out);
console.log(`public/map/: ${Object.keys(layers).length} imágenes · lib/mapData.js: ${ziplines.length} tirolesas`);
