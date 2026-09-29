import { createClient } from '@/lib/supabase/server';
import ReportesAdmin from '@/components/admin/ReportesAdmin';

export const metadata = { title: 'Reportes — Admin — La Cantina' };

const REPORT_FIELDS = `
  id, target_type, target_id, reason, details, snapshot, status, created_at, resolved_at,
  reporter:profiles!reports_reporter_id_fkey (id, display_name, discord_username)
`;

// Agrupa reportes por objetivo (tipo + id), del más reciente al más antiguo
function groupByTarget(reports) {
  const groups = new Map();
  for (const r of reports) {
    const key = `${r.target_type}:${r.target_id}`;
    if (!groups.has(key)) groups.set(key, { key, target_type: r.target_type, target_id: r.target_id, reports: [] });
    groups.get(key).reports.push(r);
  }
  return [...groups.values()];
}

export default async function ReportesPage() {
  const supabase = await createClient();

  const [openRes, closedRes] = await Promise.all([
    supabase.from('reports').select(REPORT_FIELDS).eq('status', 'open').order('created_at', { ascending: false }),
    supabase.from('reports').select(REPORT_FIELDS).neq('status', 'open').order('resolved_at', { ascending: false }).limit(50),
  ]);

  const open   = openRes.data ?? [];
  const closed = closedRes.data ?? [];
  const all    = [...open, ...closed];

  // Estado actual de lo reportado: ¿sigue la publicación? ¿cómo está el perfil?
  const postIds    = [...new Set(all.filter(r => r.target_type === 'post').map(r => r.target_id))];
  const profileIds = [...new Set(all.filter(r => r.target_type === 'profile').map(r => r.target_id))];
  const authorIds  = [...new Set(all.filter(r => r.target_type === 'post').map(r => r.snapshot?.author_id).filter(Boolean))];

  const [postsRes, profilesRes] = await Promise.all([
    postIds.length
      ? supabase.from('lfg_posts').select('id, message').in('id', postIds)
      : Promise.resolve({ data: [] }),
    profileIds.length || authorIds.length
      ? supabase.from('profiles')
          .select('id, display_name, discord_username, avatar_url, custom_banner_url, banner_url, banned_at, ban_reason, is_admin')
          .in('id', [...new Set([...profileIds, ...authorIds])])
      : Promise.resolve({ data: [] }),
  ]);

  const posts    = Object.fromEntries((postsRes.data ?? []).map(p => [p.id, p]));
  const profiles = Object.fromEntries((profilesRes.data ?? []).map(p => [p.id, p]));

  const withState = g => ({
    ...g,
    post:    g.target_type === 'post' ? posts[g.target_id] ?? null : null,
    // Perfil afectado: el reportado, o el autor de la publicación
    profile: profiles[g.target_type === 'profile' ? g.target_id : g.reports[0]?.snapshot?.author_id] ?? null,
  });

  return (
    <main className="max-w-[1180px] mx-auto px-5 py-10">
      <span className="mono-label">🚩 Moderación</span>
      <h1 className="font-display text-[clamp(32px,4vw,48px)] leading-[1.05] mt-1">Reportes</h1>
      <p className="text-ink-dim text-[15px] mt-2 max-w-[640px]">
        Lo que la comunidad reportó en el tablón y en perfiles. Resolver o descartar cierra todos los reportes del mismo objetivo.
      </p>

      {openRes.error ? (
        <div className="sticker p-6 mt-8">
          <p className="font-display text-[20px]">No se pudieron cargar los reportes.</p>
          <p className="text-ink-dim text-[14px] mt-1">
            Si todavía no corriste la migración <code>supabase/migrations/20260929_moderacion_stats.sql</code>, córrela en el SQL Editor de Supabase.
          </p>
        </div>
      ) : (
        <ReportesAdmin
          openGroups={groupByTarget(open).map(withState)}
          closedGroups={groupByTarget(closed).map(withState)}
        />
      )}
    </main>
  );
}
