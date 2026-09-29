// Prueba de lib/board.js (mapa de coaching). Uso: npm run test:board
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// lib/board.js importa '@/lib/heroes': copia temporal con la ruta relativa
const dir = mkdtempSync(join(tmpdir(), 'board-test-'));
writeFileSync(join(dir, 'heroes.js'), readFileSync(new URL('../lib/heroes.js', import.meta.url)));
writeFileSync(join(dir, 'board.js'), readFileSync(new URL('../lib/board.js', import.meta.url), 'utf8').replace("'@/lib/heroes'", "'./heroes.js'"));
const B = await import(pathToFileURL(join(dir, 'board.js')).href);
const { ACTIVE_HERO_IDS } = await import(pathToFileURL(join(dir, 'heroes.js')).href);

let failures = 0, checks = 0;
const assert = (cond, msg) => { checks++; if (!cond) { failures++; console.log('✗', msg); } };
const throws = fn => { try { fn(); return false; } catch { return true; } };
const hero = ACTIVE_HERO_IDS[0];

// Elementos válidos se conservan (y se redondean / acotan a 0..1000)
const ok = B.sanitizeBoard({ elements: [
  { id: 'a1', kind: 'arrow', color: '#00c8f0', points: [[10.4, 20.6], [2000, -5]] },
  { id: 'p1', kind: 'pen', color: '#ffd400', width: 'thick', points: [[1, 1], [2, 2], [3, 3]] },
  { id: 'h1', kind: 'hero', hero_id: hero, team: 'B', points: [[500, 500]] },
  { id: 't1', kind: 'text', color: '#ffffff', text: '  empujen mid  ', points: [[300, 300]] },
], layers: { ziplines: false, mid_tunnels: true } });
assert(ok.elements.length === 4, 'debería conservar 4 elementos');
assert(JSON.stringify(ok.elements[0].points) === '[[10,21],[1000,0]]', `puntos acotados: ${JSON.stringify(ok.elements[0].points)}`);
assert(ok.elements[3].text === 'empujen mid', 'texto recortado');
assert(ok.layers.ziplines === false && ok.layers.mid_tunnels === true && ok.layers.rat_tunnels === false, 'capas');

// Elementos inválidos se descartan
const bad = B.sanitizeBoard({ elements: [
  { id: 'x1', kind: 'script', points: [[1, 1], [2, 2]] },
  { id: 'x2', kind: 'line', points: [[1, 1]] },
  { id: 'x3', kind: 'hero', hero_id: 99999, points: [[1, 1]] },
  { id: 'x4', kind: 'text', text: '   ', points: [[1, 1]] },
  { id: '<bad id>', kind: 'line', points: [[1, 1], [2, 2]] },
  { id: 'dup', kind: 'line', color: 'javascript:alert(1)', points: [[1, 1], [2, 2]] },
  { id: 'dup', kind: 'line', points: [[3, 3], [4, 4]] },
] });
assert(bad.elements.length === 1, `solo debería quedar 1 elemento, quedaron ${bad.elements.length}`);
assert(bad.elements[0].color === B.COLORS[0], 'color inválido reemplazado');

// Límites
const many = Array.from({ length: B.LIMITS.elements + 1 }, (_, i) => ({ id: `l${i}`, kind: 'line', points: [[0, 0], [1, 1]] }));
assert(throws(() => B.sanitizeBoard({ elements: many })), 'debería rechazar demasiados elementos');
const longPen = { id: 'p', kind: 'pen', points: Array.from({ length: 1000 }, (_, i) => [i % 1000, i % 1000]) };
assert(B.sanitizeBoard({ elements: [longPen] }).elements[0].points.length === B.LIMITS.penPoints, 'trazo recortado al máximo');
assert(B.sanitizeBoard(null).elements.length === 0, 'tablero vacío');

// Fichas desde un draft: 6 abajo (A) y 6 arriba (B), sin repetir ids
const picks = ACTIVE_HERO_IDS.slice(0, 12);
const draft = { actions: picks.map((h, i) => ({ type: 'pick', side: i % 2 ? 'B' : 'A', hero_id: h })).concat([{ type: 'ban', side: 'A', hero_id: null }]) };
const tokens = B.tokensFromDraft(draft);
assert(tokens.length === 12, 'deberían ser 12 fichas');
assert(tokens.filter(t => t.team === 'A').every(t => t.points[0][1] === 900), 'A abajo');
assert(tokens.filter(t => t.team === 'B').every(t => t.points[0][1] === 100), 'B arriba');
assert(new Set(tokens.map(t => t.id)).size === 12, 'ids únicos');
assert(B.sanitizeBoard({ elements: tokens }).elements.length === 12, 'las fichas pasan la validación');

// Simplificación de trazos
const straight = Array.from({ length: 100 }, (_, i) => [i, i]);
assert(B.simplify(straight).length === 2, 'una recta queda en 2 puntos');
const zig = Array.from({ length: 50 }, (_, i) => [i * 10, i % 2 ? 0 : 50]);
assert(B.simplify(zig).length === 50, 'un zigzag conserva sus puntos');

console.log(`${checks} comprobaciones, ${failures} fallas`);
process.exit(failures ? 1 : 0);
