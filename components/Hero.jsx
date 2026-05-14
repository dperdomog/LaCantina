'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const TwitchCarousel = dynamic(() => import('@/components/TwitchCarousel'), { ssr: false });

const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE ?? '#discord';

const DISCORD_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.079.111 18.1.13 18.113a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
  </svg>
);

export default function Hero() {
  const particlesRef = useRef(null);
  const memberRef    = useRef(null);
  const onlineRef    = useRef(null);
  const animated     = useRef(false);
  const [discord, setDiscord] = useState({ members: 0, online: 0 });

  // Fetch datos reales de Discord
  useEffect(() => {
    fetch('/api/discord')
      .then(r => r.json())
      .then(data => setDiscord(data))
      .catch(() => {});
  }, []);

  /* Particles */
  useEffect(() => {
    const el = particlesRef.current;
    if (!el) return;
    for (let i = 0; i < 24; i++) {
      const p = document.createElement('div');
      const s = Math.random() * 3 + 1;
      Object.assign(p.style, {
        position:    'absolute',
        left:        Math.random() * 100 + '%',
        bottom:      '-10px',
        width:       s + 'px',
        height:      s + 'px',
        borderRadius:'50%',
        background:  Math.random() > .5 ? '#ffd60a' : '#7fe3ff',
        opacity:     (Math.random() * .35 + .08).toFixed(2),
        animation:   `particleRise ${Math.random() * 10 + 8}s ${Math.random() * 8}s linear infinite`,
        pointerEvents:'none',
      });
      el.appendChild(p);
    }
    const style = document.createElement('style');
    style.textContent = `@keyframes particleRise { from { transform:translateY(0) scale(1); opacity:.25; } to { transform:translateY(-110vh) scale(.5); opacity:0; } }`;
    document.head.appendChild(style);
  }, []);

  /* Counter */
  function animateNum(el, target) {
    if (!el || !target) return;
    const dur = 1800, start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.floor(ease * target).toLocaleString('es-MX');
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = target.toLocaleString('es-MX');
    };
    requestAnimationFrame(tick);
  }

  // Animar cuando tengamos los datos de Discord y el statbar sea visible
  useEffect(() => {
    if (!discord.members && !discord.online) return;
    const statBar = document.getElementById('hero-statbar');
    if (!statBar) return;
    animated.current = false; // resetear para reanimar con datos reales
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated.current) {
        animated.current = true;
        animateNum(memberRef.current, discord.members);
        animateNum(onlineRef.current, discord.online);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(statBar);
    return () => obs.disconnect();
  }, [discord]);

  return (
    <section
      id="hero"
      className="relative min-h-svh flex flex-col justify-center overflow-hidden pt-16 pb-0 px-6 md:px-14"
    >
      {/* Glows */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-40 -right-48 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(255,214,10,0.16),transparent_60%)] blur-[1px]" />
        <div className="absolute -bottom-64 -left-44 w-[640px] h-[640px] rounded-full bg-[radial-gradient(circle,rgba(127,227,255,0.07),transparent_60%)]" />
        <div ref={particlesRef} className="absolute inset-0 overflow-hidden" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[1160px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[8fr_4fr] gap-14 items-center">
        {/* Left */}
        <div>
          <div className="flex items-center gap-3 animate-fade-up">
            <span className="pill bg-green text-[#0a0a0a]">
              <span className="dot-live" style={{ background: '#fff' }} />
              COMUNIDAD ACTIVA
            </span>
          </div>

          <h1 className="font-display text-[clamp(48px,7.5vw,108px)] leading-[0.88] tracking-[-0.01em] mt-6 mb-0 animate-fade-up-1">
            <span className="block text-ink">EL HOGAR</span>
            <span className="block text-ink">DEL DEADLOCK</span>
            <span className="block text-yellow" style={{ textShadow: '0 0 32px rgba(255,214,10,0.4)' }}>
              EN ESPAÑOL.
            </span>
          </h1>

          <p className="text-[clamp(16px,2vw,18px)] text-ink-dim max-w-[600px] mt-6 leading-[1.55] animate-fade-up-2">
            Discord activo 24/7, torneos cada semana, liga oficial con playoffs en LATAM y la base de datos más completa de jugadores de la región. Gratis, en español, para siempre.
          </p>

          <div className="flex gap-3 mt-7 flex-wrap animate-fade-up-3">
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-full bg-yellow text-[#0a0a0a] font-bold text-[15px] shadow-yellow-btn hover:opacity-90 hover:-translate-y-0.5 transition-all no-underline"
            >
              {DISCORD_ICON}
              Unirse al Discord ↗
            </a>
            <a
              href="/torneos"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-full bg-white/[.04] border border-[rgba(241,237,229,0.08)] text-ink text-[15px] font-medium hover:bg-white/[.08] transition-all no-underline"
            >
              Ver Torneos
            </a>
          </div>
        </div>

        {/* Twitch carousel */}
        <TwitchCarousel />
      </div>

      {/* Stat bar */}
      <div
        id="hero-statbar"
        className="relative z-10 mt-16 max-w-[1160px] mx-auto w-full grid grid-cols-2 border-t border-b border-[rgba(241,237,229,0.08)]"
      >
        <div className="py-7 px-6">
          <div ref={memberRef} className="font-display text-[clamp(36px,4.5vw,60px)] leading-none text-ink">
            {discord.members ? discord.members.toLocaleString('es-MX') : '—'}
          </div>
          <span className="mono-label mt-2 block">miembros</span>
        </div>
        <div className="py-7 px-6 border-l border-[rgba(241,237,229,0.08)]">
          <div ref={onlineRef} className="font-display text-[clamp(36px,4.5vw,60px)] leading-none text-green">
            {discord.online ? discord.online.toLocaleString('es-MX') : '—'}
          </div>
          <span className="mono-label mt-2 block flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
            en línea ahora
          </span>
        </div>
      </div>
    </section>
  );
}
