'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { COUNTRIES } from '@/lib/countries';

// País del jugador (se usa en el directorio, el tablón y el ranking)
export default function CountryForm({ initialCountry }) {
  const router = useRouter();
  const [country, setCountry] = useState(initialCountry ?? '');
  const [status, setStatus]   = useState('idle'); // idle | saving | saved | error
  const [msg, setMsg]         = useState('');

  async function handleSave(e) {
    e.preventDefault();
    setStatus('saving'); setMsg('');
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: country || null }),
    });
    const json = await res.json();
    if (!res.ok) { setStatus('error'); setMsg(json.error ?? 'Error al guardar'); return; }
    setStatus('saved'); setMsg('¡Guardado!');
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="sticker p-6 flex flex-col gap-3">
      <span className="mono-label">🌎 País</span>
      <p className="text-[14px] text-ink-dim">Así te encuentran equipos de tu zona y horario.</p>
      <select
        value={country}
        onChange={e => { setCountry(e.target.value); setStatus('idle'); setMsg(''); }}
        className="field"
      >
        <option value="">Sin especificar</option>
        {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
      </select>
      <div className="flex items-center gap-3 flex-wrap">
        <button type="submit" disabled={status === 'saving'} className="btn btn-primary btn-sm">
          {status === 'saving' ? 'Guardando…' : 'Guardar'}
        </button>
        {msg && <span className={`text-[13px] font-bold ${status === 'error' ? 'text-pink-ink' : 'text-green-ink'}`}>{msg}</span>}
      </div>
    </form>
  );
}
