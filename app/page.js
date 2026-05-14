import { createClient } from '@/lib/supabase/server';
import Hero       from '@/components/Hero';
import About      from '@/components/About';
import Stats      from '@/components/Stats';
import Torneos    from '@/components/Torneos';
import DiscordCTA from '@/components/DiscordCTA';
import Footer     from '@/components/Footer';

export default async function Home() {
  const supabase = await createClient();

  const { data: torneos } = await supabase
    .from('tournaments')
    .select('id, name, format, date_display, time_display, status, max_slots, prize, region, featured')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false });

  // Contar inscripciones reales por torneo
  const { data: regCounts } = await supabase
    .from('registrations')
    .select('tournament_id');

  const countMap = {};
  for (const r of regCounts ?? []) {
    countMap[r.tournament_id] = (countMap[r.tournament_id] ?? 0) + 1;
  }

  const torneosConCupos = (torneos ?? []).map(t => ({
    ...t,
    filled: countMap[t.id] ?? 0,
  }));

  return (
    <>
      <main>
        <Hero />
        <About />
        <Stats />
        <Torneos torneos={torneosConCupos} />
        <DiscordCTA />
      </main>
      <Footer />
    </>
  );
}
