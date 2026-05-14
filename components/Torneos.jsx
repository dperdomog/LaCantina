'use client';

import { useEffect } from 'react';

const STATUS = {
  open:   { label: 'Inscripciones abiertas', color: 'text-green border-green/30 bg-green/10' },
  soon:   { label: 'Próximamente',           color: 'text-cyan  border-cyan/30  bg-cyan/10'  },
  live:   { label: 'En vivo',                color: 'text-pink  border-pink/30  bg-pink/10'  },
  closed: { label: 'Cerrado',                color: 'text-ink-dim border-ink-dim/20 bg-ink-dim/5' },
};

function TorneoCard({ t }) {
  // Soporta tanto campos de BD (date_display) como legacy (date)
  const date  = t.date_display ?? t.date  ?? 'Por definir';
  const time  = t.time_display ?? t.time  ?? 'Por definir';
  const pct   = t.max_slots > 0 ? ((t.filled ?? 0) / t.max_slots) * 100 : 0;
  const s     = STATUS[t.status] ?? STATUS.closed;

  return (
    <div className={`reveal bg-[#0d0f15] rounded-[16px] p-6 relative transition-all duration-[250ms] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,.4)] border ${
      t.featured
        ? 'border-[rgba(255,214,10,0.4)] shadow-[0_0_40px_rgba(255,214,10,0.08)]'
        : 'border-[rgba(241,237,229,0.08)]'
    }`}>
      {t.featured && (
        <div className="absolute -top-3 left-5 bg-yellow text-[#0a0a0a] font-display text-[13px] px-3.5 py-0.5 rounded-full tracking-wide">
          🔥 Destacado
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <span className="mono-label text-yellow">DEADLOCK</span>
        <span className={`pill border ${s.color} text-[10px]`}>
          {t.status === 'live' && <span className="dot-live" style={{ background: 'currentColor' }} />}
          {s.label}
        </span>
      </div>

      <h3 className="font-display text-[26px] leading-none text-ink mb-5">{t.name}</h3>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="flex items-start gap-2">
          <span className="text-[18px] shrink-0 mt-0.5">📅</span>
          <div className="text-[13px] text-ink-dim">
            <span className="block text-ink text-[11px] font-semibold mb-0.5">Fecha</span>
            {date}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[18px] shrink-0 mt-0.5">👥</span>
          <div className="text-[13px] text-ink-dim">
            <span className="block text-ink text-[11px] font-semibold mb-0.5">Formato</span>
            {t.format} — {t.region}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[18px] shrink-0 mt-0.5">⏰</span>
          <div className="text-[13px] text-ink-dim">
            <span className="block text-ink text-[11px] font-semibold mb-0.5">Hora</span>
            {time}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[18px] shrink-0 mt-0.5">🏆</span>
          <div>
            <span className="block text-ink text-[11px] font-semibold mb-0.5">Premio</span>
            <span className="font-display text-[20px] text-yellow leading-none">{t.prize}</span>
          </div>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex justify-between mono-label mb-2">
          <span>{t.status === 'soon' ? 'Inscripciones próximamente' : 'Cupos ocupados'}</span>
          <span>{t.filled ?? 0} / {t.max_slots}</span>
        </div>
        <div className="h-[5px] bg-[rgba(241,237,229,0.07)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow to-[#ffe566] rounded-full transition-all duration-[1200ms]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <a
        href={`/torneos/${t.id}`}
        className={`block w-full py-3.5 rounded-full font-bold text-[14px] tracking-wide text-center no-underline transition-all ${
          t.featured
            ? 'bg-yellow text-[#0a0a0a] shadow-yellow-btn hover:opacity-90 hover:-translate-y-0.5'
            : t.status === 'open'
              ? 'bg-transparent border border-yellow text-yellow hover:bg-yellow/10 hover:-translate-y-0.5'
              : 'bg-[rgba(241,237,229,0.05)] border border-[rgba(241,237,229,0.08)] text-ink-dim pointer-events-none'
        }`}
      >
        {t.status === 'open' ? 'Ver torneo →' : 'Próximamente'}
      </a>
    </div>
  );
}

export default function Torneos({ torneos = [] }) {
  useEffect(() => {
    const section = document.getElementById('torneos');
    if (!section) return;
    const cards = section.querySelectorAll('.reveal');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.1 });
    cards.forEach(c => obs.observe(c));
    return () => obs.disconnect();
  }, []);

  return (
    <section id="torneos" className="py-24 px-6 md:px-14">
      <div className="max-w-[1160px] mx-auto">
        <div className="flex items-end justify-between mb-12 flex-wrap gap-4 reveal">
          <div>
            <span className="mono-label text-yellow">// COMPETENCIAS</span>
            <h2 className="font-display text-[clamp(48px,6vw,80px)] leading-[0.9] mt-3 text-ink">
              TORNEOS <span className="gradient-text">ACTIVOS.</span>
            </h2>
          </div>
          <a href="#discord" className="text-[14px] text-ink border-b border-yellow pb-0.5 no-underline hover:text-yellow transition-colors">
            Calendario completo →
          </a>
        </div>

        {torneos.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-display text-[28px] text-ink-dim">No hay torneos activos por el momento.</p>
          </div>
        ) : (
          <div className={`grid gap-5 items-start ${
            torneos.length === 1
              ? 'grid-cols-1 max-w-[480px]'
              : torneos.length === 2
                ? 'grid-cols-1 sm:grid-cols-2 max-w-[800px]'
                : 'grid-cols-1 lg:grid-cols-3'
          }`}>
            {torneos.map(t => (
              <TorneoCard key={t.id} t={t} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
