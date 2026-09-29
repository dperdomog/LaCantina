'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const TorneoModal = dynamic(() => import('./TorneoModal'), { ssr: false });

const STATUS = {
  open:   { label: 'Inscripciones abiertas', color: 'bg-green text-on-color' },
  soon:   { label: 'Próximamente',           color: 'bg-cyan text-on-color'  },
  live:   { label: 'En vivo',                color: 'bg-red text-white'      },
  closed: { label: 'Cerrado',                color: 'bg-surface-2 text-ink-dim' },
};

const isTeamFormat = (format) => /\d+v\d+/i.test(format ?? '');

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function TorneoDetallePage({ torneo, registrations }) {
  const [showModal, setShowModal] = useState(false);

  const isTeam = isTeamFormat(torneo.format);
  const s      = STATUS[torneo.status] ?? STATUS.closed;
  const pct    = torneo.maxSlots > 0 ? (registrations.length / torneo.maxSlots) * 100 : 0;

  return (
    <main className="max-w-[960px] mx-auto px-5 py-14 md:py-20">

      {/* Back */}
      <a
        href="/torneos"
        className="text-[14px] font-bold text-ink-dim hover:text-ink transition-colors no-underline inline-flex items-center gap-1.5 mb-8"
      >
        ← Torneos
      </a>

      {/* ── Header ── */}
      <div className="mb-12">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="mono-label">🏆 Deadlock · {torneo.format} · {torneo.region}</span>
          <span className={`pill ${s.color}`}>
            {torneo.status === 'live' && <span className="dot-live" style={{ background: 'currentColor' }} />}
            {s.label}
          </span>
        </div>

        <h1 className="font-display text-[clamp(40px,6vw,68px)] leading-[1] tracking-[-0.02em] text-ink mb-8">
          {torneo.name}
        </h1>

        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: '📅', label: 'Fecha',   value: torneo.date },
            { icon: '⏰', label: 'Hora',    value: torneo.time },
            { icon: '🏆', label: 'Premio',  value: torneo.prize, accent: true },
            { icon: '👥', label: 'Formato', value: `${torneo.format} · Máx ${torneo.maxSlots}` },
          ].map(({ icon, label, value, accent }) => (
            <div key={label} className={`sticker-sm p-4 ${accent ? 'bg-yellow text-on-color' : 'bg-surface'}`}>
              <span className="text-[22px] block mb-2">{icon}</span>
              <span className={`block text-[12px] font-bold uppercase tracking-wider mb-1 ${accent ? '' : 'text-ink-dim'}`}>{label}</span>
              <span className={`font-display text-[17px] leading-tight ${accent ? '' : 'text-ink'}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-[14px] font-bold text-ink mb-2">
            <span>{isTeam ? 'Equipos registrados' : 'Jugadores registrados'}</span>
            <span>{registrations.length} / {torneo.maxSlots}</span>
          </div>
          <div className="h-4 bg-surface border-[3px] border-line rounded-full overflow-hidden">
            <div
              className="h-full bg-orange transition-all duration-[1200ms]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* CTA */}
        {torneo.status === 'open' && (
          <button onClick={() => setShowModal(true)} className="btn btn-primary text-[17px]">
            Inscribirse →
          </button>
        )}
      </div>

      {/* ── Registered list ── */}
      <div>
        <h2 className="font-display text-[clamp(26px,4vw,34px)] text-ink mb-5">
          {isTeam ? 'Equipos registrados' : 'Jugadores registrados'}{' '}
          <span className="text-ink-dim">({registrations.length})</span>
        </h2>

        {registrations.length === 0 ? (
          <div className="sticker p-10 md:p-14 text-center">
            <span className="text-[44px] block">🪑</span>
            <p className="font-display text-[clamp(24px,4vw,32px)] text-ink mt-2">Aún no hay inscritos.</p>
            <p className="text-[16px] text-ink-dim mt-2">
              {isTeam ? 'Sé el primero en registrar tu equipo.' : 'Sé el primero en inscribirte.'}
            </p>
            {torneo.status === 'open' && (
              <button onClick={() => setShowModal(true)} className="btn btn-primary mt-6">
                Inscribirse →
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {registrations.map((r, i) => (
              <div
                key={r.id}
                className="sticker-sm bg-surface px-5 py-4 flex items-center gap-4"
              >
                {/* Position number */}
                <span className="font-display text-[20px] text-ink-faint w-8 shrink-0 text-right">
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <p className="text-ink font-bold text-[16px] leading-tight truncate">
                    {isTeam ? (r.team_name ?? '—') : (r.captain_nick ?? '—')}
                  </p>
                  <p className="text-[13px] mt-0.5 text-ink-dim truncate">
                    {isTeam
                      ? `Cap: ${r.captain_nick ?? '—'}`
                      : r.captain_discord ? `@${r.captain_discord}` : ''}
                  </p>
                </div>

                {/* Region pill */}
                {r.region && (
                  <span className="pill bg-surface-2 text-ink shrink-0">
                    {r.region}
                  </span>
                )}

                {/* Date */}
                {r.created_at && (
                  <span className="text-[13px] text-ink-dim shrink-0 hidden sm:block">
                    {formatDate(r.created_at)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <TorneoModal torneo={torneo} onClose={() => setShowModal(false)} />
      )}
    </main>
  );
}
