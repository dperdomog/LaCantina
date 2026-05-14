'use client';

import { useState } from 'react';

export default function StatlockerForm({ initialUrl }) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl]         = useState(initialUrl ?? '');
  const [saved, setSaved]     = useState(initialUrl ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

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
    setEditing(false);
  }

  return (
    <div className="bg-[#0d0f15] border border-[rgba(241,237,229,0.08)] rounded-[16px] p-5 col-span-full">
      <div className="flex items-center justify-between mb-4">
        <span className="mono-label text-yellow">// DEADLOCK · STATLOCKER</span>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="mono-label text-[10px] text-ink-dim hover:text-yellow transition-colors"
          >
            {saved ? 'Editar →' : 'Vincular →'}
          </button>
        )}
      </div>

      {!editing && (
        saved ? (
          <a
            href={saved}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[rgba(255,214,10,0.3)] text-yellow text-[13px] font-semibold no-underline hover:bg-yellow/10 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Ver perfil en StatLocker ↗
          </a>
        ) : (
          <p className="text-ink-dim text-[13px]">No vinculado aún.</p>
        )
      )}

      {editing && (
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="mono-label text-[10px]">URL de StatLocker</span>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://statlocker.gg/profile/161957659"
              className="field text-[13px]"
              required
            />
          </label>
          {error && <p className="text-pink text-[12px]">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !url}
              className="flex-1 py-3 rounded-full bg-yellow text-[#0a0a0a] font-bold text-[13px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando…' : 'Guardar →'}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setUrl(saved); setError(''); }}
              className="px-5 py-3 rounded-full border border-[rgba(241,237,229,0.08)] text-ink-dim text-[13px] hover:border-ink-dim transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
