'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TorneoForm from './TorneoForm';
import BracketAdmin from './BracketAdmin';

const STATUS_STYLE = {
  open:   'bg-green text-on-color',
  soon:   'bg-yellow text-on-color',
  live:   'bg-red text-white',
  closed: 'bg-surface text-ink',
};
const STATUS_LABEL = { open: 'Abierto', soon: 'Próximamente', live: 'En vivo', closed: 'Cerrado' };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function TorneoAdmin({ tournament, registrations, matches = [] }) {
  const router = useRouter();
  const [activeTab,  setActiveTab]  = useState('inscriptos'); // 'inscriptos' | 'llave' | 'editar'
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
    <main className="max-w-[1180px] mx-auto px-5 py-10">

      {/* Header */}
      <div className="mb-8">
        <span className="mono-label block mb-2">
          Torneo · {tournament.id}
        </span>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="font-display text-[clamp(32px,4vw,48px)] leading-none text-ink">
            {tournament.name}
          </h1>
          <a
            href={`/torneos/${tournament.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm shrink-0"
          >
            Ver público ↗
          </a>
        </div>
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <span className={`pill ${STATUS_STYLE[tournament.status]}`}>
            {STATUS_LABEL[tournament.status]}
          </span>
          <span className="text-[13px] text-ink-dim">{tournament.format} · {registrations.length}/{tournament.max_slots} inscriptos</span>
        </div>

        {/* Cambio rápido de estado */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <span className="mono-label">Cambiar estado:</span>
          {['open', 'soon', 'live', 'closed'].map(s => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={s === tournament.status}
              className={`pill transition-colors disabled:cursor-default ${
                s === tournament.status
                  ? STATUS_STYLE[s]
                  : 'bg-surface text-ink-dim hover:text-ink hover:bg-surface-2'
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'inscriptos', label: `Inscriptos (${registrations.length})` },
          { key: 'llave',      label: matches.length ? 'Llave' : 'Llave (sin generar)' },
          { key: 'editar',     label: 'Editar torneo' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pill text-[14px] px-4 py-2 transition-colors ${
              activeTab === tab.key
                ? 'bg-ink text-bg'
                : 'bg-surface text-ink hover:bg-surface-2'
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
            <div className="text-center py-16 border-[3px] border-dashed border-line rounded-[22px]">
              <p className="font-display text-[28px] text-ink-dim">Sin inscriptos aún.</p>
            </div>
          ) : (
            <div className="sticker overflow-hidden divide-y-[3px] divide-line">
              {registrations.map((r, i) => (
                <div key={r.id}>
                  <div className="px-5 py-4 flex items-center gap-4 flex-wrap hover:bg-surface-2 transition-colors">
                    {/* Posición */}
                    <span className="font-display text-[18px] text-ink-faint w-8 shrink-0 text-right">
                      {String(i + 1).padStart(2, '0')}
                    </span>

                    {/* Info */}
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-ink font-bold text-[16px] truncate">
                        {isTeamFormat ? (r.team_name ?? '—') : (r.captain_nick ?? '—')}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        {isTeamFormat && (
                          <span className="text-[13px] text-ink-dim">Cap: {r.captain_nick}</span>
                        )}
                        {r.captain_discord && (
                          <span className="text-[13px] text-ink-dim">@{r.captain_discord}</span>
                        )}
                        {r.region && (
                          <span className="pill bg-surface-2 text-ink text-[11px]">{r.region}</span>
                        )}
                        {r.checked_in_at && (
                          <span className="pill bg-green text-on-color text-[11px]">✓ Check-in</span>
                        )}
                      </div>
                    </div>

                    {/* Fecha */}
                    <span className="text-[12px] text-ink-dim shrink-0 hidden sm:block">
                      {formatDate(r.created_at)}
                    </span>

                    {/* Ver jugadores */}
                    {r.members && (
                      <button
                        onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                        className="btn btn-secondary btn-sm shrink-0"
                      >
                        {expandedId === r.id ? '▲ Ocultar' : '▼ Jugadores'}
                      </button>
                    )}

                    {/* Quitar */}
                    <button
                      onClick={() => handleRemoveReg(r.id)}
                      disabled={removingId === r.id}
                      className="btn btn-sm bg-red text-white shrink-0"
                    >
                      {removingId === r.id ? '…' : 'Quitar'}
                    </button>
                  </div>

                  {/* Jugadores desplegados */}
                  {expandedId === r.id && r.members && (
                    <div className="px-5 py-4 border-t-[3px] border-line bg-surface-2">
                      <pre className="font-mono text-[13px] text-ink whitespace-pre-wrap leading-relaxed">
                        {r.members}
                      </pre>
                      {r.experience && (
                        <p className="text-[13px] mt-2 text-ink-dim">Experiencia: {r.experience}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Llave */}
      {activeTab === 'llave' && (
        <BracketAdmin tournament={tournament} matches={matches} registrations={registrations} />
      )}

      {/* Tab: Editar */}
      {activeTab === 'editar' && (
        <div className="sticker p-6 max-w-[720px]">
          <TorneoForm
            tournament={tournament}
            onSaved={() => {
              router.refresh();
              setActiveTab('inscriptos');
            }}
          />
        </div>
      )}
    </main>
  );
}
