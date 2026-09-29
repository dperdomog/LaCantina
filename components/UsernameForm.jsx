'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UsernameForm({ initialDisplayName, discordUsername }) {
  const router = useRouter();
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
      setMsg('¡Guardado!');
      // Refrescar los datos del server component para que el nombre
      // se actualice en la cabecera sin recargar toda la página
      router.refresh();
      setTimeout(() => setStatus(null), 2500);
    }
  }

  return (
    <div className="sticker p-6">
      <span className="mono-label block mb-4">🪪 Identidad</span>

      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <div>
          <label className="mono-label text-[11px] block mb-2">
            Nombre personalizado
            <span className="normal-case tracking-normal font-medium ml-1">(opcional)</span>
          </label>
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Tu nombre en La Cantina"
            maxLength={32}
            className="field"
          />
          <p className="text-ink-dim text-[13px] mt-2">
            Reemplaza tu nombre de Discord. Déjalo vacío para usar el de Discord.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={status === 'saving'}
            className="btn btn-primary btn-sm"
          >
            {status === 'saving' ? 'Guardando…' : 'Guardar'}
          </button>
          {msg && (
            <span className={`text-[14px] font-bold ${status === 'error' ? 'text-pink-ink' : 'text-green-ink'}`}>
              {msg}
            </span>
          )}
        </div>
      </form>

      {/* Discord handle — solo lectura, para poder agregar al jugador */}
      {discordUsername && (
        <div className="mt-5 pt-5 border-t-[3px] border-line">
          <p className="mono-label text-[11px] mb-1.5">Usuario de Discord</p>
          <div className="flex items-center gap-2">
            <span className="text-ink text-[16px] font-bold break-all">@{discordUsername}</span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(discordUsername)}
              className="pill bg-surface-2 text-ink hover:bg-yellow hover:text-on-color transition-colors"
            >
              Copiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
