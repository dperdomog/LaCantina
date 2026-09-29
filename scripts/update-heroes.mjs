// Regenera lib/heroes.js con los héroes de Deadlock (deadlock-api.com).
// Uso: npm run update:heroes
import { writeFileSync } from 'node:fs';

const res = await fetch('https://api.deadlock-api.com/v1/assets/heroes?language=spanish', {
  headers: { 'User-Agent': 'LaCantina/1.0' },
});
if (!res.ok) throw new Error(`deadlock-api respondió ${res.status}`);
const heroes = await res.json();

// Todos los seleccionables (activos o no) para que las partidas viejas se resuelvan
const map = {};
for (const h of heroes.filter(h => h.player_selectable).sort((a, b) => a.id - b.id)) {
  const img = h.images ?? {};
  map[h.id] = { name: h.name, image: img.icon_image_small_webp ?? img.icon_image_small ?? img.icon_hero_card_webp ?? null };
}

const lines = Object.entries(map).map(([id, h]) => `  ${id}: ${JSON.stringify(h)},`).join('\n');
const out = `// Generado por scripts/update-heroes.mjs (npm run update:heroes). No editar a mano.
// Héroes de Deadlock: id → { name, image } (deadlock-api.com)
export const HEROES = {
${lines}
};

export function heroInfo(id) {
  return HEROES[id] ?? { name: \`Héroe #\${id}\`, image: null };
}
`;

writeFileSync(new URL('../lib/heroes.js', import.meta.url), out);
console.log(`lib/heroes.js: ${Object.keys(map).length} héroes`);
