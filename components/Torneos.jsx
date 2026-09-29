'use client';

import { useEffect } from 'react';
import { LocalTime } from './Countdown';

const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE ?? '#discord';

const STATUS = {
  open:   { label: 'Inscripciones abiertas', color: 'bg-green text-on-color' },
  soon:   { label: 'Próximamente',           color: 'bg-cyan text-on-color'  },
  live:   { label: 'En vivo',                color: 'bg-red text-white'      },
  closed: { label: 'Cerrado',                color: 'bg-surface-2 text-ink-dim' },
};

function TorneoCard({ t }) {
  // Soporta tanto campos de BD (date_display) como legacy (date)
  const date  = t.date_display ?? t.date  ?? 'Por definir';
  const time  = t.time_display ?? t.time  ?? 'Por definir';
  const pct   = t.max_slots > 0 ? ((t.filled ?? 0) / t.max_slots) * 100 : 0;
  const s     = STATUS[t.status] ?? STATUS.closed;

  return (
    <div className="reveal sticker p-6 relative transition-transform duration-[250ms] hover:-translate-y-1">
      {t.featured && (
        <div className="absolute -top-4 left-5 bg-yellow text-on-color font-display text-[14px] px-3.5 py-1 rounded-full border-[3px] border-line shadow-sticker-sm -rotate-2">
          🔥 Destacado
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mb-4 mt-1">
        <span className="mono-label">Deadlock</span>
        <span className={`pill ${s.color}`}>
          {t.status === 'live' && <span className="dot-live" style={{ background: 'currentColor' }} />}
          {s.label}
        </span>
      </div>

      <h3 className="font-display text-[28px] leading-[1.05] text-ink mb-5">{t.name}</h3>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          ['📅', 'Fecha',   t.starts_at ? <LocalTime iso={t.starts_at} part="date" fallback={date} /> : date],
          ['👥', 'Formato', `${t.format} — ${t.region}`],
          ['⏰', 'Hora',    t.starts_at ? <LocalTime iso={t.starts_at} part="time" fallback={time} /> : time],
        ].map(([icon, label, value]) => (
          <div key={label} className="bg-surface-2 border-[3px] border-line rounded-2xl px-3 py-2.5 flex items-start gap-2">
            <span className="text-[18px] shrink-0">{icon}</span>
            <div className="text-[13px] text-ink-dim min-w-0">
              <span className="block text-ink text-[12px] font-bold mb-0.5">{label}</span>
              {value}
            </div>
          </div>
        ))}
        <div className="bg-yellow text-on-color border-[3px] border-line rounded-2xl px-3 py-2.5 flex items-start gap-2">
          <span className="text-[18px] shrink-0">🏆</span>
          <div className="min-w-0">
            <span className="block text-[12px] font-bold mb-0.5">Premio</span>
            <span className="font-display text-[17px] leading-tight">{t.prize}</span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-[13px] font-bold text-ink mb-2">
          <span>{t.status === 'soon' ? 'Inscripciones próximamente' : 'Cupos ocupados'}</span>
          <span>{t.filled ?? 0} / {t.max_slots}</span>
        </div>
        <div className="h-4 bg-surface-2 border-[3px] border-line rounded-full overflow-hidden">
          <div
            className="h-full bg-orange transition-all duration-[1200ms]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {t.winner && (
        <p className="font-display text-[17px] text-ink mb-4">
          🏆 Campeón: {t.winner.team_name ?? t.winner.captain_nick}
        </p>
      )}

      <a
        href={`/torneos/${t.id}`}
        className={`btn w-full ${
          t.featured
            ? 'btn-primary'
            : t.status === 'soon'
              ? 'btn-secondary opacity-50 pointer-events-none'
              : 'btn-secondary'
        }`}
      >
        {{ open: 'Ver torneo →', live: 'Ver llave →', closed: 'Ver resultados →' }[t.status] ?? 'Próximamente'}
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
    <section id="torneos" className="max-w-[1180px] mx-auto px-5 py-14 md:py-20">
      <div className="flex items-end justify-between mb-12 flex-wrap gap-4 reveal">
        <div>
          <span className="mono-label">🏆 Competencias</span>
          <h1 className="font-display text-[clamp(40px,6vw,68px)] leading-[1] tracking-[-0.02em] mt-2 text-ink">
            Torneos{' '}
            <mark className="bg-yellow text-on-color px-3 rounded-2xl border-[3px] border-line inline-block -rotate-2">activos</mark>
          </h1>
          <p className="text-[18px] text-ink-dim mt-4 max-w-[520px]">
            Inscribe a tu equipo, sigue los cupos y juega con la comunidad.
          </p>
        </div>
        <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="font-display text-[17px] text-ink underline decoration-[3px] decoration-yellow underline-offset-4 hover:text-yellow-ink transition-colors">
          Calendario en Discord ↗
        </a>
      </div>

      {torneos.length === 0 ? (
        <div className="sticker p-10 md:p-14 text-center max-w-[640px] mx-auto">
          <span className="text-[48px] block">🍳</span>
          <p className="font-display text-[clamp(26px,4vw,34px)] leading-tight text-ink mt-3">
            Se está cocinando el próximo torneo.
          </p>
          <p className="text-[16px] text-ink-dim mt-3 max-w-[420px] mx-auto">
            Los torneos se anuncian primero en Discord. Entra y activa los avisos para no quedarte afuera.
          </p>
          <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="btn btn-discord mt-7">
            Avisarme en Discord ↗
          </a>
        </div>
      ) : (
        <div className={`grid gap-7 items-start pt-3 ${
          torneos.length === 1
            ? 'grid-cols-1 max-w-[480px]'
            : torneos.length === 2
              ? 'grid-cols-1 sm:grid-cols-2 max-w-[820px]'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
          {torneos.map(t => (
            <TorneoCard key={t.id} t={t} />
          ))}
        </div>
      )}
    </section>
  );
}
