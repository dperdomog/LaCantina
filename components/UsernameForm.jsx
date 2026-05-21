'use client';

import { useState } from 'react';

export default function UsernameForm({ initialDisplayName, discordName }) {
  const [value,   setValue]   = useState(initialDisplayName ?? '');
  const [status,  setStatus]  = useState(null); // 'saving' | 'saved' | 'error'
  const [msg,     setMsg]     = useState('');

  async function handleSave(e) {
    e.preventDefault();
    setStatus('saving');
    setMsg('');

    const res = await fetch('/api/profile', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ display_name: value.trim() || null }),
    });
    const json = await res.json();

    if (!res.ok) {
      setStatus('error');
      setMsg(json.error ?? 'Error al guardar');
    } else {
      setStatus('saved');
      setMsg('Guardado');
      setTimeout(() => setStatus(null), 2500);
    }
  }

  return (
    <div className="bg-[#0d0f15] border border-[rgba(241,237,229,0.08)] rounded-[16px] p-5">
      <span className="mono-label text-yellow block mb-3">// IDENTIDAD</span>

      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <div>
          <label className="mono-label text-[10px] block mb-1.5">
            Nombre personalizado
            <span className="text-ink-dim ml-1">(opcional)</span>
          </label>
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={discordName ?? 'Tu nombre en Discord'}
            maxLength={32}
            className="w-full bg-[#06070a] border border-[rgba(241,237,229,0.10)] rounded-[10px] px-3 py-2 text-ink text-[14px] placeholder:text-ink-dim/50 focus:outline-none focus:border-yellow/40 transition-colors"
          />
          <p className="text-ink-dim text-[11px] mt-1.5">
            Si lo dejás vacío, se usa tu nombre de Discord.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={status === 'saving'}
            className="px-4 py-2 rounded-full bg-yellow text-[#0a0a0a] font-bold text-[12px] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {status === 'saving' ? 'Guardando…' : 'Guardar'}
          </button>
          {msg && (
            <span className={`mono-label text-[10px] ${status === 'error' ? 'text-red-400' : 'text-yellow'}`}>
              {msg}
            </span>
          )}
        </div>
      </form>

      <div className="mt-4 pt-4 border-t border-[rgba(241,237,229,0.06)]">
        <dt className="mono-label text-[10px] mb-0.5">Username de Discord</dt>
        <dd className="text-ink-dim text-[13px]">
          {discordName ? `@${discordName}` : '—'}
        </dd>
      </div>
    </div>
  );
}
