'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const TorneoModal = dynamic(() => import('./TorneoModal'), { ssr: false });

const STATUS = {
  open:   { label: 'Inscripciones abiertas', color: 'text-green border-green/30 bg-green/10' },
  soon:   { label: 'Próximamente',           color: 'text-cyan  border-cyan/30  bg-cyan/10'  },
  live:   { label: 'En vivo',                color: 'text-pink  border-pink/30  bg-pink/10'  },
  closed: { label: 'Cerrado',                color: 'text-ink-dim border-ink-dim/20 bg-ink-dim/5' },
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
    <main className="min-h-screen pb-24 px-6 md:px-14 pt-10">
      <div className="max-w-[860px] mx-auto">

        {/* Back */}
        <a
          href="/#torneos"
          className="mono-label text-[11px] text-ink-dim hover:text-yellow transition-colors no-underline inline-flex items-center gap-1.5 mb-10"
        >
          ← TORNEOS
        </a>

        {/* ── Header ── */}
        <div className="mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="mono-label text-yellow">DEADLOCK · {torneo.format} · {torneo.region}</span>
            <span className={`pill border ${s.color} text-[10px]`}>{s.label}</span>
          </div>

          <h1 className="font-display text-[clamp(40px,6vw,72px)] leading-[0.9] text-ink mb-8">
            {torneo.name}
          </h1>

          {/* Info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { icon: '📅', label: 'Fecha',   value: torneo.date },
              { icon: '⏰', label: 'Hora',    value: torneo.time },
              { icon: '🏆', label: 'Premio',  value: torneo.prize },
              { icon: '👥', label: 'Formato', value: `${torneo.format} · Máx ${torneo.maxSlots}` },
            ].map(({ icon, label, value }) => (
              <div key={label} className="bg-[#0d0f15] border border-[rgba(241,237,229,0.08)] rounded-[14px] p-4">
                <span className="text-[20px] block mb-2">{icon}</span>
                <span className="mono-label text-[9px] block mb-1">{label}</span>
                <span className="text-ink text-[14px] font-semibold">{value}</span>
              </div>
            ))}
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between mono-label mb-2">
              <span>Equipos registrados</span>
              <span>{registrations.length} / {torneo.maxSlots}</span>
            </div>
            <div className="h-[5px] bg-[rgba(241,237,229,0.07)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow to-[#ffe566] rounded-full transition-all duration-[1200ms]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* CTA */}
          {torneo.status === 'open' && (
            <button
              onClick={() => setShowModal(true)}
              className="px-8 py-3.5 rounded-full bg-yellow text-[#0a0a0a] font-bold text-[15px] shadow-yellow-btn hover:opacity-90 hover:-translate-y-0.5 transition-all"
            >
              Inscribirse →
            </button>
          )}
        </div>

        {/* ── Registered list ── */}
        <div>
          <span className="mono-label text-yellow text-[10px] block mb-5">
            // {isTeam ? 'EQUIPOS REGISTRADOS' : 'JUGADORES REGISTRADOS'} ({registrations.length})
          </span>

          {registrations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-[rgba(241,237,229,0.06)] rounded-[20px]">
              <p className="font-display text-[32px] text-ink-dim">Aún no hay inscriptos.</p>
              <p className="mono-label text-[11px] mt-2 text-ink-faint">Sé el primero en registrar tu equipo.</p>
              {torneo.status === 'open' && (
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-6 px-6 py-3 rounded-full border border-yellow text-yellow font-bold text-[14px] hover:bg-yellow/10 transition-colors"
                >
                  Inscribirse →
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {registrations.map((r, i) => (
                <div
                  key={r.id}
                  className="bg-[#0d0f15] border border-[rgba(241,237,229,0.08)] rounded-[14px] px-5 py-4 flex items-center gap-4"
                >
                  {/* Position number */}
                  <span className="mono-label text-ink-faint text-[12px] w-7 shrink-0 text-right">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-ink font-semibold text-[16px] leading-tight truncate">
                      {isTeam ? (r.team_name ?? '—') : (r.captain_nick ?? '—')}
                    </p>
                    <p className="mono-label text-[10px] mt-0.5 text-ink-dim">
                      {isTeam
                        ? `Cap: ${r.captain_nick ?? '—'}`
                        : r.captain_discord ? `@${r.captain_discord}` : ''}
                    </p>
                  </div>

                  {/* Region pill */}
                  {r.region && (
                    <span className="pill border border-[rgba(241,237,229,0.12)] text-ink-dim text-[10px] shrink-0">
                      {r.region}
                    </span>
                  )}

                  {/* Date */}
                  {r.created_at && (
                    <span className="mono-label text-ink-faint text-[10px] shrink-0 hidden sm:block">
                      {formatDate(r.created_at)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <TorneoModal torneo={torneo} onClose={() => setShowModal(false)} />
      )}
    </main>
  );
}
