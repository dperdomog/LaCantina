'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_STYLE = {
  open:   'text-green  border-green/30  bg-green/10',
  soon:   'text-cyan   border-cyan/30   bg-cyan/10',
  live:   'text-pink   border-pink/30   bg-pink/10',
  closed: 'text-ink-dim border-ink-dim/20 bg-ink-dim/5',
};
const STATUS_LABEL = {
  open: 'Abierto', soon: 'Próximamente', live: 'En vivo', closed: 'Cerrado',
};

export default function AdminDashboard({ tournaments, players }) {
  const router  = useRouter();
  const [deleting,      setDeleting]      = useState(null);
  const [deletingPlayer,setDeletingPlayer]= useState(null);
  const [editingPlayer, setEditingPlayer] = useState(null); // player id being edited
  const [editUrl,       setEditUrl]       = useState('');
  const [savingPlayer,  setSavingPlayer]  = useState(false);

  const totalRegs = tournaments.reduce((s, t) => s + t.registrations, 0);

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este torneo? Se perderán todas sus inscripciones.')) return;
    setDeleting(id);
    await fetch(`/api/admin/tournaments/${id}`, { method: 'DELETE' });
    setDeleting(null);
    router.refresh();
  }

  async function handleDeletePlayer(id) {
    if (!confirm('¿Eliminar este jugador? Se borrarán sus datos, membresías y solicitudes.')) return;
    setDeletingPlayer(id);
    await fetch(`/api/admin/players/${id}`, { method: 'DELETE' });
    setDeletingPlayer(null);
    router.refresh();
  }

  async function handleSaveStatlocker(id) {
    setSavingPlayer(true);
    await fetch(`/api/admin/players/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statlocker_url: editUrl.trim() || null }),
    });
    setSavingPlayer(false);
    setEditingPlayer(null);
    router.refresh();
  }

  async function handleStatus(id, status) {
    await fetch(`/api/admin/tournaments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  return (
    <main className="px-6 md:px-14 py-10">
      <div className="max-w-[1100px] mx-auto">

        {/* Header */}
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <span className="mono-label text-yellow text-[10px] block mb-2">// PANEL DE CONTROL</span>
            <h1 className="font-display text-[clamp(40px,5vw,64px)] leading-none text-ink">
              ADMIN <span className="gradient-text">DASHBOARD</span>
            </h1>
          </div>
          <a
            href="/admin/torneos/nuevo"
            className="px-6 py-3 rounded-full bg-yellow text-[#0a0a0a] font-bold text-[14px] shadow-yellow-btn hover:opacity-90 transition-opacity no-underline"
          >
            + Nuevo torneo
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Torneos totales',    value: tournaments.length },
            { label: 'Inscripciones totales', value: totalRegs },
            { label: 'Torneos abiertos',   value: tournaments.filter(t => t.status === 'open').length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#0d0f15] border border-[rgba(241,237,229,0.08)] rounded-[16px] p-5">
              <span className="mono-label text-[10px] block mb-2">{label}</span>
              <span className="font-display text-[40px] text-yellow leading-none">{value}</span>
            </div>
          ))}
        </div>

        {/* Torneos table */}
        <span className="mono-label text-yellow text-[10px] block mb-4">// TORNEOS</span>

        {tournaments.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-[rgba(241,237,229,0.1)] rounded-[16px]">
            <p className="font-display text-[28px] text-ink-dim">No hay torneos.</p>
            <a href="/admin/torneos/nuevo" className="mt-4 inline-block mono-label text-yellow text-[11px] hover:opacity-80 transition-opacity no-underline">
              Crear el primero →
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tournaments.map(t => (
              <div key={t.id} className="bg-[#0d0f15] border border-[rgba(241,237,229,0.08)] rounded-[16px] p-5">
                <div className="flex items-start gap-4 flex-wrap">
                  {/* Info */}
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="text-ink font-semibold text-[18px]">{t.name}</h2>
                      {t.featured && <span className="mono-label text-[9px] text-yellow border border-yellow/30 bg-yellow/10 px-1.5 py-0.5 rounded-full">⭐ Destacado</span>}
                    </div>
                    <p className="mono-label text-[10px]">
                      {t.format} · {t.registrations}/{t.max_slots} inscriptos
                    </p>
                  </div>

                  {/* Status badge + quick change */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`pill border text-[10px] ${STATUS_STYLE[t.status]}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                    {/* Quick status buttons */}
                    {['open', 'soon', 'live', 'closed'].filter(s => s !== t.status).map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatus(t.id, s)}
                        className="mono-label text-[9px] text-ink-faint border border-[rgba(241,237,229,0.1)] px-2 py-1 rounded-full hover:border-ink-dim hover:text-ink-dim transition-colors"
                      >
                        → {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`/admin/torneos/${t.id}`}
                      className="mono-label text-[10px] text-yellow border border-yellow/30 bg-yellow/5 px-3 py-1.5 rounded-full hover:bg-yellow/10 transition-colors no-underline"
                    >
                      Gestionar →
                    </a>
                    <a
                      href={`/torneos/${t.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mono-label text-[10px] text-ink-dim border border-[rgba(241,237,229,0.1)] px-3 py-1.5 rounded-full hover:border-ink-dim transition-colors no-underline"
                    >
                      Ver público ↗
                    </a>
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deleting === t.id}
                      className="mono-label text-[10px] text-pink border border-pink/20 px-3 py-1.5 rounded-full hover:bg-pink/10 transition-colors disabled:opacity-40"
                    >
                      {deleting === t.id ? '…' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* ── Jugadores ── */}
        <div className="mt-14">
          <div className="flex items-center justify-between mb-4">
            <span className="mono-label text-yellow text-[10px]">// JUGADORES ({players.length})</span>
          </div>

          <div className="flex flex-col gap-2">
            {players.map(p => {
              const name    = p.display_name ?? p.discord_username ?? 'Sin nombre';
              const isEditing = editingPlayer === p.id;
              return (
                <div key={p.id} className="bg-[#0d0f15] border border-[rgba(241,237,229,0.08)] rounded-[14px] p-4">
                  <div className="flex items-center gap-3 flex-wrap">

                    {/* Info */}
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-ink font-semibold text-[14px] leading-tight">
                        {name}
                        {p.is_admin && <span className="ml-2 mono-label text-yellow text-[9px]">ADMIN</span>}
                      </p>
                      {p.discord_username && (
                        <p className="mono-label text-[10px] text-ink-dim mt-0.5">@{p.discord_username}</p>
                      )}
                    </div>

                    {/* StatLocker */}
                    <div className="flex-1 min-w-[200px]">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={editUrl}
                            onChange={e => setEditUrl(e.target.value)}
                            placeholder="https://statlocker.gg/profile/..."
                            className="flex-1 bg-[#06070a] border border-yellow/30 rounded-[8px] px-3 py-1.5 text-ink text-[12px] focus:outline-none focus:border-yellow/60"
                          />
                          <button
                            onClick={() => handleSaveStatlocker(p.id)}
                            disabled={savingPlayer}
                            className="mono-label text-[9px] text-yellow border border-yellow/30 px-2.5 py-1.5 rounded-full hover:bg-yellow/10 transition-colors disabled:opacity-40"
                          >
                            {savingPlayer ? '…' : 'Guardar'}
                          </button>
                          <button
                            onClick={() => setEditingPlayer(null)}
                            className="mono-label text-[9px] text-ink-dim border border-[rgba(241,237,229,0.1)] px-2.5 py-1.5 rounded-full hover:border-ink-dim transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {p.statlocker_url
                            ? <a href={p.statlocker_url} target="_blank" rel="noopener noreferrer"
                                className="mono-label text-[10px] text-yellow hover:opacity-70 transition-opacity no-underline truncate max-w-[180px]">
                                StatLocker ↗
                              </a>
                            : <span className="mono-label text-[10px] text-ink-faint">Sin StatLocker</span>
                          }
                          <button
                            onClick={() => { setEditingPlayer(p.id); setEditUrl(p.statlocker_url ?? ''); }}
                            className="mono-label text-[9px] text-ink-dim border border-[rgba(241,237,229,0.1)] px-2 py-1 rounded-full hover:border-yellow/40 hover:text-yellow transition-colors"
                          >
                            Editar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Delete */}
                    {!p.is_admin && (
                      <button
                        onClick={() => handleDeletePlayer(p.id)}
                        disabled={deletingPlayer === p.id}
                        className="mono-label text-[9px] text-pink border border-pink/20 px-3 py-1.5 rounded-full hover:bg-pink/10 transition-colors disabled:opacity-40 shrink-0"
                      >
                        {deletingPlayer === p.id ? '…' : 'Eliminar'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </main>
  );
}
