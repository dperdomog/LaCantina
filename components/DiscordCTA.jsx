'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const DISCORD_INVITE    = process.env.NEXT_PUBLIC_DISCORD_INVITE ?? '#';
const DISCORD_GUILD_ID  = '783488890026852352';

const DISCORD_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.079.111 18.1.13 18.113a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
  </svg>
);

const PERKS = [
  'Anuncios de torneos en tiempo real',
  'Canales de LFG (buscar equipo) por país',
  'Estrategias y análisis con la comunidad',
  'Perfil de jugador vinculado a tu cuenta',
];

export default function DiscordCTA() {
  const [user,     setUser]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [discord,  setDiscord]  = useState({ members: 0, online: 0, guild_id: null });

  useEffect(() => {
    // Datos de Discord (miembros, online, guild_id)
    fetch('/api/discord')
      .then(r => r.json())
      .then(setDiscord)
      .catch(() => {});

    // Auth
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    // Reveal
    const section = document.getElementById('discord');
    if (section) {
      const els = section.querySelectorAll('.reveal');
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
      }, { threshold: 0.1 });
      els.forEach(el => obs.observe(el));
      return () => { subscription.unsubscribe(); obs.disconnect(); };
    }
    return () => subscription.unsubscribe();
  }, []);

  async function handleConnect() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: `${window.location.origin}/auth/callback`, scopes: 'identify email' },
    });
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }

  const membersStr = discord.members ? discord.members.toLocaleString('es-MX') : '…';
  const onlineStr  = discord.online  ? discord.online.toLocaleString('es-MX')  : '…';

  return (
    <section id="discord" className="relative py-24 px-6 md:px-14 overflow-hidden bg-[#0d0f15]">
      {/* Glows */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-50">
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(255,214,10,0.14),transparent_60%)]" />
        <div className="absolute -bottom-24 right-[10%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(127,227,255,0.08),transparent_60%)]" />
      </div>

      <div className="relative z-10 max-w-[1160px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-16 items-start">

          {/* Left */}
          <div className="reveal">
            <span className="mono-label text-yellow">// UNITE A LA COMUNIDAD</span>
            <h2 className="font-display text-[clamp(48px,6vw,80px)] leading-[0.9] mt-3 text-ink">
              PASA,<br /><span className="gradient-text">ESTAMOS</span><br />EN ALGO.
            </h2>
            <p className="text-ink-dim text-[16px] mt-5 mb-7 max-w-[480px] leading-relaxed">
              <span className="text-ink font-semibold">{membersStr} jugadores</span>, con{' '}
              <span className="text-green font-semibold">{onlineStr} en línea ahora mismo</span>.
              Conectá tu Discord y armá equipo en menos de 5 minutos.
            </p>
            {/* Botones auth */}
            {user ? (
              <div className="flex flex-col gap-3 max-w-[360px]">
                <div className="p-3 bg-green/10 border border-green/30 rounded-xl">
                  <span className="mono-label text-green">
                    ✓ Conectado como {user.user_metadata?.full_name ?? user.email}
                  </span>
                </div>
                <a
                  href={DISCORD_INVITE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-full bg-[#5865f2] text-white font-bold text-[14px] hover:-translate-y-0.5 transition-all no-underline"
                >
                  {DISCORD_ICON} Abrir Discord ↗
                </a>
                <button
                  onClick={handleSignOut}
                  className="w-full py-3 rounded-full border border-[rgba(241,237,229,0.08)] text-ink-dim text-[13px] hover:border-ink-dim transition-colors"
                >
                  Desconectar cuenta
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-w-[360px]">
                <button
                  onClick={handleConnect}
                  disabled={loading}
                  className="flex items-center justify-center gap-2.5 w-full px-5 py-4 rounded-full bg-yellow text-[#0a0a0a] font-bold text-[15px] shadow-yellow-btn hover:-translate-y-0.5 transition-all disabled:opacity-60"
                >
                  {DISCORD_ICON}
                  {loading ? 'Conectando…' : 'Conectar con Discord →'}
                </button>
                <a
                  href={DISCORD_INVITE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-full bg-[#5865f2]/10 border border-[#5865f2]/40 text-[#7b8fff] font-semibold text-[14px] hover:bg-[#5865f2]/20 transition-all no-underline"
                >
                  {DISCORD_ICON} Entrar al servidor Discord
                </a>
                <p className="text-center mono-label text-[10px] mt-1">
                  Sin contraseñas. Tu perfil de Discord se vincula automáticamente.
                </p>
              </div>
            )}
          </div>

          {/* Right — Discord Widget */}
          <div className="reveal flex flex-col gap-3">
            <iframe
              src={`https://discord.com/widget?id=${DISCORD_GUILD_ID}&theme=dark`}
              width="100%"
              height="500"
              allowTransparency="true"
              frameBorder="0"
              className="rounded-[16px] overflow-hidden"
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
              title="Discord — La Cantina"
            />
            <p className="mono-label text-[10px] text-ink-dim text-center">
              Widget oficial de Discord · Miembros en línea en tiempo real
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
