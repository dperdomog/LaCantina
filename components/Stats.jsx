'use client';

import { useEffect, useRef, useState } from 'react';

export default function Stats() {
  const fillRefs = useRef([]);
  const numRefs  = useRef([]);
  const animated = useRef(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

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

  // Animar cuando tengamos datos y la sección sea visible
  useEffect(() => {
    if (!data) return;
    const section = document.getElementById('stats');
    if (!section) return;

    const stats = getStats(data);

    /* reveal cards */
    const cards = section.querySelectorAll('.reveal');
    const revObs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revObs.unobserve(e.target); } });
    }, { threshold: 0.15 });
    cards.forEach(c => revObs.observe(c));

    /* counters */
    animated.current = false;
    const countObs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated.current) {
        animated.current = true;
        numRefs.current.forEach((el, i) => { if (el) animateNum(el, stats[i].target); });
        fillRefs.current.forEach((el, i) => { if (el) el.style.width = stats[i].pct; });
        countObs.disconnect();
      }
    }, { threshold: 0.3 });
    countObs.observe(section);

    return () => { revObs.disconnect(); countObs.disconnect(); };
  }, [data]);

  function getStats(d) {
    return [
      { target: d.discord_members, label: 'Miembros en Discord',          color: 'text-ink',    pct: '85%' },
      { target: d.players,         label: 'Jugadores registrados',         color: 'text-yellow', pct: '60%' },
      { target: d.teams,           label: 'Equipos activos',               color: 'text-ink',    pct: '70%' },
      { target: d.torneos,         label: 'Torneos realizados',            color: 'text-ink',    pct: '55%' },
    ];
  }

  const stats = data ? getStats(data) : [
    { target: 0, label: 'Miembros en Discord',  color: 'text-ink',    pct: '0%' },
    { target: 0, label: 'Jugadores registrados', color: 'text-yellow', pct: '0%' },
    { target: 0, label: 'Equipos activos',       color: 'text-ink',    pct: '0%' },
    { target: 0, label: 'Torneos realizados',    color: 'text-ink',    pct: '0%' },
  ];

  return (
    <section id="stats" className="py-24 px-6 md:px-14 bg-[#0d0f15]">
      <div className="max-w-[1160px] mx-auto">
        {/* Header */}
        <div className="text-center max-w-[640px] mx-auto mb-16 reveal">
          <span className="mono-label text-yellow">// NÚMEROS QUE HABLAN</span>
          <h2 className="font-display text-[clamp(48px,6vw,80px)] leading-[0.9] mt-3 text-ink">
            UNA COMUNIDAD <span className="gradient-text">CRECIENTE.</span>
          </h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, color }, i) => (
            <div
              key={label}
              className="reveal bg-[#06070a] border border-[rgba(241,237,229,0.08)] rounded-[16px] px-7 py-9 text-center transition-all duration-[250ms] hover:-translate-y-1 hover:border-[rgba(255,214,10,0.35)]"
            >
              <div
                ref={el => { numRefs.current[i] = el; }}
                className={`font-display text-[56px] leading-none mb-2 ${color}`}
              >
                {data ? '0' : '—'}
              </div>
              <div className="text-ink-dim text-[13px] mb-5">{label}</div>
              <div className="h-[4px] bg-[rgba(241,237,229,0.07)] rounded-full overflow-hidden">
                <div ref={el => { fillRefs.current[i] = el; }} className="bar-fill" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
