'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TeamActions({ teamId, isMember, isCaptain, canApply, hasApplied, isLoggedIn }) {
  const router = useRouter();
  const [applying, setApplying] = useState(false);
  const [applied, setApplied]   = useState(hasApplied);
  const [error, setError]       = useState('');

  async function handleApply() {
    setApplying(true); setError('');
    const res = await fetch('/api/teams/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: teamId }),
    });
    const data = await res.json();
    setApplying(false);
    if (!res.ok) { setError(data.error); return; }
    setApplied(true);
  }

  async function handleLeave() {
    if (!confirm(isCaptain ? '¿Disolver el equipo? Esta acción no se puede deshacer.' : '¿Salir del equipo?')) return;
    await fetch('/api/teams/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: teamId }),
    });
    router.push('/equipos');
  }

  if (!isLoggedIn) return (
    <div className="mt-6 pt-6 border-t-[3px] border-line">
      <p className="text-[15px] font-bold text-ink-dim">Conecta Discord para aplicar a este equipo.</p>
    </div>
  );

  return (
    <div className="mt-6 pt-6 border-t-[3px] border-line flex items-center gap-3 flex-wrap">
      {canApply && !applied && (
        <button onClick={handleApply} disabled={applying} className="btn btn-primary">
          {applying ? 'Enviando…' : 'Aplicar al equipo →'}
        </button>
      )}
      {applied && !isMember && (
        <span className="pill bg-green text-on-color">✓ Solicitud enviada — el capitán la revisará pronto.</span>
      )}
      {isMember && !isCaptain && (
        <button onClick={handleLeave} className="btn btn-sm bg-red text-white">
          Salir del equipo
        </button>
      )}
      {isCaptain && (
        <button onClick={handleLeave} className="btn btn-sm bg-red text-white">
          Disolver equipo
        </button>
      )}
      {error && <p className="text-pink-ink text-[14px] font-bold">{error}</p>}
    </div>
  );
}
