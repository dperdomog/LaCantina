import { createClient } from '@/lib/supabase/server';
import { PENDING_HERO_IDS } from '@/lib/heroes';
import { enabledPendingHeroes } from '@/lib/heroPool';
import HeroesAdmin from '@/components/admin/HeroesAdmin';

export const metadata = { title: 'Admin: Héroes — La Cantina' };

export default async function AdminHeroesPage() {
  const supabase = await createClient();
  const enabled = await enabledPendingHeroes(supabase);

  return (
    <main className="max-w-[1180px] mx-auto px-5 py-10">
      <span className="mono-label">🦸 Héroes</span>
      <h1 className="font-display text-[clamp(32px,4vw,48px)] leading-none mt-2">Héroes nuevos</h1>
      <p className="text-[16px] text-ink-dim mt-3 max-w-[640px]">
        Los héroes de un parche salen de a poco, por votación en el juego. Marca los que ya se pueden jugar
        y entran al draft con la etiqueta &quot;Nuevo&quot;.
      </p>
      <HeroesAdmin pendingIds={PENDING_HERO_IDS} initialEnabled={enabled} />
    </main>
  );
}
