import { heroInfo } from '@/lib/heroes';
import { LocalTime } from '@/components/Countdown';

const duration = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const isoFromUnix = t => new Date(t * 1000).toISOString();

function HeroIcon({ id, size = 44 }) {
  const hero = heroInfo(id);
  return hero.image
    ? <img src={hero.image} alt="" loading="lazy" style={{ width: size, height: size }}
        className="rounded-xl border-[3px] border-line object-cover bg-surface-2 shrink-0" />
    : <span style={{ width: size, height: size }}
        className="rounded-xl border-[3px] border-line bg-surface-2 shrink-0 inline-flex items-center justify-center font-display text-ink-dim">
        {hero.name[0]}
      </span>;
}

// Estadísticas de partidas de Deadlock (últimas 20, héroes más jugados y últimas 10)
export default function PlayerStats({ stats, hasStatlocker, isOwnProfile }) {
  if (!hasStatlocker) {
    if (!isOwnProfile) return null;
    return (
      <div className="sticker p-6 sm:col-span-2">
        <span className="mono-label block mb-3">🎮 Partidas</span>
        <p className="text-ink-dim text-[15px] mb-4">
          Vincula tu StatLocker para mostrar tus héroes más jugados, tu % de victorias y tus últimas partidas.
        </p>
        <a href="/onboarding" className="btn btn-primary btn-sm">Vincular StatLocker →</a>
      </div>
    );
  }

  const empty = !stats || (stats.summary?.matches === 0 && !stats.heroes?.length);
  if (empty) {
    return (
      <div className="sticker p-6 sm:col-span-2">
        <span className="mono-label block mb-3">🎮 Partidas</span>
        <p className="text-ink-dim text-[15px]">
          Todavía no hay partidas para mostrar. Puede que la cuenta sea privada o que los datos aún no estén disponibles.
        </p>
      </div>
    );
  }

  const { summary, heroes = [], recent = [] } = stats;
  const losses = summary.matches - summary.wins;

  return (
    <div className="sticker p-6 sm:col-span-2">
      <span className="mono-label block mb-4">🎮 Últimas {summary.matches} partidas</span>

      {/* Resumen */}
      <dl className="grid grid-cols-3 gap-3">
        {[
          ['Victorias', `${summary.winrate}%`, summary.winrate >= 50 ? 'text-green-ink' : 'text-pink-ink'],
          ['V – D', `${summary.wins} – ${losses}`, 'text-ink'],
          ['KDA', summary.kda.toFixed(2), 'text-ink'],
        ].map(([label, value, color]) => (
          <div key={label} className="bg-surface-2 border-[3px] border-line rounded-2xl p-3 text-center">
            <dd className={`font-display text-[clamp(24px,4vw,32px)] leading-none ${color}`}>{value}</dd>
            <dt className="mono-label text-[11px] mt-1.5">{label}</dt>
          </div>
        ))}
      </dl>

      {/* Héroes más jugados */}
      {heroes.length > 0 && (
        <>
          <h3 className="font-display text-[20px] mt-7 mb-3">Héroes más jugados</h3>
          <ul className="flex flex-col gap-2.5">
            {heroes.map(h => (
              <li key={h.hero_id} className="flex items-center gap-3 bg-surface-2 border-[3px] border-line rounded-2xl px-3 py-2.5">
                <HeroIcon id={h.hero_id} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[17px] leading-tight truncate">{heroInfo(h.hero_id).name}</p>
                  <p className="text-[13px] text-ink-dim">{h.matches.toLocaleString('es-MX')} partidas</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-display text-[17px] leading-tight ${h.winrate >= 50 ? 'text-green-ink' : 'text-pink-ink'}`}>{h.winrate}%</p>
                  <p className="text-[13px] text-ink-dim">KDA {h.kda.toFixed(2)}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Últimas partidas */}
      {recent.length > 0 && (
        <>
          <h3 className="font-display text-[20px] mt-7 mb-3">Últimas partidas</h3>
          <ul className="flex flex-col gap-2">
            {recent.map(m => (
              <li key={m.match_id} className="flex items-center gap-3 border-b-2 border-rule last:border-b-0 pb-2 last:pb-0">
                <HeroIcon id={m.hero_id} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold leading-tight truncate">{heroInfo(m.hero_id).name}</p>
                  <p className="text-[12px] text-ink-dim">
                    <LocalTime iso={isoFromUnix(m.start_time)} part="date" /> · {duration(m.duration_s)}
                  </p>
                </div>
                <span className="text-[14px] font-bold tabular-nums whitespace-nowrap">{m.k} / {m.d} / {m.a}</span>
                <span className={`pill shrink-0 ${m.won ? 'bg-green text-on-color' : 'bg-red text-white'}`}>
                  {m.won ? 'Victoria' : 'Derrota'}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="text-[12px] text-ink-dim mt-5">Datos de deadlock-api.com · se actualizan cada 3 horas.</p>
    </div>
  );
}
