// Estadísticas de partidas de Deadlock (deadlock-api.com) a partir del ID de StatLocker.
// Se cachean en la tabla player_stats y se refrescan cuando tienen más de 3 h.
import { accountIdFromStatlocker } from '@/lib/ranks';

const API     = 'https://api.deadlock-api.com/v1';
const STALE_MS = 3 * 3600e3;

const kda = (k, d, a) => Math.round(((k + a) / Math.max(1, d)) * 100) / 100;

async function getJson(url) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'LaCantina/1.0' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Reduce el historial y las stats por héroe a lo que muestra el perfil
export function slimStats(matchHistory, heroStats) {
  const history = Array.isArray(matchHistory) ? [...matchHistory].sort((a, b) => b.start_time - a.start_time) : [];
  const last20  = history.slice(0, 20);

  const won = m => m.match_result === m.player_team;
  const sum = (arr, f) => arr.reduce((s, m) => s + (m[f] ?? 0), 0);
  const wins = last20.filter(won).length;

  const summary = {
    matches: last20.length,
    wins,
    winrate: last20.length ? Math.round((wins / last20.length) * 100) : 0,
    kda:     kda(sum(last20, 'player_kills'), sum(last20, 'player_deaths'), sum(last20, 'player_assists')),
  };

  const recent = history.slice(0, 10).map(m => ({
    match_id:     m.match_id,
    hero_id:      m.hero_id,
    won:          won(m),
    k:            m.player_kills ?? 0,
    d:            m.player_deaths ?? 0,
    a:            m.player_assists ?? 0,
    duration_s:   m.match_duration_s ?? 0,
    start_time:   m.start_time,
    net_worth:    m.net_worth ?? 0,
    ranked_delta: m.ranked_delta ?? null,
  }));

  const heroes = (Array.isArray(heroStats) ? heroStats : [])
    .filter(h => h.matches_played > 0)
    .sort((a, b) => b.matches_played - a.matches_played)
    .slice(0, 5)
    .map(h => ({
      hero_id:     h.hero_id,
      matches:     h.matches_played,
      wins:        h.wins ?? 0,
      winrate:     Math.round(((h.wins ?? 0) / h.matches_played) * 100),
      kda:         kda(h.kills ?? 0, h.deaths ?? 0, h.assists ?? 0),
      last_played: h.last_played ?? null,
    }));

  return { summary, recent, heroes };
}

// Stats del perfil; usa el caché si tiene menos de 3 h. Nunca lanza: devuelve null si no hay datos.
export async function getPlayerStats(admin, profile) {
  try {
    const accountId = accountIdFromStatlocker(profile?.statlocker_url);
    if (!accountId) return null;

    const { data: cached, error } = await admin
      .from('player_stats')
      .select('account_id, data, fetched_at')
      .eq('profile_id', profile.id)
      .maybeSingle();
    if (error) return null; // tabla inexistente o error de la base

    const fresh = cached && Number(cached.account_id) === accountId
      && Date.now() - new Date(cached.fetched_at).getTime() < STALE_MS;
    if (fresh) return cached.data;

    const [history, heroStats] = await Promise.all([
      getJson(`${API}/players/${accountId}/match-history`),
      getJson(`${API}/players/hero-stats?account_ids=${accountId}`),
    ]);

    const sameAccountCache = cached && Number(cached.account_id) === accountId ? cached.data : null;
    if (!history || !heroStats) {
      // API caída o incompleta: se prefiere el caché viejo antes que pisarlo con datos parciales
      if (sameAccountCache) return sameAccountCache;
      if (!history && !heroStats) return null;
    }

    const data = slimStats(history, heroStats);
    await admin.from('player_stats').upsert({
      profile_id: profile.id,
      account_id: accountId,
      data,
      fetched_at: new Date().toISOString(),
    });
    return data;
  } catch {
    return null;
  }
}
