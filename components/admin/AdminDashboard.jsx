'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_STYLE = {
  open:   'bg-green text-on-color',
  soon:   'bg-yellow text-on-color',
  live:   'bg-red text-white',
  closed: 'bg-surface text-ink',
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
    <main className="max-w-[1180px] mx-auto px-5 py-10">

      {/* Header */}
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <span className="mono-label block mb-2">Panel de control</span>
          <h1 className="font-display text-[clamp(32px,4vw,48px)] leading-none text-ink">
            Panel <span className="gradient-text">admin</span>
          </h1>
        </div>
        <a href="/admin/torneos/nuevo" className="btn btn-primary">+ Nuevo torneo</a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 mb-10">
        {[
          { label: 'Torneos totales',       value: tournaments.length },
          { label: 'Inscripciones totales', value: totalRegs },
          { label: 'Torneos abiertos',      value: tournaments.filter(t => t.status === 'open').length },
        ].map(({ label, value }) => (
          <div key={label} className="sticker p-5">
            <span className="mono-label block mb-2">{label}</span>
            <span className="font-display text-[40px] text-ink leading-none">{value}</span>
          </div>
        ))}
      </div>

      {/* Torneos */}
      <h2 className="font-display text-[24px] text-ink mb-4">Torneos</h2>

      {tournaments.length === 0 ? (
        <div className="text-center py-16 border-[3px] border-dashed border-line rounded-[22px]">
          <p className="font-display text-[28px] text-ink-dim">No hay torneos.</p>
          <a href="/admin/torneos/nuevo" className="btn btn-secondary btn-sm mt-4">Crear el primero →</a>
        </div>
      ) : (
        <div className="sticker overflow-hidden divide-y-[3px] divide-line">
          {tournaments.map(t => (
            <div key={t.id} className="p-5 hover:bg-surface-2 transition-colors">
              <div className="flex items-start gap-4 flex-wrap">
                {/* Info */}
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-display text-[20px] text-ink leading-tight">{t.name}</h3>
                    {t.featured && <span className="pill bg-yellow text-on-color text-[11px]">⭐ Destacado</span>}
                  </div>
                  <p className="text-[13px] text-ink-dim">
                    {t.format} · {t.registrations}/{t.max_slots} inscriptos
                  </p>
                </div>

                {/* Estado + cambio rápido */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`pill ${STATUS_STYLE[t.status]}`}>
                    {STATUS_LABEL[t.status]}
                  </span>
                  {['open', 'soon', 'live', 'closed'].filter(s => s !== t.status).map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatus(t.id, s)}
                      className="pill bg-surface text-ink-dim hover:text-ink hover:bg-surface-2 transition-colors"
                    >
                      → {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <a href={`/admin/torneos/${t.id}`} className="btn btn-primary btn-sm">Gestionar →</a>
                  <a href={`/torneos/${t.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                    Ver público ↗
                  </a>
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={deleting === t.id}
                    className="btn btn-sm bg-red text-white"
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
        <h2 className="font-display text-[24px] text-ink mb-4">Jugadores ({players.length})</h2>

        <div className="sticker overflow-hidden divide-y-[3px] divide-line">
          {players.map(p => {
            const name    = p.display_name ?? p.discord_username ?? 'Sin nombre';
            const isEditing = editingPlayer === p.id;
            return (
              <div key={p.id} className="p-4 hover:bg-surface-2 transition-colors">
                <div className="flex items-center gap-3 flex-wrap">

                  {/* Info */}
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-ink font-bold text-[15px] leading-tight flex items-center gap-2 flex-wrap">
                      {name}
                      {p.is_admin && <span className="pill bg-yellow text-on-color text-[10px]">Admin</span>}
                    </p>
                    {p.discord_username && (
                      <p className="text-[13px] text-ink-dim mt-0.5">@{p.discord_username}</p>
                    )}
                  </div>

                  {/* StatLocker */}
                  <div className="flex-1 min-w-[200px]">
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="url"
                          value={editUrl}
                          onChange={e => setEditUrl(e.target.value)}
                          placeholder="https://statlocker.gg/profile/..."
                          className="field flex-1 min-w-[180px] py-2 text-[13px]"
                        />
                        <button
                          onClick={() => handleSaveStatlocker(p.id)}
                          disabled={savingPlayer}
                          className="btn btn-primary btn-sm"
                        >
                          {savingPlayer ? '…' : 'Guardar'}
                        </button>
                        <button
                          onClick={() => setEditingPlayer(null)}
                          className="btn btn-secondary btn-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        {p.statlocker_url
                          ? <a href={p.statlocker_url} target="_blank" rel="noopener noreferrer"
                              className="text-[13px] font-bold text-yellow-ink underline underline-offset-2 hover:opacity-70 transition-opacity truncate max-w-[180px]">
                              StatLocker ↗
                            </a>
                          : <span className="text-[13px] text-ink-faint">Sin StatLocker</span>
                        }
                        <button
                          onClick={() => { setEditingPlayer(p.id); setEditUrl(p.statlocker_url ?? ''); }}
                          className="btn btn-secondary btn-sm"
                        >
                          Editar
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Eliminar */}
                  {!p.is_admin && (
                    <button
                      onClick={() => handleDeletePlayer(p.id)}
                      disabled={deletingPlayer === p.id}
                      className="btn btn-sm bg-red text-white shrink-0"
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

    </main>
  );
}
