import { createClient } from '@/lib/supabase/server';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, format, status, max_slots, featured, created_at')
    .order('created_at', { ascending: false });

  // Contar registrations por torneo
  const { data: regCounts } = await supabase
    .from('registrations')
    .select('tournament_id');

  const countMap = {};
  for (const r of regCounts ?? []) {
    countMap[r.tournament_id] = (countMap[r.tournament_id] ?? 0) + 1;
  }

  const data = (tournaments ?? []).map(t => ({
    ...t,
    registrations: countMap[t.id] ?? 0,
  }));

  const { data: players } = await supabase
    .from('profiles')
    .select('id, display_name, discord_username, statlocker_url, created_at, is_admin')
    .order('created_at', { ascending: false });

  return <AdminDashboard tournaments={data} players={players ?? []} />;
}
