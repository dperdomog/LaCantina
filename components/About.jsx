'use client';

import { useEffect } from 'react';

const FEATURES = [
  {
    icon: '✦',
    title: 'Torneos Regulares',
    body: 'Competencias semanales y mensuales para todos los niveles. Tanto si sos nuevo como si ya sos veterano, hay un torneo para vos.',
  },
  {
    icon: '◆',
    title: 'Discord 24/7',
    body: 'Chat activo todos los días. Encontrá compañeros de equipo, analizá partidas y mejorá tu juego con la comunidad.',
  },
  {
    icon: '◇',
    title: 'Inscripciones Fáciles',
    body: 'Conectá tu Discord, elegí el torneo y listo. Sin formularios, sin burocracia. Todo integrado con tu perfil de jugador.',
  },
  {
    icon: '✱',
    title: 'Toda LATAM',
    body: 'Jugadores de Argentina, Chile, México, Colombia, Brasil y más. La escena más grande de Deadlock en Latinoamérica.',
  },
];

export default function About() {
  useEffect(() => {
    const section = document.getElementById('about');
    if (!section) return;
    const els = section.querySelectorAll('.reveal');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <section id="about" className="py-24 px-6 md:px-14">
      <div className="max-w-[1160px] mx-auto">
        {/* Header */}
        <div className="text-center max-w-[640px] mx-auto mb-16 reveal">
          <img src="/lclogobarras.png" alt="La Cantina" className="h-20 w-auto mx-auto mb-6" />
          <span className="mono-label text-yellow">// QUIÉNES SOMOS</span>
          <h2 className="font-display text-[clamp(48px,6vw,80px)] leading-[0.9] mt-3 text-ink">
            LA <span className="gradient-text">CANTINA</span><br />ES TU CASA.
          </h2>
          <p className="text-ink-dim mt-4 text-[16px] leading-relaxed">
            Una comunidad construida por jugadores, para jugadores. Si jugás Deadlock en LATAM, este es tu lugar.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon, title, body }) => (
            <div
              key={title}
              className="reveal bg-[#0d0f15] border border-[rgba(241,237,229,0.08)] rounded-[16px] p-7 transition-all duration-[250ms] hover:-translate-y-1.5 hover:border-[rgba(255,214,10,0.35)] hover:shadow-[0_12px_40px_rgba(255,214,10,0.08)]"
            >
              <div className="font-display text-[32px] text-yellow mb-5">{icon}</div>
              <h3 className="font-display text-[26px] text-ink leading-none mb-3">{title}</h3>
              <p className="text-ink-dim text-[13px] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
