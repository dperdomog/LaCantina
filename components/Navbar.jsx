'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';

const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE ?? '#discord';

const LINKS = [
  ['/torneos',   'Torneos'],
  ['/equipos',   'Equipos'],
  ['/jugadores', 'Jugadores'],
  ['/tablon',    'Tablón'],
  ['/ranking',   'Ranking'],
];

// Agrupadas en "Herramientas" para que la barra entre en pantallas de 1280 px
const TOOLS = [
  ['/draft',      '🎯 Draft'],
  ['/mapa',       '🗺️ Mapa de coaching'],
  ['/calendario', '📅 Calendario'],
];

async function loginWithDiscord() {
  const supabase = createClient();
  await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: 'identify email',
    },
  });
}

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user,        setUser]        = useState(null);
  const [isAdmin,     setIsAdmin]     = useState(false);
  const [displayName, setDisplayName] = useState(null);
  const [toolsOpen,   setToolsOpen]   = useState(false);
  const toolsRef = useRef(null);

  // Cerrar el menú de herramientas al hacer clic afuera o con Escape
  useEffect(() => {
    if (!toolsOpen) return;
    const onClick = e => { if (!toolsRef.current?.contains(e.target)) setToolsOpen(false); };
    const onKey   = e => { if (e.key === 'Escape') setToolsOpen(false); };
    document.addEventListener('pointerdown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onClick); document.removeEventListener('keydown', onKey); };
  }, [toolsOpen]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data?.user ?? null;
      setUser(u);
      if (u) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin, display_name')
          .eq('id', u.id)
          .single();
        setIsAdmin(profile?.is_admin ?? false);
        setDisplayName(profile?.display_name ?? null);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setIsAdmin(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }

  const isActive  = href => pathname.startsWith(href);
  const toolActive = TOOLS.some(([href]) => isActive(href));
  const pillClass = active => `font-display text-[16px] px-3 py-1.5 rounded-full no-underline transition-colors ${
    active ? 'bg-ink text-bg' : 'text-ink hover:bg-ink hover:text-bg'
  }`;
  const external = { target: '_blank', rel: 'noopener noreferrer' };

  return (
    <nav className="sticky top-0 z-[100] bg-bg/95 backdrop-blur-[10px] border-b-[3px] border-line">
      <div className="max-w-[1180px] mx-auto px-5 flex items-center h-[64px] md:h-[72px] gap-3">

        {/* Logo: sticker que cuelga del borde */}
        <a href="/" aria-label="La Cantina — inicio" className="logo-bend shrink-0 self-start mt-1 relative z-10 no-underline">
          <img src="/logo.png" alt="La Cantina" className="h-[72px] md:h-[92px] w-auto" />
        </a>

        {/* Links (escritorio) */}
        <ul className="hidden xl:flex items-center gap-0.5 list-none ml-5">
          {LINKS.map(([href, label]) => (
            <li key={href}><a href={href} className={pillClass(isActive(href))}>{label}</a></li>
          ))}
          <li ref={toolsRef} className="relative">
            <button type="button" onClick={() => setToolsOpen(o => !o)} aria-expanded={toolsOpen} aria-haspopup="true"
              className={`${pillClass(toolActive || toolsOpen)} inline-flex items-center gap-1`}>
              Herramientas <span className={`text-[11px] transition-transform ${toolsOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {toolsOpen && (
              <div className="sticker absolute left-0 top-[calc(100%+10px)] p-2 min-w-[230px] flex flex-col gap-1 z-[200]">
                {TOOLS.map(([href, label]) => (
                  <a key={href} href={href} onClick={() => setToolsOpen(false)}
                    className={`font-display text-[16px] px-3 py-2 rounded-xl no-underline transition-colors ${
                      isActive(href) ? 'bg-ink text-bg' : 'text-ink hover:bg-surface-2'
                    }`}>
                    {label}
                  </a>
                ))}
              </div>
            )}
          </li>
          <li><a href={DISCORD_INVITE} {...external} className={pillClass(false)}>Discord ↗</a></li>
        </ul>

        {/* Acciones */}
        <div className="ml-auto flex items-center gap-2.5">
          <ThemeToggle />
          {user ? (
            <>
              <NotificationBell userId={user.id} />
              <a href="/profile" className="flex items-center gap-2 no-underline group">
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="avatar"
                    className="w-10 h-10 rounded-full border-[3px] border-line shadow-sticker-sm group-hover:-translate-y-0.5 transition-transform" />
                ) : (
                  <div className="w-10 h-10 rounded-full border-[3px] border-line bg-yellow flex items-center justify-center font-display text-[15px] text-on-color">
                    {(user.user_metadata?.full_name ?? user.email ?? '?')[0].toUpperCase()}
                  </div>
                )}
                <span className="font-display text-[16px] text-ink hidden md:block max-w-[140px] truncate group-hover:underline">
                  {displayName ?? user.user_metadata?.full_name ?? user.email}
                </span>
              </a>
              {isAdmin && (
                <a href="/admin" className="pill bg-yellow text-on-color no-underline hidden md:inline-flex">⚡ Admin</a>
              )}
              <button onClick={handleSignOut} className="btn btn-secondary btn-sm hidden sm:inline-flex">Salir</button>
            </>
          ) : (
            <button onClick={loginWithDiscord} className="btn btn-discord btn-sm whitespace-nowrap">
              <span className="sm:hidden">Entrar</span><span className="hidden sm:inline">Conectar Discord</span>
            </button>
          )}

          {/* Menú móvil */}
          <button
            className="xl:hidden w-10 h-10 rounded-full border-[3px] border-line bg-surface shadow-sticker-sm flex flex-col items-center justify-center gap-[4px]"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Menú"
            aria-expanded={mobileOpen}
          >
            {[0, 1, 2].map(i => <span key={i} className="block w-4 h-[2.5px] bg-ink rounded-sm" />)}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="xl:hidden border-t-[3px] border-line bg-bg px-5 pt-8 pb-5 flex flex-col gap-2">
          {[...LINKS, ...TOOLS].map(([href, label]) => (
            <a key={href} href={href} onClick={() => setMobileOpen(false)}
              className={`font-display text-[22px] px-4 py-2 rounded-2xl no-underline border-[3px] ${
                isActive(href) ? 'bg-ink text-bg border-line' : 'text-ink border-transparent hover:border-line'
              }`}>
              {label}
            </a>
          ))}
          <a href={DISCORD_INVITE} {...external} onClick={() => setMobileOpen(false)}
            className="font-display text-[22px] px-4 py-2 rounded-2xl no-underline border-[3px] text-ink border-transparent hover:border-line">
            Discord ↗
          </a>
          {user && (
            <button onClick={handleSignOut} className="btn btn-secondary btn-sm self-start mt-2 sm:hidden">Salir</button>
          )}
        </div>
      )}
    </nav>
  );
}
