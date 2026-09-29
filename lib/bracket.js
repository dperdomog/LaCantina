// Llaves de torneo (eliminación simple y doble). Funciones puras, sin I/O.
//
// Una partida es un objeto con la forma de la tabla `matches`:
//   { id, bracket: 'W'|'L'|'GF', round, position, reg_a, reg_b, bye_a, bye_b,
//     score_a, score_b, winner_id, next_match_id, next_slot,
//     loser_next_match_id, loser_next_slot, status: 'pending'|'ready'|'done'|'skipped' }
//
// Un lado está "definido" cuando tiene equipo (reg_x) o es pase libre (bye_x).
// Las partidas con un pase libre se resuelven solas; con dos pases quedan 'skipped'.
// En doble eliminación la gran final es GF ronda 1; GF ronda 2 (reset) solo se juega
// si gana el que viene de la llave de perdedores.

const nextPow2 = n => { let p = 1; while (p < n) p *= 2; return p; };

// Orden estándar de seeds: 1vP, luego los mejores seeds se cruzan lo más tarde posible
function seedOrder(size) {
  let order = [1];
  while (order.length < size) {
    const len = order.length * 2;
    order = order.flatMap(s => [s, len + 1 - s]);
  }
  return order;
}

const clone = ms => ms.map(m => ({ ...m }));

let tmpCounter = 0;
const defaultId = () => `tmp-${++tmpCounter}`;

function blank(id, bracket, round, position) {
  return {
    id, bracket, round, position,
    reg_a: null, reg_b: null, bye_a: false, bye_b: false,
    score_a: null, score_b: null, winner_id: null,
    next_match_id: null, next_slot: null,
    loser_next_match_id: null, loser_next_slot: null,
    status: 'pending',
  };
}

/**
 * Genera la llave.
 * @param {string[]} regIds  inscripciones ordenadas por seed (la primera es seed 1)
 * @param {'single'|'double'} type
 * @param {() => string} newId  generador de ids (en la API: crypto.randomUUID)
 * @returns partidas ya resueltas (los pases libres avanzan solos)
 */
export function generateBracket(regIds, type = 'single', newId = defaultId) {
  if (regIds.length < 2) throw new Error('Se necesitan al menos 2 participantes');
  const P = nextPow2(regIds.length);
  const R = Math.log2(P);
  const matches = [];
  const W = [];                      // W[r][p]
  for (let r = 1; r <= R; r++) {
    W[r] = [];
    for (let p = 0; p < P / 2 ** r; p++) {
      const m = blank(newId(), 'W', r, p);
      W[r].push(m); matches.push(m);
    }
  }

  // Ronda 1 con seeds; seed > n = pase libre
  const order = seedOrder(P);
  W[1].forEach((m, p) => {
    const sa = order[2 * p], sb = order[2 * p + 1];
    if (sa <= regIds.length) m.reg_a = regIds[sa - 1]; else m.bye_a = true;
    if (sb <= regIds.length) m.reg_b = regIds[sb - 1]; else m.bye_b = true;
  });

  const link = (from, to, slot, loser = false) => {
    from[loser ? 'loser_next_match_id' : 'next_match_id'] = to.id;
    from[loser ? 'loser_next_slot' : 'next_slot'] = slot;
  };

  for (let r = 1; r < R; r++) {
    W[r].forEach((m, p) => link(m, W[r + 1][Math.floor(p / 2)], p % 2 === 0 ? 'a' : 'b'));
  }

  if (type === 'double') {
    const gf1 = blank(newId(), 'GF', 1, 0);
    const gf2 = blank(newId(), 'GF', 2, 0);
    matches.push(gf1, gf2);
    link(W[R][0], gf1, 'a');

    if (R === 1) {
      // 2 participantes: el perdedor de la final de ganadores va directo a la gran final
      link(W[1][0], gf1, 'b', true);
    } else {
      const L = [];                  // L[r][p], r = 1..2(R-1)
      const lastL = 2 * (R - 1);
      for (let r = 1; r <= lastL; r++) {
        // Las rondas se achican cada dos: L1=L2=P/4, L3=L4=P/8, …
        const count = P / 2 ** (Math.ceil(r / 2) + 1);
        L[r] = [];
        for (let p = 0; p < count; p++) {
          const m = blank(newId(), 'L', r, p);
          L[r].push(m); matches.push(m);
        }
      }
      // Perdedores de W1 → L1
      W[1].forEach((m, p) => link(m, L[1][Math.floor(p / 2)], p % 2 === 0 ? 'a' : 'b', true));
      // Perdedores de W(k+1) → L(2k) lado b, en orden invertido para evitar revanchas
      for (let k = 1; k <= R - 1; k++) {
        const count = W[k + 1].length;
        W[k + 1].forEach((m, q) => link(m, L[2 * k][count - 1 - q], 'b', true));
      }
      for (let r = 1; r <= lastL; r++) {
        L[r].forEach((m, p) => {
          if (r === lastL) link(m, gf1, 'b');
          else if (r % 2 === 1) link(m, L[r + 1][p], 'a');                         // impar → siguiente, lado a
          else link(m, L[r + 1][Math.floor(p / 2)], p % 2 === 0 ? 'a' : 'b');       // par → consolidación
        });
      }
    }
  }

  return resolve(matches).matches;
}

