'use client';

import { useState } from 'react';
import { heroInfo } from '@/lib/heroes';

export default function HeroesAdmin({ pendingIds, initialEnabled }) {
  const [enabled, setEnabled] = useState(() => new Set(initialEnabled));
  const [busy, setBusy]       = useState(null);
  const [error, setError]     = useState('');

  async function toggle(id) {
    const next = !enabled.has(id);
    setBusy(id); setError('');
    const res = await fetch('/api/admin/heroes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hero_id: id, enabled: next }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { setError(data.error ?? 'No se pudo guardar.'); return; }
    setEnabled(prev => {
      const s = new Set(prev);
      next ? s.add(id) : s.delete(id);
      return s;
    });
  }

  if (pendingIds.length === 0) {
    return (
      <div className="sticker p-6 mt-8 max-w-[640px]">
        <p className="text-ink-dim">No hay héroes pendientes. Cuando salga un parche con héroes nuevos, corre <code>npm run update:heroes</code> y aparecerán acá.</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {error && <p className="mb-4 px-4 py-3 bg-pink/15 border-[3px] border-line rounded-2xl text-pink-ink text-[14px] font-semibold">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {pendingIds.map(id => {
          const hero = heroInfo(id);
          const on = enabled.has(id);
          return (
            <div key={id} className="sticker p-4 flex items-center gap-4">
              {hero.card
                ? <img src={hero.card} alt="" className="w-16 h-20 object-cover rounded-xl border-[3px] border-line shrink-0" />
                : <div className="w-16 h-20 rounded-xl border-[3px] border-line bg-surface-2 shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="font-display text-[20px] leading-tight truncate">{hero.name}</p>
                <span className={`pill mt-1 ${on ? 'bg-green text-on-color' : 'bg-surface-2 text-ink'}`}>
                  {on ? '✓ En el draft' : 'Todavía no salió'}
                </span>
              </div>
              <button type="button" onClick={() => toggle(id)} disabled={busy === id}
                className={`btn btn-sm shrink-0 ${on ? 'btn-secondary' : 'btn-primary'}`}>
                {busy === id ? '…' : on ? 'Quitar' : 'Ya salió'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
