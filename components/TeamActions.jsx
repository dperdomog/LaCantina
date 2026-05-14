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
    <div className="mt-6 pt-6 border-t border-[rgba(241,237,229,0.08)]">
      <p className="mono-label text-ink-dim text-[11px]">Conectá Discord para aplicar a este equipo.</p>
    </div>
  );

  return (
    <div className="mt-6 pt-6 border-t border-[rgba(241,237,229,0.08)] flex items-center gap-3 flex-wrap">
      {canApply && !applied && (
        <button onClick={handleApply} disabled={applying}
          className="px-6 py-3 rounded-full bg-yellow text-[#0a0a0a] font-bold text-[14px] shadow-yellow-btn hover:opacity-90 transition-all disabled:opacity-50">
          {applying ? 'Enviando…' : 'Aplicar al equipo →'}
        </button>
      )}
      {applied && !isMember && (
        <span className="mono-label text-green text-[11px]">✓ Solicitud enviada — el capitán la revisará pronto.</span>
      )}
      {isMember && !isCaptain && (
        <button onClick={handleLeave}
          className="px-5 py-2.5 rounded-full border border-pink/40 text-pink text-[13px] font-semibold hover:bg-pink/10 transition-colors">
          Salir del equipo
        </button>
      )}
      {isCaptain && (
        <button onClick={handleLeave}
          className="px-5 py-2.5 rounded-full border border-pink/40 text-pink text-[13px] font-semibold hover:bg-pink/10 transition-colors">
          Disolver equipo
        </button>
      )}
      {error && <p className="text-pink text-[12px]">{error}</p>}
    </div>
  );
}
