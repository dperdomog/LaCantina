// Rangos de Deadlock (datos de deadlock-api.com a partir del ID de StatLocker)
// badge = tier * 10 + subrango (ej. 84 = Oracle 4). 0 = sin rango.

const TIERS = [
  ['Obscurus', '#333333'], ['Initiate', '#6A3E1E'], ['Seeker', '#882355'], ['Acolyte', '#5C6DAB'],
  ['Sentinel', '#719C47'], ['Mystic', '#DDA326'], ['Ritualist', '#EE4F57'], ['Emissary', '#B47FEB'],
  ['Oracle', '#955138'], ['Phantom', '#7C7C7C'], ['Ascendant', '#C39751'], ['Eternus', '#5CE9A9'],
];

export const RANK_TIER_NAMES = TIERS.map(([n]) => n);

const tierImage = tier =>
  `https://assets-bucket.deadlock-api.com/assets-api-res/images/ranks/rank${String(tier).padStart(2, '0')}_lg.webp`;

// Nombre, color e imagen de un badge; null si no hay dato
export function rankInfo(badge) {
  if (badge == null) return null;
  const tier = Math.floor(badge / 10);
  const sub  = badge % 10;
  if (tier <= 0 || tier >= TIERS.length) return { badge: 0, tier: 0, sub: 0, name: 'Sin rango', color: TIERS[0][1], image: tierImage(0) };
  return { badge, tier, sub, name: `${TIERS[tier][0]} ${sub}`, tierName: TIERS[tier][0], color: TIERS[tier][1], image: tierImage(tier) };
}

// Opciones para selects de "rango mínimo" (por tier)
export const RANK_OPTIONS = TIERS.slice(1).map(([name], i) => ({ value: (i + 1) * 10 + 1, label: `${name}+` }));

// https://statlocker.gg/profile/158311257 → 158311257 (account id de Steam)
export function accountIdFromStatlocker(url) {
  const m = url?.match(/statlocker\.gg\/profile\/(\d+)/);
  return m ? Number(m[1]) : null;
}

// Consulta en lote: Map(accountId → badge). Si falla devuelve un Map vacío.
export async function fetchRanks(accountIds) {
  const ids = [...new Set(accountIds.filter(Boolean))];
  const out = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    try {
      const res = await fetch(`https://api.deadlock-api.com/v1/players/rank?account_ids=${ids.slice(i, i + 50).join(',')}`,
        { signal: ctrl.signal, headers: { 'User-Agent': 'LaCantina/1.0' } });
      if (!res.ok) continue;
      for (const r of await res.json()) out.set(Number(r.account_id), r.badge ?? 0);
    } catch {
      // API caída o límite alcanzado: se conserva el rango anterior
    } finally {
      clearTimeout(timer);
    }
  }
  return out;
}

const STALE_MS = 6 * 3600e3;

// Refresca (con el cliente admin) los perfiles cuyo rango tenga más de 6 h.
// Recibe perfiles con { id, statlocker_url, rank_badge, rank_updated_at } y
// devuelve los mismos perfiles con rank_badge actualizado.
export async function refreshStaleRanks(admin, profiles) {
  const stale = profiles.filter(p =>
    accountIdFromStatlocker(p.statlocker_url) &&
    (!p.rank_updated_at || Date.now() - new Date(p.rank_updated_at) > STALE_MS));
  if (stale.length === 0) return profiles;

  const ranks = await fetchRanks(stale.map(p => accountIdFromStatlocker(p.statlocker_url)));
  if (ranks.size === 0) return profiles;

  const now = new Date().toISOString();
  const updated = new Map();
  await Promise.all(stale.map(async p => {
    const badge = ranks.get(accountIdFromStatlocker(p.statlocker_url));
    if (badge === undefined) return; // cuenta privada: se deja como estaba
    updated.set(p.id, badge);
    await admin.from('profiles')
      .update({ rank_badge: badge, deadlock_rank: rankInfo(badge).name, rank_updated_at: now })
      .eq('id', p.id);
  }));
  return profiles.map(p => (updated.has(p.id) ? { ...p, rank_badge: updated.get(p.id), rank_updated_at: now } : p));
}
