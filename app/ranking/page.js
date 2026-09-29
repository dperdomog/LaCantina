import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { refreshStaleRanks, rankInfo } from '@/lib/ranks';
import { countryInfo } from '@/lib/countries';

const description = 'Los jugadores y equipos de La Cantina ordenados por su rango real en Deadlock.';
export const metadata = {
  title: 'Ranking — La Cantina',
  description,
  openGraph: { title: 'Ranking — La Cantina', description, images: ['/og.png'] },
};

// Promedio en escala lineal (6 subrangos por tier) y de vuelta a badge
const toLinear   = badge => Math.floor(badge / 10) * 6 + ((badge % 10) - 1);
const fromLinear = v => { const r = Math.round(v); return Math.floor(r / 6) * 10 + (r % 6) + 1; };

function Avatar({ src, name }) {
  return src
    ? <img src={src} alt="" className="w-11 h-11 rounded-full border-[3px] border-line object-cover shrink-0" />
    : <span className="w-11 h-11 rounded-full border-[3px] border-line bg-yellow font-display text-on-color inline-flex items-center justify-center shrink-0">
        {(name ?? '?')[0].toUpperCase()}
      </span>;
}

function Rank({ badge }) {
  const r = rankInfo(badge);
  return (
    <span className="inline-flex items-center gap-2 shrink-0">
      <img src={r.image} alt={r.name} className="w-9 h-9 object-contain" />
      <span className="font-display text-[13px] sm:text-[16px] whitespace-nowrap">{r.name}</span>
    </span>
  );
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default async function RankingPage() {
  const supabase = await createClient();

  const [{ data: found }, { data: memberships }] = await Promise.all([
    supabase.from('profiles')
      .select('id, display_name, discord_username, avatar_url, country, statlocker_url, rank_badge, rank_updated_at')
      .not('statlocker_url', 'is', null),
    supabase.from('team_members').select('user_id, teams(id, name, slug, logo_url)'),
  ]);

  // Refresca hasta 50 rangos viejos (los más antiguos primero); si falla, quedan los guardados
  let profiles = found ?? [];
  const oldest = [...profiles]
    .sort((a, b) => new Date(a.rank_updated_at ?? 0) - new Date(b.rank_updated_at ?? 0))
    .slice(0, 50);
  try {
    const refreshed = new Map((await refreshStaleRanks(createAdminClient(), oldest)).map(p => [p.id, p]));
    profiles = profiles.map(p => refreshed.get(p.id) ?? p);
  } catch {}

  const teamByUser = {};
  for (const m of memberships ?? []) if (m.teams) teamByUser[m.user_id] = m.teams;

  const ranked   = profiles.filter(p => p.rank_badge > 0).sort((a, b) => b.rank_badge - a.rank_badge);
  const unranked = profiles.length - ranked.length;

  // Equipos: promedio de los miembros con rango
  const teamAgg = {};
  for (const p of ranked) {
    const t = teamByUser[p.id];
    if (!t) continue;
    (teamAgg[t.id] ??= { team: t, values: [] }).values.push(toLinear(p.rank_badge));
  }
  const teams = Object.values(teamAgg)
    .map(({ team, values }) => ({ team, count: values.length, avg: values.reduce((a, b) => a + b, 0) / values.length }))
    .sort((a, b) => b.avg - a.avg);

  return (
    <main className="max-w-[1000px] mx-auto px-5 py-14 md:py-20">
      <span className="mono-label">📊 Ranking</span>
      <h1 className="font-display text-[clamp(40px,6vw,68px)] leading-[1] tracking-[-0.02em] mt-2">
        Los mejores de{' '}
        <mark className="bg-yellow text-on-color px-3 rounded-2xl border-[3px] border-line inline-block -rotate-2">la cantina</mark>
      </h1>
      <p className="text-[18px] text-ink-dim mt-4 max-w-[620px]">
        Rango real de Deadlock según StatLocker, actualizado cada pocas horas.
        {unranked > 0 && ` ${unranked} ${unranked === 1 ? 'jugador vinculado todavía no tiene' : 'jugadores vinculados todavía no tienen'} rango.`}
      </p>

      {ranked.length === 0 ? (
        <div className="sticker p-10 text-center mt-10">
          <p className="font-display text-[26px]">Todavía no hay nadie en el ranking.</p>
          <p className="text-ink-dim mt-2 max-w-[460px] mx-auto">
            Vincula tu perfil de StatLocker y tu rango aparece aquí automáticamente.
          </p>
          <a href="/onboarding" className="btn btn-primary mt-6">Vincular StatLocker →</a>
        </div>
      ) : (
        <>
          {/* Jugadores */}
          <section className="mt-10">
            <h2 className="font-display text-[28px] mb-4">Jugadores</h2>
            <ol className="sticker divide-y-[3px] divide-line overflow-hidden">
              {ranked.map((p, i) => {
                const name    = p.display_name ?? p.discord_username ?? 'Jugador';
                const team    = teamByUser[p.id];
                const country = countryInfo(p.country);
                return (
                  <li key={p.id} className={i < 3 ? 'bg-yellow/15' : ''}>
                    <a href={`/jugador/${p.id}`} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 no-underline text-ink hover:bg-surface-2 transition-colors">
                      <span className="font-display text-[20px] w-9 text-center shrink-0">{MEDALS[i] ?? i + 1}</span>
                      <Avatar src={p.avatar_url} name={name} />
                      <span className="min-w-0 flex-1">
                        <span className="font-display text-[18px] block truncate">
                          {country && <span title={country.name}>{country.flag} </span>}{name}
                        </span>
                        <span className="text-[13px] text-ink-dim block truncate">
                          {team ? `🛡️ ${team.name}` : 'Free agent'}
                        </span>
                      </span>
                      <Rank badge={p.rank_badge} />
                    </a>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Equipos */}
          {teams.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-[28px] mb-1">Equipos</h2>
              <p className="text-[14px] text-ink-dim mb-4">Promedio del rango de sus miembros con StatLocker vinculado.</p>
              <ol className="sticker divide-y-[3px] divide-line overflow-hidden">
                {teams.map(({ team, count, avg }, i) => (
                  <li key={team.id}>
                    <a href={`/equipos/${team.slug ?? team.id}`} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 no-underline text-ink hover:bg-surface-2 transition-colors">
                      <span className="font-display text-[20px] w-9 text-center shrink-0">{MEDALS[i] ?? i + 1}</span>
                      {team.logo_url
                        ? <img src={team.logo_url} alt="" className="w-11 h-11 rounded-xl border-[3px] border-line object-cover shrink-0" />
                        : <span className="w-11 h-11 rounded-xl border-[3px] border-line bg-cyan font-display text-on-color inline-flex items-center justify-center shrink-0">
                            {team.name[0].toUpperCase()}
                          </span>}
                      <span className="min-w-0 flex-1">
                        <span className="font-display text-[18px] block truncate">{team.name}</span>
                        <span className="text-[13px] text-ink-dim">{count} {count === 1 ? 'jugador con rango' : 'jugadores con rango'}</span>
                      </span>
                      <Rank badge={fromLinear(avg)} />
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <p className="text-[14px] text-ink-dim mt-8">
            ¿No apareces? <a href="/profile" className="text-ink underline decoration-[3px] underline-offset-4">Vincula tu StatLocker desde tu perfil</a>.
          </p>
        </>
      )}
    </main>
  );
}
