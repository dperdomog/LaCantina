// Regenera lib/heroes.js con los héroes de Deadlock (deadlock-api.com).
// Uso: npm run update:heroes
import { existsSync, writeFileSync } from 'node:fs';

const res = await fetch('https://api.deadlock-api.com/v1/assets/heroes?language=spanish', {
  headers: { 'User-Agent': 'LaCantina/1.0' },
});
if (!res.ok) throw new Error(`deadlock-api respondió ${res.status}`);
const heroes = await res.json();

// Mapa anterior: se conservan sus héroes (para el historial) y su fecha de alta
const file = new URL('../lib/heroes.js', import.meta.url);
const previous = existsSync(file) ? (await import(`${file.href}?t=${Date.now()}`)).HEROES : {};
const today = new Date().toISOString().slice(0, 10);

// Héroe terminado: no deshabilitado ni en desarrollo. Los héroes anunciados en un parche
// se liberan de a poco (por votación en el juego) y mientras tanto vienen sin
// `player_selectable`: quedan como pendientes hasta que un admin los habilite.
const finished = h => !h.disabled && !h.in_development && !/testhero/i.test(h.class_name ?? '');

const map = {};
for (const h of heroes.filter(finished).sort((a, b) => a.id - b.id)) {
  const img = h.images ?? {};
  map[h.id] = {
    name:   h.name,
    image:  img.icon_image_small_webp ?? img.icon_image_small ?? img.icon_hero_card_webp ?? null,
    card:   img.icon_hero_card_webp ?? img.icon_hero_card ?? null,
    active: !!h.player_selectable,                           // ya está en el juego
    ...(h.player_selectable ? {} : { pending: true }),       // anunciado, todavía no liberado
    ...(previous[h.id] ? (previous[h.id].added ? { added: previous[h.id].added } : {}) : { added: today }),
  };
}
// Las imágenes de los héroes recién anunciados a veces todavía no están publicadas (404):
// en ese caso se dejan en null y el sitio muestra el nombre. Volver a correr el script
// cuando la API las publique.
const exists = async url => {
  if (!url) return false;
  try { return (await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'LaCantina/1.0' } })).ok; }
  catch { return false; }
};
const missing = [];
const ids = Object.keys(map);
for (let i = 0; i < ids.length; i += 8) {
  await Promise.all(ids.slice(i, i + 8).map(async id => {
    const h = map[id];
    const [imgOk, cardOk] = await Promise.all([exists(h.image), exists(h.card)]);
    if (!imgOk) h.image = cardOk ? h.card : null;
    if (!cardOk) h.card = imgOk ? h.image : null;
    if (!imgOk && !cardOk) missing.push(h.name);
  }));
}

// Héroes que se jugaron (o estaban pendientes) y ya no vienen en la API: se mantienen
for (const [id, h] of Object.entries(previous)) {
  if (!map[id] && (h.active || h.pending)) map[id] = { ...h, active: false };
}

const sorted = Object.keys(map).map(Number).sort((a, b) => a - b);
const lines = sorted.map(id => `  ${id}: ${JSON.stringify(map[id])},`).join('\n');
const out = `// Generado por scripts/update-heroes.mjs (npm run update:heroes). No editar a mano.
// Héroes de Deadlock: id → { name, image, card, active, pending?, added? } (deadlock-api.com)
// active  = ya se puede jugar; pending = anunciado, se habilita desde Admin → Héroes
// added   = fecha en que el héroe apareció en el sitio (para marcarlo como nuevo)
export const HEROES = {
${lines}
};

export function heroInfo(id) {
  return HEROES[id] ?? { name: \`Héroe #\${id}\`, image: null, card: null, active: false };
}

// ¿Llegó hace menos de \`days\` días?
export function isNewHero(id, days = 30, now = Date.now()) {
  const added = HEROES[id]?.added;
  return !!added && now - new Date(added).getTime() < days * 86400e3;
}

const byName = (a, b) => HEROES[a].name.localeCompare(HEROES[b].name, 'es');

// Héroes jugables hoy, ordenados por nombre (para el draft)
export const ACTIVE_HERO_IDS = Object.keys(HEROES).map(Number).filter(id => HEROES[id].active).sort(byName);

// Anunciados pero todavía no liberados (se habilitan desde el admin)
export const PENDING_HERO_IDS = Object.keys(HEROES).map(Number).filter(id => HEROES[id].pending).sort(byName);
`;

writeFileSync(file, out);
const added = sorted.filter(id => map[id].added === today && !previous[id]).map(id => map[id].name);
console.log(`lib/heroes.js: ${sorted.length} héroes, ${sorted.filter(id => map[id].active).length} jugables, ${sorted.filter(id => map[id].pending).length} pendientes`);
if (added.length) console.log(`Nuevos: ${added.join(', ')}`);
if (missing.length) console.log(`Sin imagen publicada todavía: ${missing.join(', ')}`);
