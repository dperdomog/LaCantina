// Lógica del draft de picks y bans (sin I/O). La usan las APIs y la interfaz.
import { HEROES, ACTIVE_HERO_IDS } from '@/lib/heroes';

export const FORMATS  = { '6v6': 6, '4v4': 4, '2v2': 2 };
export const TIMERS   = [0, 30, 45, 60, 90];
export const MAX_BANS = 6;

// Lado del i-ésimo pick en serpiente: A, BB, AA, BB, …
function pickSide(i) {
  if (i === 0) return 'A';
  return Math.floor((i - 1) / 2) % 2 === 0 ? 'B' : 'A';
}

// Bans alternados empezando por `first`: A, B, A, B, …
function banPhase(perSide, first) {
  const other = first === 'A' ? 'B' : 'A';
  const out = [];
  for (let i = 0; i < perSide; i++) out.push({ type: 'ban', side: first }, { type: 'ban', side: other });
  return out;
}

// Orden de turnos (como deadlocklabs.gg; verificado con 6v6 y 2 bans):
// - picks en una sola serpiente A, BB, AA, …
// - ceil(bans/2) bans por lado al inicio, empezando por A
// - floor(bans/2) bans por lado a mitad de los picks, empezando por quien tiene el siguiente pick
export function buildSequence(format, bansPerTeam) {
  const size = FORMATS[format];
  if (!size) throw new Error(`Formato inválido: ${format}`);
  const bans = Number(bansPerTeam);
  if (!Number.isInteger(bans) || bans < 0 || bans > MAX_BANS) throw new Error(`Bans inválidos: ${bansPerTeam}`);

  const totalPicks = size * 2;
  const mid = totalPicks / 2;
  const seq = [...banPhase(Math.ceil(bans / 2), 'A')];
  for (let i = 0; i < totalPicks; i++) {
    if (i === mid) seq.push(...banPhase(Math.floor(bans / 2), pickSide(mid)));
    seq.push({ type: 'pick', side: pickSide(i) });
  }
  return seq;
}

// Héroes ya usados (baneados o elegidos por cualquiera de los dos lados)
export function usedHeroes(actions) {
  return new Set(actions.map(a => a.hero_id).filter(id => id != null));
}

export function availableHeroes(actions) {
  const used = usedHeroes(actions);
  return ACTIVE_HERO_IDS.filter(id => !used.has(id));
}

// Turno actual o null si terminó
export function currentTurn(draft) {
  const seq = buildSequence(draft.format, draft.bans_per_team);
  const step = draft.actions.length;
  return step < seq.length ? { ...seq[step], step, total: seq.length } : null;
}

// Valida y devuelve la acción del turno actual. Lanza Error con mensaje para el usuario.
export function makeAction(draft, side, heroId) {
  const turn = currentTurn(draft);
  if (!turn) throw new Error('El draft ya terminó.');
  if (turn.side !== side) throw new Error('No es tu turno.');
  const id = Number(heroId);
  if (!HEROES[id]?.active) throw new Error('Héroe inválido.');
  if (usedHeroes(draft.actions).has(id)) throw new Error('Ese héroe ya no está disponible.');
  return { type: turn.type, side, hero_id: id, auto: false };
}

// Acción automática cuando se acaba el tiempo: el ban se pierde, el pick es al azar
export function autoAction(draft, random = Math.random) {
  const turn = currentTurn(draft);
  if (!turn) throw new Error('El draft ya terminó.');
  if (turn.type === 'ban') return { type: 'ban', side: turn.side, hero_id: null, auto: true };
  const pool = availableHeroes(draft.actions);
  return { type: 'pick', side: turn.side, hero_id: pool[Math.floor(random() * pool.length)], auto: true };
}

export function isDone(draft) {
  return draft.actions.length >= buildSequence(draft.format, draft.bans_per_team).length;
}

// Resumen por lado para mostrar el resultado
export function summary(draft) {
  const out = { A: { bans: [], picks: [] }, B: { bans: [], picks: [] } };
  for (const a of draft.actions) out[a.side][a.type === 'ban' ? 'bans' : 'picks'].push(a.hero_id);
  return out;
}

// Código de sala de 6 caracteres, sin letras ambiguas (0/O, 1/I/L)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function roomCode(random = Math.random) {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return s;
}
