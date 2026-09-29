import { roundLabel } from '@/lib/bracket';

// Nombre a mostrar en un lado de la partida
function sideName(m, side, names) {
  const reg = m[`reg_${side}`];
  if (reg) return { text: names[reg] ?? 'Equipo', kind: 'team' };
  if (m[`bye_${side}`]) return { text: 'Pase libre', kind: 'bye' };
  return { text: 'Por definir', kind: 'tbd' };
}

function MatchCard({ m, names }) {
  const skipped = m.status === 'skipped';
  return (
    <div className={`sticker-sm bg-surface w-[210px] overflow-hidden ${skipped ? 'opacity-40' : ''}`}>
      {['a', 'b'].map((side, i) => {
        const { text, kind } = sideName(m, side, names);
        const won   = m.winner_id && m.winner_id === m[`reg_${side}`];
        const score = m[`score_${side}`];
        return (
          <div key={side}
            className={`flex items-center gap-2 px-3 py-2 ${i === 1 ? 'border-t-2 border-line' : ''} ${won ? 'bg-yellow text-on-color' : ''}`}>
            <span className={`flex-1 min-w-0 truncate text-[14px] ${
              won ? 'font-bold' : kind === 'team' ? 'text-ink font-semibold' : 'text-ink-faint italic'
            }`}>
              {text}
            </span>
            {score != null && <span className="font-display text-[16px] shrink-0">{score}</span>}
          </div>
        );
      })}
    </div>
  );
}

function Section({ title, matches, all, names }) {
  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
  return (
    <section className="mb-10">
      <h3 className="font-display text-[22px] text-ink mb-4">{title}</h3>
      <div className="overflow-x-auto pb-4 -mx-5 px-5">
        <div className="flex gap-6 w-max">
          {rounds.map(r => (
            <div key={r} className="flex flex-col">
              <span className="mono-label mb-3">{roundLabel(all, matches[0].bracket, r)}</span>
              <div className="flex flex-col justify-around gap-4 flex-1">
                {matches.filter(m => m.round === r).sort((a, b) => a.position - b.position)
                  .map(m => <MatchCard key={m.id} m={m} names={names} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Llave pública.
 * @param matches  filas de la tabla matches
 * @param names    { [registration_id]: nombre a mostrar }
 */
export default function Bracket({ matches, names }) {
  if (!matches?.length) return null;
  const isDouble = matches.some(m => m.bracket === 'GF');
  const w  = matches.filter(m => m.bracket === 'W');
  const l  = matches.filter(m => m.bracket === 'L');
  // El reset solo se muestra si se juega (o se está por jugar)
  const gf = matches.filter(m => m.bracket === 'GF' && !(m.round === 2 && m.status !== 'ready' && m.status !== 'done'));

  return (
    <div>
      <Section title={isDouble ? 'Llave de ganadores' : 'Llave'} matches={w} all={matches} names={names} />
      {l.length > 0 && <Section title="Llave de perdedores" matches={l} all={matches} names={names} />}
      {gf.length > 0 && <Section title="Gran final" matches={gf} all={matches} names={names} />}
    </div>
  );
}
