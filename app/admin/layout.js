export const metadata = { title: 'Admin — La Cantina' };

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen">
      {/* Admin topbar */}
      <div className="sticky top-[66px] z-50 bg-[rgba(255,214,10,0.08)] border-b border-yellow/20 px-6 py-2 flex items-center gap-3">
        <span className="mono-label text-yellow text-[10px]">⚡ ADMIN PANEL</span>
        <span className="text-[rgba(241,237,229,0.2)] text-[10px]">·</span>
        <a href="/admin" className="mono-label text-[10px] text-ink-dim hover:text-yellow transition-colors no-underline">Dashboard</a>
        <span className="text-[rgba(241,237,229,0.2)] text-[10px]">·</span>
        <a href="/admin/torneos/nuevo" className="mono-label text-[10px] text-ink-dim hover:text-yellow transition-colors no-underline">+ Nuevo torneo</a>
        <a href="/" className="ml-auto mono-label text-[10px] text-ink-faint hover:text-ink transition-colors no-underline">← Sitio público</a>
      </div>
      {children}
    </div>
  );
}
