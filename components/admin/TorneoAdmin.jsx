'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TorneoForm from './TorneoForm';

const STATUS_STYLE = {
  open:   'text-green  border-green/30  bg-green/10',
  soon:   'text-cyan   border-cyan/30   bg-cyan/10',
  live:   'text-pink   border-pink/30   bg-pink/10',
  closed: 'text-ink-dim border-ink-dim/20 bg-ink-dim/5',
};
const STATUS_LABEL = { open: 'Abierto', soon: 'Próximamente', live: 'En vivo', closed: 'Cerrado' };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function TorneoAdmin({ tournament, registrations }) {
  const router = useRouter();
  const [activeTab,  setActiveTab]  = useState('inscriptos'); // 'inscriptos' | 'editar'
  const [removingId, setRemovingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const isTeamFormat = /\d+v\d+/i.test(tournament.format ?? '');

  async function handleRemoveReg(id) {
    if (!confirm('¿Eliminar esta inscripción?')) return;
    setRemovingId(id);
    await fetch(`/api/admin/registrations/${id}`, { method: 'DELETE' });
    setRemovingId(null);
    router.refresh();
  }

  async function handleStatusChange(status) {
    await fetch(`/api/admin/tournaments/${tournament.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  return (
    <main className="px-6 md:px-14 py-10">
      <div className="max-w-[900px] mx-auto">

        {/* Header */}
        <div className="mb-8">
          <span className="mono-label text-yellow text-[10px] block mb-2">
            // TORNEO · {tournament.id}
          </span>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h1 className="font-display text-[clamp(32px,4vw,56px)] leading-none text-ink">
              {tournament.name}
            </h1>
            <a
              href={`/torneos/${tournament.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mono-label text-[11px] text-ink-dim border border-[rgba(241,237,229,0.1)] px-4 py-2 rounded-full hover:border-ink-dim transition-colors no-underline shrink-0"
            >
              Ver público ↗
            </a>
          </div>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span className={`pill border text-[10px] ${STATUS_STYLE[tournament.status]}`}>
              {STATUS_LABEL[tournament.status]}
            </span>
            <span className="mono-label text-[10px]">{tournament.format} · {registrations.length}/{tournament.max_slots} inscriptos</span>
          </div>

          {/* Quick status change */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <span className="mono-label text-[9px] text-ink-faint">Cambiar estado:</span>
            {['open', 'soon', 'live', 'closed'].map(s => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={s === tournament.status}
                className={`mono-label text-[9px] px-3 py-1.5 rounded-full border transition-colors disabled:opacity-40 disabled:cursor-default ${
                  s === tournament.status
                    ? STATUS_STYLE[s] + ' border-current'
                    : 'border-[rgba(241,237,229,0.12)] text-ink-dim hover:border-yellow/50 hover:text-yellow'
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-[rgba(241,237,229,0.08)]">
          {[
            { key: 'inscriptos', label: `Inscriptos (${registrations.length})` },
            { key: 'editar',     label: 'Editar torneo' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`mono-label text-[11px] px-4 py-2.5 border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? 'border-yellow text-yellow'
                  : 'border-transparent text-ink-dim hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Inscriptos */}
        {activeTab === 'inscriptos' && (
          <div>
            {registrations.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-[rgba(241,237,229,0.1)] rounded-[16px]">
                <p className="font-display text-[28px] text-ink-dim">Sin inscriptos aún.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {registrations.map((r, i) => (
                  <div key={r.id} className="bg-[#0d0f15] border border-[rgba(241,237,229,0.08)] rounded-[14px] overflow-hidden">
                    <div className="px-5 py-4 flex items-center gap-4">
                      {/* Position */}
                      <span className="mono-label text-ink-faint text-[12px] w-7 shrink-0 text-right">
                        {String(i + 1).padStart(2, '0')}
                      </span>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-ink font-semibold text-[16px] truncate">
                          {isTeamFormat ? (r.team_name ?? '—') : (r.captain_nick ?? '—')}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          {isTeamFormat && (
                            <span className="mono-label text-[10px]">Cap: {r.captain_nick}</span>
                          )}
                          {r.captain_discord && (
                            <span className="mono-label text-[10px] text-ink-dim">@{r.captain_discord}</span>
                          )}
                          {r.region && (
                            <span className="pill border border-[rgba(241,237,229,0.12)] text-ink-dim text-[9px]">{r.region}</span>
                          )}
                        </div>
                      </div>

                      {/* Date */}
                      <span className="mono-label text-ink-faint text-[10px] shrink-0 hidden sm:block">
                        {formatDate(r.created_at)}
                      </span>

                      {/* Expand members */}
                      {r.members && (
                        <button
                          onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                          className="mono-label text-[9px] text-ink-dim border border-[rgba(241,237,229,0.1)] px-2.5 py-1 rounded-full hover:border-yellow/50 hover:text-yellow transition-colors shrink-0"
                        >
                          {expandedId === r.id ? '▲ Ocultar' : '▼ Jugadores'}
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleRemoveReg(r.id)}
                        disabled={removingId === r.id}
                        className="mono-label text-[9px] text-pink border border-pink/20 px-2.5 py-1 rounded-full hover:bg-pink/10 transition-colors shrink-0 disabled:opacity-40"
                      >
                        {removingId === r.id ? '…' : 'Quitar'}
                      </button>
                    </div>

                    {/* Members expanded */}
                    {expandedId === r.id && r.members && (
                      <div className="px-5 pb-4 pt-0 border-t border-[rgba(241,237,229,0.06)] mt-0">
                        <pre className="mono-label text-[11px] text-ink-dim whitespace-pre-wrap leading-relaxed mt-3">
                          {r.members}
                        </pre>
                        {r.experience && (
                          <p className="mono-label text-[10px] mt-2 text-ink-faint">Experiencia: {r.experience}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Editar */}
        {activeTab === 'editar' && (
          <TorneoForm
            tournament={tournament}
            onSaved={() => {
              router.refresh();
              setActiveTab('inscriptos');
            }}
          />
        )}
      </div>
    </main>
  );
}
