import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Admin — La Cantina' };

export default async function AdminLayout({ children }) {
  // Reportes abiertos (si la tabla aún no existe, simplemente no muestra el número)
  const supabase = await createClient();
  const { count: openReports } = await supabase
    .from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open');

  return (
    <div className="min-h-screen">
      {/* Barra del panel admin */}
      <div className="max-w-[1180px] mx-auto px-5 pt-10 flex flex-wrap items-center gap-2">
        <span className="pill bg-yellow text-on-color">⚡ Panel admin</span>
        <a href="/admin" className="pill bg-surface text-ink no-underline hover:bg-surface-2 transition-colors">Dashboard</a>
        <a href="/admin/torneos/nuevo" className="pill bg-surface text-ink no-underline hover:bg-surface-2 transition-colors">+ Nuevo torneo</a>
        <a href="/admin/eventos" className="pill bg-surface text-ink no-underline hover:bg-surface-2 transition-colors">📅 Eventos</a>
        <a href="/admin/reportes" className={`pill no-underline transition-colors ${openReports ? 'bg-pink text-on-color' : 'bg-surface text-ink hover:bg-surface-2'}`}>
          🚩 Reportes{openReports ? ` (${openReports})` : ''}
        </a>
        <a href="/" className="ml-auto text-[13px] font-bold text-ink-dim hover:text-ink transition-colors no-underline">← Sitio público</a>
      </div>
      {children}
    </div>
  );
}
