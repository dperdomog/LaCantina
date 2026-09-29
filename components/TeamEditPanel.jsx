'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const REGIONS     = ['LATAM', 'Argentina', 'México', 'Chile', 'Colombia', 'Brasil', 'Otra'];
const COMMITMENTS = ['Serio', 'Por diversión'];

// Formulario del capitán para editar descripción, región y compromiso
export default function TeamEditPanel({ team }) {
  const router = useRouter();
  const [description, setDescription] = useState(team.description ?? '');
  const [region, setRegion]           = useState(team.region ?? 'LATAM');
  const [commitment, setCommitment]   = useState(team.commitment ?? null);
  const [saving, setSaving]           = useState(false);
  const [msg, setMsg]                 = useState(null); // { ok, text }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    const res = await fetch('/api/teams', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: team.id, description, region, commitment }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setMsg({ ok: false, text: data.error }); return; }
    setMsg({ ok: true, text: 'Cambios guardados.' });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="mono-label">Descripción</span>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="Cuenta un poco de qué se trata el equipo…"
          className="field resize-none"
        />
        <span className="text-[12px] text-ink-dim self-end">{description.length}/300</span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="mono-label">Región</span>
        <select value={region} onChange={e => setRegion(e.target.value)} className="field">
          {REGIONS.map(r => <option key={r}>{r}</option>)}
        </select>
      </label>

      <div className="flex flex-col gap-2">
        <span className="mono-label">Compromiso</span>
        <div className="flex gap-2 flex-wrap">
          {COMMITMENTS.map(c => (
            <button key={c} type="button" onClick={() => setCommitment(commitment === c ? null : c)}
              className={`pill cursor-pointer ${
                commitment === c ? (c === 'Serio' ? 'bg-yellow text-on-color' : 'bg-cyan text-on-color') : 'bg-surface text-ink'
              }`}>
              {c === 'Serio' ? '⚡ Serio' : '🎮 Por diversión'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {msg && (
          <span className={`text-[14px] font-bold ${msg.ok ? 'text-green-ink' : 'text-pink-ink'}`}>{msg.text}</span>
        )}
      </div>
    </form>
  );
}
