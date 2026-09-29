// Prueba de lib/draft.js: orden de turnos y drafts completos simulados
// Uso: npm run test:draft
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// lib/draft.js importa '@/lib/heroes': armamos una copia temporal con la ruta relativa
const dir = mkdtempSync(join(tmpdir(), 'draft-test-'));
writeFileSync(join(dir, 'heroes.js'), readFileSync(new URL('../lib/heroes.js', import.meta.url)));
writeFileSync(join(dir, 'draft.js'), readFileSync(new URL('../lib/draft.js', import.meta.url), 'utf8').replace("'@/lib/heroes'", "'./heroes.js'"));
const D = await import(pathToFileURL(join(dir, 'draft.js')).href);
const { ACTIVE_HERO_IDS } = await import(pathToFileURL(join(dir, 'heroes.js')).href);

let failures = 0, checks = 0;
const assert = (cond, msg) => { checks++; if (!cond) { failures++; console.log('✗', msg); } };
const fmt = seq => seq.map(s => `${s.type === 'ban' ? 'b' : 'p'}${s.side}`).join(' ');

// 1) Orden observado en deadlocklabs (6v6, 2 bans)
const observed = 'bA bB pA pB pB pA pA pB bB bA pB pA pA pB pB pA';
assert(fmt(D.buildSequence('6v6', 2)) === observed, `6v6/2 no coincide:\n  ${fmt(D.buildSequence('6v6', 2))}\n  ${observed}`);

// 2) Invariantes de todos los formatos y cantidades de bans
let rng = 7;
const rand = () => ((rng = (rng * 1103515245 + 12345) % 2147483648) / 2147483648);
for (const format of Object.keys(D.FORMATS)) {
  const size = D.FORMATS[format];
  for (let bans = 0; bans <= D.MAX_BANS; bans++) {
    const seq = D.buildSequence(format, bans);
    const count = (type, side) => seq.filter(s => s.type === type && s.side === side).length;
    assert(seq.length === size * 2 + bans * 2, `${format}/${bans}: largo ${seq.length}`);
    for (const side of ['A', 'B']) {
      assert(count('pick', side) === size, `${format}/${bans}: picks ${side}`);
      assert(count('ban', side) === bans, `${format}/${bans}: bans ${side}`);
    }
    const picksOnly = seq.filter(s => s.type === 'pick').map(s => s.side).join('');
    assert(/^A(BBAA)*(BBA|B)?$/.test(picksOnly) || picksOnly === 'AB' || /^A(BBAA)*BBA$/.test(picksOnly), `${format}/${bans}: serpiente ${picksOnly}`);

    // 3) Simulación completa: acciones válidas, algunas por tiempo
    for (let run = 0; run < 20; run++) {
      const draft = { format, bans_per_team: bans, actions: [] };
      while (!D.isDone(draft)) {
        const turn = D.currentTurn(draft);
        const other = turn.side === 'A' ? 'B' : 'A';
        let threw = false;
        try { D.makeAction(draft, other, D.availableHeroes(draft.actions)[0]); } catch { threw = true; }
        assert(threw, `${format}/${bans}: aceptó el turno del otro lado`);
        const a = rand() < 0.2 ? D.autoAction(draft, rand)
          : D.makeAction(draft, turn.side, D.availableHeroes(draft.actions)[Math.floor(rand() * D.availableHeroes(draft.actions).length)]);
        draft.actions.push(a);
      }
      const s = D.summary(draft);
      const picked = [...s.A.picks, ...s.B.picks];
      assert(s.A.picks.length === size && s.B.picks.length === size, `${format}/${bans}: picks finales`);
      assert(picked.every(id => id != null), `${format}/${bans}: pick vacío`);
      const all = draft.actions.map(a => a.hero_id).filter(id => id != null);
      assert(new Set(all).size === all.length, `${format}/${bans}: héroe repetido`);
      assert(all.every(id => ACTIVE_HERO_IDS.includes(id)), `${format}/${bans}: héroe no jugable`);
      let threw = false;
      try { D.makeAction(draft, 'A', ACTIVE_HERO_IDS[0]); } catch { threw = true; }
      assert(threw, `${format}/${bans}: aceptó acción con el draft terminado`);
    }
  }
}

// 4) Validaciones puntuales
const d = { format: '2v2', bans_per_team: 1, actions: [] };
const first = D.makeAction(d, 'A', ACTIVE_HERO_IDS[0]); d.actions.push(first);
for (const [msg, fn] of [
  ['héroe usado', () => D.makeAction(d, 'B', ACTIVE_HERO_IDS[0])],
  ['héroe inexistente', () => D.makeAction(d, 'B', 99999)],
  ['héroe no jugable', () => D.makeAction(d, 'B', 68)],
]) { let threw = false; try { fn(); } catch { threw = true; } assert(threw, `no rechazó: ${msg}`); }
assert(D.autoAction({ format: '6v6', bans_per_team: 2, actions: [] }).hero_id === null, 'ban por tiempo debería perderse');
for (let i = 0; i < 200; i++) assert(/^[A-HJ-NP-Z2-9]{6}$/.test(D.roomCode()), 'código de sala inválido');

// 5) Bans fijos por formato
const expected = {
  '6v6': 'bA bB pA pB pB pA pA pB bB bA pB pA pA pB pB pA',
  '4v4': 'bA bB pA pB pB pA pA pB pB pA',
  '2v2': 'bA bB pA pB pB pA',
};
for (const [f, seq] of Object.entries(expected)) {
  assert(D.BANS_BY_FORMAT[f] === (f === '6v6' ? 2 : 1), `bans fijos de ${f}`);
  assert(fmt(D.buildSequence(f, D.BANS_BY_FORMAT[f])) === seq, `orden fijo de ${f}: ${fmt(D.buildSequence(f, D.BANS_BY_FORMAT[f]))}`);
}

console.log('\nOrden de cada formato (bans fijos):');
for (const f of Object.keys(D.FORMATS)) console.log(`  ${f}, ${D.BANS_BY_FORMAT[f]} por equipo: ${fmt(D.buildSequence(f, D.BANS_BY_FORMAT[f]))}`);
console.log(`\n${checks} comprobaciones, ${failures} fallas`);
process.exit(failures ? 1 : 0);
