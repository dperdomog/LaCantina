const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE ?? '#';

export default function Footer() {
  return (
    <footer className="bg-[#0d0f15] border-t border-[rgba(241,237,229,0.08)] pt-16 pb-8">
      <div className="max-w-[1160px] mx-auto px-6 md:px-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-16 mb-12">
          {/* Brand */}
          <div>
            <a href="#hero" className="flex items-center gap-1 no-underline w-fit">
              <span className="font-display text-[1.5rem] tracking-tight text-ink">LA</span>
              <span className="text-yellow font-display text-[1.5rem]">·</span>
              <span className="font-display text-[1.5rem] tracking-tight text-ink">CANTINA</span>
            </a>
            <p className="text-ink-dim text-[13px] mt-4 max-w-[320px] leading-relaxed">
              La comunidad latinoamericana de Deadlock más activa. Competimos, crecemos y nos divertimos juntos.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-12">
            <div className="flex flex-col gap-3">
              <span className="mono-label text-ink mb-1">Navegación</span>
              {[['#about','Nosotros'],['#stats','Comunidad'],['#torneos','Torneos'],['#discord','Discord']].map(([href, label]) => (
                <a key={href} href={href} className="mono-label text-ink-dim no-underline hover:text-yellow transition-colors normal-case text-[11px]">{label}</a>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <span className="mono-label text-ink mb-1">Redes</span>
              {[
                [DISCORD_INVITE, 'Discord'],
                ['#', 'Twitter / X'],
                ['#', 'Instagram'],
                ['#', 'YouTube'],
              ].map(([href, label]) => (
                <a key={label} href={href} target={href !== '#' ? '_blank' : undefined} rel="noopener noreferrer" className="mono-label text-ink-dim no-underline hover:text-yellow transition-colors normal-case text-[11px]">{label}</a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-[rgba(241,237,229,0.08)] pt-7 text-center">
          <p className="mono-label text-[10px] normal-case">© 2026 La Cantina — Comunidad Deadlock LATAM. Hecho con ❤️ por jugadores.</p>
          <p className="mono-label text-[10px] normal-case opacity-40 mt-1.5">La Cantina no está afiliada con Valve Corporation ni con Deadlock.</p>
        </div>
      </div>
    </footer>
  );
}
