// Prueba de lib/bracket.js: simula torneos completos con resultados aleatorios
// Uso: npm run test:bracket
const lib = await import(new URL('../lib/bracket.js', import.meta.url).href);
const { generateBracket, applyResult, getChampion, hasResults, canRevert, revertResult } = lib;

let rng = 12345;
const rand = () => ((rng = (rng * 1103515245 + 12345) % 2147483648) / 2147483648);
let failures = 0, runs = 0;
const assert = (cond, msg) => { if (!cond) { failures++; throw new Error(msg); } };

function simulate(n, type, { withReverts = false } = {}) {
  const regs = Array.from({ length: n }, (_, i) => `r${i + 1}`);
  let counter = 0;
  let ms = generateBracket(regs, type, () => `m${++counter}`);
  const ids = new Set(ms.map(m => m.id));

  // Enlaces válidos
  for (const m of ms) {
    for (const k of ['next_match_id', 'loser_next_match_id']) assert(!m[k] || ids.has(m[k]), `${type} n=${n}: enlace roto ${k} en ${m.id}`);
    assert(!m.next_match_id || ['a', 'b'].includes(m.next_slot), `${type} n=${n}: next_slot inválido`);
    assert(!m.loser_next_match_id || ['a', 'b'].includes(m.loser_next_slot), `${type} n=${n}: loser_next_slot inválido`);
  }
  // Ids únicos por (bracket, round, position)
  const keys = new Set(ms.map(m => `${m.bracket}-${m.round}-${m.position}`));
  assert(keys.size === ms.length, `${type} n=${n}: posiciones duplicadas`);
  assert(!hasResults(ms), `${type} n=${n}: la llave nueva no debería tener resultados`);

  const losses = Object.fromEntries(regs.map(r => [r, 0]));
  let steps = 0;
  while (true) {
    const ready = ms.filter(m => m.status === 'ready');
    if (ready.length === 0) break;
    const m = ready[Math.floor(rand() * ready.length)];
    let a = Math.floor(rand() * 3), b = Math.floor(rand() * 3);
    if (a === b) b = a + 1;
    // A veces cargamos mal y corregimos (si se puede)
    if (withReverts && rand() < 0.3) {
      const r1 = applyResult(ms, m.id, b, a).matches;
      assert(canRevert(r1, m.id), `${type} n=${n}: debería poder corregirse recién cargado`);
      ms = revertResult(r1, m.id).matches;
      assert(ms.find(x => x.id === m.id).status === 'ready', 'tras revertir debe quedar lista');
    }
    ms = applyResult(ms, m.id, a, b).matches;
    const done = ms.find(x => x.id === m.id);
    losses[a > b ? done.reg_b : done.reg_a]++;
    assert(hasResults(ms), 'hasResults debe ser true tras cargar un resultado');
    if (++steps > 500) throw new Error('bucle infinito');
  }

  const champ = getChampion(ms);
  assert(champ, `${type} n=${n}: no hay campeón`);
  const left = ms.filter(m => m.status === 'pending' || m.status === 'ready');
  assert(left.length === 0, `${type} n=${n}: quedaron ${left.length} partidas sin terminar (${left.map(m => `${m.bracket}${m.round}-${m.position}`).join(',')})`);
  const expected = type === 'single' ? 1 : 2;
  for (const r of regs) {
    if (r === champ) assert(losses[r] <= (type === 'single' ? 0 : 1), `${type} n=${n}: campeón con ${losses[r]} derrotas`);
    else assert(losses[r] === expected, `${type} n=${n}: ${r} tiene ${losses[r]} derrotas (esperado ${expected})`);
  }
  // Campeones únicos: nadie más quedó invicto (simple) / con <2 derrotas (doble)
  const alive = regs.filter(r => losses[r] < expected);
  assert(alive.length === 1 && alive[0] === champ, `${type} n=${n}: quedan ${alive.length} vivos`);
  runs++;
  return { matches: ms.length, champ };
}

const summary = [];
for (const type of ['single', 'double']) {
  for (let n = 2; n <= 17; n++) {
    for (let trial = 0; trial < 25; trial++) {
      try {
        const r = simulate(n, type, { withReverts: trial % 5 === 0 });
        if (trial === 0) summary.push(`${type} n=${n}: ${r.matches} partidas`);
      } catch (e) {
        console.log('FALLA:', e.message);
        if (failures > 10) process.exit(1);
      }
    }
  }
}

// No se puede cargar resultado en partida no lista, ni empate
try { const ms = generateBracket(['a', 'b', 'c'], 'single'); applyResult(ms, ms.find(m => m.status === 'pending').id, 1, 0); failures++; console.log('FALLA: aceptó resultado en partida pendiente'); } catch {}
try { const ms = generateBracket(['a', 'b'], 'single'); applyResult(ms, ms[0].id, 1, 1); failures++; console.log('FALLA: aceptó empate'); } catch {}
try { generateBracket(['a'], 'single'); failures++; console.log('FALLA: aceptó 1 participante'); } catch {}

// No se puede corregir si la partida siguiente ya se jugó
{
  let ms = generateBracket(['a', 'b', 'c', 'd'], 'single');
  const [s1, s2] = ms.filter(m => m.round === 1);
  ms = applyResult(ms, s1.id, 2, 0).matches;
  ms = applyResult(ms, s2.id, 2, 0).matches;
  if (!canRevert(ms, s1.id)) { failures++; console.log('FALLA: debería poder corregir antes de la final'); }
  const final = ms.find(m => m.round === 2);
  ms = applyResult(ms, final.id, 2, 1).matches;
  if (canRevert(ms, s1.id)) { failures++; console.log('FALLA: permitió corregir con la final jugada'); }
  try { revertResult(ms, s1.id); failures++; console.log('FALLA: revertResult no lanzó error'); } catch {}
  if (!canRevert(ms, final.id)) { failures++; console.log('FALLA: la final debería poder corregirse'); }
}

console.log(summary.join('\n'));
console.log(`\n${runs} torneos simulados, ${failures} fallas`);
process.exit(failures ? 1 : 0);
