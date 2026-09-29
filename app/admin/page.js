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

  // Bloqueos en una consulta aparte: si la columna aún no existe, la lista sigue cargando
  const { data: bans } = await supabase
    .from('profiles').select('id, banned_at, ban_reason').not('banned_at', 'is', null);
  const banMap = Object.fromEntries((bans ?? []).map(b => [b.id, b]));
  const playersWithBans = (players ?? []).map(p => ({
    ...p,
    banned_at:  banMap[p.id]?.banned_at ?? null,
    ban_reason: banMap[p.id]?.ban_reason ?? null,
  }));

  return <AdminDashboard tournaments={data} players={playersWithBans} />;
}