// Coloca un equipo (o un pase libre si reg es null) en el lado indicado
function place(byId, targetId, slot, reg, changed) {
  if (!targetId) return;
  const t = byId.get(targetId);
  if (reg) t[`reg_${slot}`] = reg; else t[`bye_${slot}`] = true;
  changed.add(t.id);
}

const defined = (m, s) => Boolean(m[`reg_${s}`]) || m[`bye_${s}`];

// Resuelve en cascada: partidas listas, pases libres automáticos y partidas vacías
function resolve(input, changed = new Set()) {
  const matches = input;
  const byId = new Map(matches.map(m => [m.id, m]));
  let progress = true;
  while (progress) {
    progress = false;
    for (const m of matches) {
      if (m.status !== 'pending' || m.bracket === 'GF' && m.round === 2) continue;
      if (!defined(m, 'a') || !defined(m, 'b')) continue;
      progress = true;
      changed.add(m.id);
      if (m.reg_a && m.reg_b) {
        m.status = 'ready';
      } else if (m.reg_a || m.reg_b) {
        // Pase libre: avanza el equipo, el "perdedor" es un pase libre
        const winner = m.reg_a ?? m.reg_b;
        m.winner_id = winner;
        m.status = 'done';
        place(byId, m.next_match_id, m.next_slot, winner, changed);
        place(byId, m.loser_next_match_id, m.loser_next_slot, null, changed);
      } else {
        m.status = 'skipped';
        place(byId, m.next_match_id, m.next_slot, null, changed);
        place(byId, m.loser_next_match_id, m.loser_next_slot, null, changed);
      }
    }
  }
  return { matches, changed };
}

/**
 * Carga el resultado de una partida lista y propaga ganador/perdedor.
 * @returns {{ matches, changed: Set<string> }} copia actualizada y ids modificados
 */
export function applyResult(input, matchId, scoreA, scoreB) {
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0)
    throw new Error('Los puntajes deben ser enteros positivos');
  if (scoreA === scoreB) throw new Error('No puede haber empate');

  const matches = clone(input);
  const byId = new Map(matches.map(m => [m.id, m]));
  const m = byId.get(matchId);
  if (!m) throw new Error('Partida no encontrada');
  if (m.status !== 'ready') throw new Error('La partida no está lista para cargar resultado');

  const changed = new Set([m.id]);
  m.score_a = scoreA;
  m.score_b = scoreB;
  const winner = scoreA > scoreB ? m.reg_a : m.reg_b;
  const loser  = scoreA > scoreB ? m.reg_b : m.reg_a;
  m.winner_id = winner;
  m.status = 'done';

  if (m.bracket === 'GF' && m.round === 1) {
    const gf2 = matches.find(x => x.bracket === 'GF' && x.round === 2);
    changed.add(gf2.id);
    if (winner === m.reg_a) {
      gf2.status = 'skipped';                     // ganó el invicto: no hay reset
    } else {
      gf2.reg_a = m.reg_a; gf2.reg_b = m.reg_b;   // ambos con una derrota: reset
      gf2.status = 'ready';
    }
  } else {
    place(byId, m.next_match_id, m.next_slot, winner, changed);
    place(byId, m.loser_next_match_id, m.loser_next_slot, loser, changed);
  }

  return resolve(matches, changed);
}

