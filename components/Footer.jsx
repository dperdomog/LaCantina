const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE ?? '#';
const STRIPES = ['#00d97e', '#00c8f0', '#ffd400', '#ff7043', '#ff2d2d'];

export default function Footer() {
  return (
    <footer className="bg-[#1c1c1c] text-[#f6efe2]">
      <div className="flex h-3">
        {STRIPES.map(c => <span key={c} className="flex-1" style={{ background: c }} />)}
      </div>
      <div className="max-w-[1180px] mx-auto px-5 py-12 flex flex-col md:flex-row gap-8 md:items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="La Cantina" className="h-[64px] w-auto" />
          <div>
            <p className="text-[15px] text-[#f6efe2]/70 max-w-[320px] leading-relaxed">
              La comunidad de Deadlock en español. Competimos, crecemos y nos divertimos juntos.
            </p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 font-display text-[18px]">
          {[['/torneos', 'Torneos'], ['/equipos', 'Equipos'], ['/jugadores', 'Jugadores']].map(([href, label]) => (
            <a key={href} href={href} className="text-[#f6efe2] no-underline hover:text-yellow">{label}</a>
          ))}
          <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="text-[#f6efe2] no-underline hover:text-yellow">Discord ↗</a>
        </nav>
      </div>
      <div className="max-w-[1180px] mx-auto px-5 pb-8 text-[13px] text-[#f6efe2]/45 flex flex-wrap gap-x-4 gap-y-1">
        <span>© 2026 La Cantina — Hecho con ❤️ por jugadores.</span>
        <span>No afiliada con Valve Corporation ni con Deadlock.</span>
      </div>
    </footer>
  );
}
