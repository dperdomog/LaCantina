'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Crea un mapa de coaching con los picks de un draft terminado y lo abre
export default function PlanOnMapButton({ draftId }) {
  const router = useRouter();
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');

  async function plan() {
    setBusy(true); setError('');
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft_id: draftId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); setError(data.error ?? 'No se pudo crear el mapa.'); return; }
    router.push(`/mapa/${data.board.id}`);
  }

  return (
    <>
      <button type="button" onClick={plan} disabled={busy} className="btn btn-secondary">
        {busy ? 'Creando mapa…' : '🗺️ Planificar en el mapa'}
      </button>
      {error && <p className="basis-full text-pink-ink text-[14px] font-semibold">{error}</p>}
    </>
  );
}
