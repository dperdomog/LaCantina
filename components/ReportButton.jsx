'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const REASONS = [
  ['spam',         'Spam'],
  ['ofensivo',     'Contenido ofensivo'],
  ['suplantacion', 'Suplantación'],
  ['trampas',      'Trampas'],
  ['otro',         'Otro'],
];

async function loginWithDiscord() {
  await createClient().auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo: `${window.location.origin}/auth/callback`, scopes: 'identify email' },
  });
}

// Botón "Reportar" que abre un formulario para avisar a los admins
export default function ReportButton({ targetType, targetId, isLoggedIn, className = '' }) {
  const [open, setOpen]       = useState(false);
  const [reason, setReason]   = useState('');
  const [details, setDetails] = useState('');
  const [state, setState]     = useState('idle'); // idle | sending | done
  const [error, setError]     = useState('');

  function close() {
    setOpen(false);
    if (state === 'done') { setState('idle'); setReason(''); setDetails(''); }
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!reason) { setError('Elige un motivo.'); return; }
    setState('sending'); setError('');
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_type: targetType, target_id: targetId, reason, details }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setState('idle'); setError(data.error ?? 'No se pudo enviar el reporte.'); return; }
    setState('done');
  }

  const title = targetType === 'post' ? 'Reportar publicación' : 'Reportar jugador';

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className={`text-[13px] font-bold text-ink-dim hover:text-pink-ink underline underline-offset-2 ${className}`}>
        🚩 Reportar
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-5"
          onClick={e => { if (e.target === e.currentTarget) close(); }}>
          <div className="sticker p-7 w-full max-w-[440px] relative" role="dialog" aria-modal="true" aria-label={title}>
            <button onClick={close} aria-label="Cerrar"
              className="absolute top-4 right-4 w-9 h-9 rounded-full border-[3px] border-line bg-surface-2 text-ink font-bold flex items-center justify-center hover:bg-yellow hover:text-on-color transition-colors">
              ✕
            </button>
            <span className="mono-label">🚩 Moderación</span>
            <h3 className="font-display text-[26px] leading-tight mt-1 pr-10">{title}</h3>

            {!isLoggedIn ? (
              <div className="mt-5 flex flex-col items-start gap-4">
                <p className="text-ink-dim text-[15px]">Inicia sesión para reportar.</p>
                <button onClick={loginWithDiscord} className="btn btn-discord btn-sm">Conectar Discord</button>
              </div>
            ) : state === 'done' ? (
              <div className="mt-5 flex flex-col items-start gap-4">
                <p className="text-[16px] font-semibold">Gracias, lo revisaremos.</p>
                <button onClick={close} className="btn btn-secondary btn-sm">Cerrar</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="mono-label">Motivo *</span>
                  <select value={reason} onChange={e => setReason(e.target.value)} className="field" required>
                    <option value="">Elige un motivo…</option>
                    {REASONS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="mono-label">Detalles (opcional)</span>
                  <textarea value={details} onChange={e => setDetails(e.target.value)} maxLength={300} rows={3}
                    placeholder="Cuéntanos qué pasó…" className="field resize-none" />
                  <span className="text-[12px] text-ink-dim self-end">{details.length}/300</span>
                </label>
                {error && (
                  <p className="px-4 py-3 bg-pink/15 border-[3px] border-line rounded-2xl text-pink-ink text-[14px] font-semibold">{error}</p>
                )}
                <button type="submit" disabled={state === 'sending'} className="btn btn-primary">
                  {state === 'sending' ? 'Enviando…' : 'Enviar reporte'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
