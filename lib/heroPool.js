// Héroes elegibles en el draft: los jugables más los pendientes que un admin ya habilitó.
import { HEROES, ACTIVE_HERO_IDS, PENDING_HERO_IDS } from '@/lib/heroes';

const byName = (a, b) => HEROES[a].name.localeCompare(HEROES[b].name, 'es');

// Ids de héroes pendientes que ya salieron (según Admin → Héroes). Si la tabla no
// existe o la consulta falla, ninguno.
export async function enabledPendingHeroes(supabase) {
  if (!PENDING_HERO_IDS.length) return [];
  const { data, error } = await supabase
    .from('hero_availability').select('hero_id').eq('enabled', true).in('hero_id', PENDING_HERO_IDS);
  if (error) return [];
  return (data ?? []).map(r => r.hero_id);
}

export async function getHeroPool(supabase) {
  const extra = await enabledPendingHeroes(supabase);
  return extra.length ? [...ACTIVE_HERO_IDS, ...extra].sort(byName) : ACTIVE_HERO_IDS;
}
