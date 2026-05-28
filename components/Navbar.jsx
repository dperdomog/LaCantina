'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import NotificationBell from '@/components/NotificationBell';

const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE ?? '#discord';

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
  const isHome = pathname === '/';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user,        setUser]        = useState(null);
  const [isAdmin,     setIsAdmin]     = useState(false);
  const [displayName, setDisplayName] = useState(null);

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

  return (
    <>
      {/* ── Main nav ── */}
      <nav className="sticky top-0 z-[100] border-b border-[rgba(241,237,229,0.08)] backdrop-blur-[12px] bg-[rgba(6,7,10,0.88)]">
        <div className="max-w-[1160px] mx-auto px-6 flex items-center h-[66px] gap-8">

          {/* Logo */}
          <a href={isHome ? '#hero' : '/'} className="shrink-0 no-underline">
            <img src="/lclogocolor.png" alt="La Cantina" className="h-[50px] w-auto" />
          </a>
          <span className="mono-label px-1.5 py-0.5 border border-[rgba(241,237,229,0.08)] hidden md:inline">
            DEADLOCK · LATAM
          </span>

          {/* Desktop links */}
          <ul className="hidden lg:flex items-center gap-6 list-none ml-4">
            {[
              ['/torneos',  'Torneos',  false],
              ['/equipos',  'Equipos',  false],
              ['/jugadores','Jugadores',false],
              [DISCORD_INVITE, 'Discord', true],
            ].map(([href, label, external]) => (
              <li key={label}>
                <a
                  href={href}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="text-ink-dim text-[13px] font-medium hover:text-ink transition-colors no-underline pb-1 border-b-2 border-transparent hover:border-yellow"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2.5">
            {user ? (
              <>
                {/* Campanita de notificaciones */}
                <NotificationBell userId={user.id} />

                <a
                  href="/profile"
                  className="flex items-center gap-2.5 no-underline group"
                >
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="avatar"
                      className="w-8 h-8 rounded-full border border-[rgba(241,237,229,0.15)] group-hover:border-yellow transition-colors"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-yellow flex items-center justify-center font-display text-[13px] text-[#0a0a0a]">
                      {(user.user_metadata?.full_name ?? user.email ?? '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="mono-label hidden md:block group-hover:text-yellow transition-colors">
                    {displayName ?? user.user_metadata?.full_name ?? user.email}
                  </span>
                </a>
                {isAdmin && (
                  <a
                    href="/admin"
                    className="mono-label text-[11px] text-yellow border border-yellow/30 bg-yellow/5 px-3 py-1.5 rounded-full hover:bg-yellow/10 transition-colors no-underline hidden md:block"
                  >
                    ⚡ Admin
                  </a>
                )}
                <button
                  onClick={handleSignOut}
                  className="text-[13px] font-medium text-ink-dim border border-[rgba(241,237,229,0.08)] px-4 py-2 rounded-full hover:border-ink-dim transition-colors"
                >
                  Salir
                </button>
              </>
            ) : (
              <button
                onClick={loginWithDiscord}
                className="text-[13px] font-bold bg-yellow text-[#0a0a0a] px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
              >
                Conectar Discord
              </button>
            )}

            {/* Hamburger */}
            <button
              className="lg:hidden flex flex-col gap-[5px] bg-transparent border-none cursor-pointer p-1 ml-1"
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Menú"
            >
              {[0, 1, 2].map(i => (
                <span key={i} className="block w-5 h-0.5 bg-ink rounded-sm" />
              ))}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden flex flex-col bg-[rgba(6,7,10,0.98)] border-t border-[rgba(241,237,229,0.08)] px-6 py-4 gap-0.5">
            {[
              ['/torneos',  'Torneos',  false],
              ['/equipos',  'Equipos',  false],
              ['/jugadores','Jugadores',false],
              [DISCORD_INVITE, 'Discord', true],
            ].map(([href, label, external]) => (
              <a
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="text-ink-dim no-underline py-3 text-[1.05rem] border-b border-[rgba(241,237,229,0.08)] hover:text-yellow transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        )}
      </nav>
    </>
  );
}