const played     = m => m.status === 'done' && m.score_a != null;
const autoClosed = m => m.status === 'skipped' || (m.status === 'done' && m.score_a == null);
const targets    = m => [[m.next_match_id, m.next_slot], [m.loser_next_match_id, m.loser_next_slot]].filter(([id]) => id);

/**
 * ¿Se puede corregir el resultado de esta partida? Solo si ninguna partida que
 * depende de ella ya se jugó (las resueltas solas por pase libre se deshacen en cascada).
 */
export function canRevert(matches, matchId) {
  const byId = new Map(matches.map(m => [m.id, m]));
  const m = byId.get(matchId);
  if (!m || !played(m)) return false;
  if (m.bracket === 'GF' && m.round === 1) {
    return matches.find(x => x.bracket === 'GF' && x.round === 2).status !== 'done';
  }
  const downstreamFree = x => targets(x).every(([id]) => {
    const t = byId.get(id);
    if (played(t)) return false;
    return autoClosed(t) ? downstreamFree(t) : true;
  });
  return downstreamFree(m);
}

/** Deshace el resultado de una partida (ver canRevert) y la deja lista de nuevo. */
export function revertResult(input, matchId) {
  if (!canRevert(input, matchId)) throw new Error('Ya se jugaron partidas que dependen de este resultado');
  const matches = clone(input);
  const byId = new Map(matches.map(m => [m.id, m]));
  const m = byId.get(matchId);
  const changed = new Set([m.id]);

  // Saca lo que x colocó más adelante; deshace en cascada lo resuelto por pase libre
  const undo = x => {
    for (const [id, slot] of targets(x)) {
      const t = byId.get(id);
      if (autoClosed(t)) {
        undo(t);
        Object.assign(t, { winner_id: null, status: 'pending' });
      }
      t[`reg_${slot}`] = null;
      t[`bye_${slot}`] = false;
      if (t.status === 'ready') t.status = 'pending';
      changed.add(t.id);
    }
  };

  if (m.bracket === 'GF' && m.round === 1) {
    const gf2 = matches.find(x => x.bracket === 'GF' && x.round === 2);
    Object.assign(gf2, { reg_a: null, reg_b: null, status: 'pending' });
    changed.add(gf2.id);
  } else {
    undo(m);
  }
  Object.assign(m, { score_a: null, score_b: null, winner_id: null, status: 'ready' });
  return resolve(matches, changed);
}

/** Campeón (id de inscripción) o null si la llave no terminó. */
export function getChampion(matches) {
  const gf1 = matches.find(m => m.bracket === 'GF' && m.round === 1);
  if (gf1) {
    const gf2 = matches.find(m => m.bracket === 'GF' && m.round === 2);
    if (gf2?.status === 'done') return gf2.winner_id;
    if (gf1.status === 'done' && gf1.winner_id === gf1.reg_a) return gf1.winner_id;
    return null;
  }
  const w = matches.filter(m => m.bracket === 'W');
  const lastRound = Math.max(...w.map(m => m.round));
  const final = w.find(m => m.round === lastRound);
  return final?.status === 'done' ? final.winner_id : null;
}

/** ¿Alguna partida tiene resultado cargado? (entonces no se puede regenerar la llave) */
export const hasResults = matches => matches.some(m => m.score_a != null || m.score_b != null);

/** Nombre legible de una ronda */
export function roundLabel(matches, bracket, round) {
  if (bracket === 'GF') return round === 1 ? 'Gran final' : 'Gran final (reset)';
  const rounds = Math.max(...matches.filter(m => m.bracket === bracket).map(m => m.round));
  if (bracket === 'W') {
    const fromEnd = rounds - round;
    const single = !matches.some(m => m.bracket === 'GF');
    if (fromEnd === 0) return single ? 'Final' : 'Final de ganadores';
    if (fromEnd === 1) return 'Semifinal';
    if (fromEnd === 2) return 'Cuartos de final';
    return `Ronda ${round}`;
  }
  return round === rounds ? 'Final de perdedores' : `Perdedores · Ronda ${round}`;
}
