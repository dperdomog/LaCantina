import { createClient } from '@/lib/supabase/server';
import Torneos from '@/components/Torneos';

export const metadata = { title: 'Torneos — La Cantina' };

export default async function TorneosPage() {
  const supabase = await createClient();

  const { data: torneos } = await supabase
    .from('tournaments')
    .select('id, name, format, date_display, time_display, status, max_slots, prize, region, featured')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false });

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
    <main className="min-h-screen bg-[#06070a]">
      <Torneos torneos={torneosConCupos} />
    </main>
  );
}
