'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Fecha en la zona horaria del navegador (el servidor corre en UTC)
function LocalTime({ iso }) {
  const [text, setText] = useState('');
  useEffect(() => {
    setText(new Date(iso).toLocaleString('es-MX', {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    }));
  }, [iso]);
  return <time dateTime={iso}>{text || '…'}</time>;
}

function ProposeForm({ teamId, rivals, onDone }) {
  const [toTeam, setToTeam]   = useState('');
  const [when, setWhen]       = useState('');
  const [message, setMessage] = useState('');
  const [minWhen, setMinWhen] = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  // Mínimo = ahora, en hora local (formato de datetime-local)
  useEffect(() => {
    const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    setMinWhen(d.toISOString().slice(0, 16));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await fetch('/api/scrims', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_team:   teamId,
        to_team:     toTeam,
        proposed_at: new Date(when).toISOString(), // datetime-local se interpreta en hora local
        message,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    onDone();
  }

  if (rivals.length === 0) {
    return <p className="text-[14px] text-ink-dim">Todavía no hay otros equipos a los que proponerles un scrim.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5 bg-surface-2 border-[3px] border-line rounded-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className="mono-label">Equipo rival</span>
          <select value={toTeam} onChange={e => setToTeam(e.target.value)} required className="field">
            <option value="">Elige un equipo…</option>
            {rivals.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="mono-label">Fecha y hora</span>
          <input type="datetime-local" value={when} min={minWhen} onChange={e => setWhen(e.target.value)} required className="field" />
        </label>
      </div>
      <label className="flex flex-col gap-2">
        <span className="mono-label">Mensaje (opcional)</span>
        <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={300} rows={2}
          placeholder="Ej: Bo3, servidor NA, traemos 6." className="field resize-none" />
      </label>
      <div className="flex items-center gap-3 flex-wrap">
        <button type="submit" disabled={saving || !toTeam || !when} className="btn btn-primary btn-sm">
          {saving ? 'Enviando…' : 'Enviar propuesta →'}
        </button>
        {error && <span className="text-pink-ink text-[14px] font-bold">{error}</span>}
      </div>
    </form>
  );
}

// Scrims del equipo: solo lo ven sus miembros; el capitán propone y responde
export default function ScrimsSection({ teamId, isCaptain, scrims, rivals }) {
  const router = useRouter();
  const [proposing, setProposing] = useState(false);
  const [busy, setBusy]           = useState(null);
  const [error, setError]         = useState('');

  async function setStatus(id, status) {
    if (status === 'cancelled' && !confirm('¿Cancelar este scrim?')) return;
    setBusy(id); setError('');
    const res = await fetch(`/api/scrims/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) { setError(data.error); return; }
    router.refresh();
  }

  return (
    <div className="sticker p-6 md:p-8 mb-8">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <h2 className="font-display text-[30px] leading-none text-ink">🎯 Scrims</h2>
          <p className="text-[14px] text-ink-dim mt-2">Partidas de práctica con otros equipos. Solo las ven los miembros de tu equipo.</p>
        </div>
        {isCaptain && !proposing && (
          <button type="button" onClick={() => setProposing(true)} className="btn btn-secondary btn-sm">+ Proponer scrim</button>
        )}
      </div>

      {isCaptain && proposing && (
        <div className="mb-5">
          <ProposeForm teamId={teamId} rivals={rivals} onDone={() => { setProposing(false); router.refresh(); }} />
          <button type="button" onClick={() => setProposing(false)} className="text-[13px] font-bold text-ink-dim underline underline-offset-2 mt-3">
            Cancelar
          </button>
        </div>
      )}

      {scrims.length === 0 ? (
        <p className="text-[15px] text-ink-dim">No hay scrims programados.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {scrims.map(s => {
            const received = s.direction === 'received';
            return (
              <div key={s.id} className="flex items-center gap-4 flex-wrap p-4 rounded-2xl bg-surface-2 border-[3px] border-line">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-[16px] font-bold text-ink">
                    vs{' '}
                    <a href={`/equipos/${s.other.slug ?? s.other.id}`} className="text-ink underline underline-offset-2">{s.other.name}</a>
                  </p>
                  <p className="text-[14px] text-ink-dim mt-0.5"><LocalTime iso={s.proposed_at} /></p>
                  {s.message && <p className="text-[14px] text-ink mt-2 italic break-words">“{s.message}”</p>}
                </div>

                {s.status === 'accepted' && <span className="pill bg-green text-on-color">✓ Confirmado</span>}
                {s.status === 'pending' && (
                  <span className={`pill ${received ? 'bg-yellow text-on-color' : 'bg-surface text-ink'}`}>
                    {received ? 'Te lo propusieron' : 'Esperando respuesta'}
                  </span>
                )}

                {isCaptain && (
                  <div className="flex gap-2 flex-wrap">
                    {s.status === 'pending' && received && (
                      <>
                        <button type="button" disabled={busy === s.id} onClick={() => setStatus(s.id, 'accepted')} className="btn btn-primary btn-sm">Aceptar</button>
                        <button type="button" disabled={busy === s.id} onClick={() => setStatus(s.id, 'declined')} className="btn btn-secondary btn-sm">Rechazar</button>
                      </>
                    )}
                    {((s.status === 'pending' && !received) || s.status === 'accepted') && (
                      <button type="button" disabled={busy === s.id} onClick={() => setStatus(s.id, 'cancelled')} className="btn btn-sm bg-red text-white">Cancelar</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {error && <p className="text-pink-ink text-[14px] font-bold mt-3">{error}</p>}
    </div>
  );
}
