'use client';

import { useState } from 'react';
import RankBadge from '@/components/RankBadge';

export default function StatlockerForm({ initialUrl, initialRank = null }) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl]         = useState(initialUrl ?? '');
  const [saved, setSaved]     = useState(initialUrl ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [rank, setRank]       = useState(initialRank);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/rank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statlocker_url: url.trim() }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? 'Error al guardar.'); return; }

    setSaved(data.statlocker_url);
    setRank(data.rank_badge ?? null);
    setEditing(false);
  }

  return (
    <div className="sticker p-6 col-span-full">
      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="mono-label">📈 Deadlock · StatLocker</span>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="btn btn-secondary btn-sm"
          >
            {saved ? 'Editar' : 'Vincular'}
          </button>
        )}
      </div>

      {!editing && saved && (
        <div className="mb-4">
          {rank !== null
            ? <RankBadge badge={rank} size="lg" />
            : <p className="text-ink-dim text-[14px]">No pudimos leer tu rango todavía (la cuenta puede ser privada o la API estar ocupada). Se reintenta solo.</p>}
        </div>
      )}

      {!editing && (
        saved ? (
          <a
            href={saved}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Ver perfil en StatLocker ↗
          </a>
        ) : (
          <p className="text-ink-dim text-[15px]">Todavía no vinculas tu perfil. Así los demás pueden ver tus partidas.</p>
        )
      )}

      {editing && (
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="mono-label text-[11px]">URL de StatLocker</span>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://statlocker.gg/profile/161957659"
              className="field"
              required
            />
          </label>
          {error && <p className="text-pink-ink text-[14px] font-bold">{error}</p>}
          <div className="flex gap-3 flex-wrap">
            <button
              type="submit"
              disabled={loading || !url}
              className="btn btn-primary flex-1"
            >
              {loading ? 'Guardando…' : 'Guardar →'}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setUrl(saved); setError(''); }}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
