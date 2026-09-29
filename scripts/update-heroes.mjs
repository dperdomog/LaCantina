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

// Jugable hoy: no deshabilitado ni en desarrollo. Los héroes recién lanzados pueden
// venir sin `player_selectable` en la API, por eso no alcanza con ese campo.
const playable = h => !h.disabled && !h.in_development && !/testhero/i.test(h.class_name ?? '') && !!h.images?.icon_hero_card;

const map = {};
for (const h of heroes.filter(h => h.player_selectable || playable(h)).sort((a, b) => a.id - b.id)) {
  const img = h.images ?? {};
  map[h.id] = {
    name:   h.name,
    image:  img.icon_image_small_webp ?? img.icon_image_small ?? img.icon_hero_card_webp ?? null,
    card:   img.icon_hero_card_webp ?? img.icon_hero_card ?? null,
    active: playable(h),                                     // elegible en el draft
    ...(previous[h.id] ? (previous[h.id].added ? { added: previous[h.id].added } : {}) : { added: today }),
  };
}
// Héroes que ya no vienen en la API: se mantienen, pero no jugables
for (const [id, h] of Object.entries(previous)) {
  if (!map[id]) map[id] = { ...h, active: false };
}

const sorted = Object.keys(map).map(Number).sort((a, b) => a - b);
const lines = sorted.map(id => `  ${id}: ${JSON.stringify(map[id])},`).join('\n');
const out = `// Generado por scripts/update-heroes.mjs (npm run update:heroes). No editar a mano.
// Héroes de Deadlock: id → { name, image, card, active, added? } (deadlock-api.com)
// added = fecha en que el héroe apareció en el sitio (para marcarlo como nuevo)
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

// Héroes jugables hoy, ordenados por nombre (para el draft)
export const ACTIVE_HERO_IDS = Object.keys(HEROES).map(Number).filter(id => HEROES[id].active)
  .sort((a, b) => HEROES[a].name.localeCompare(HEROES[b].name, 'es'));
`;

writeFileSync(file, out);
const added = sorted.filter(id => map[id].added === today && !previous[id]).map(id => map[id].name);
console.log(`lib/heroes.js: ${sorted.length} héroes, ${sorted.filter(id => map[id].active).length} jugables`);
if (added.length) console.log(`Nuevos: ${added.join(', ')}`);
