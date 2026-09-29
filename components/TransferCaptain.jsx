'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// El capitán elige a otro miembro y le pasa la capitanía
export default function TransferCaptain({ teamId, members }) {
  const router = useRouter();
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  if (members.length === 0) {
    return <p className="text-[14px] text-ink-dim">Cuando haya más miembros en el equipo vas a poder pasarle la capitanía a alguno.</p>;
  }

  async function handleTransfer() {
    const member = members.find(m => m.id === target);
    if (!member) return;
    if (!confirm(`¿Pasarle la capitanía a ${member.name}? Dejarás de ser el capitán.`)) return;
    setSaving(true); setError('');
    const res = await fetch('/api/teams/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: teamId, new_captain_id: target }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3 flex-wrap items-center">
        <select value={target} onChange={e => setTarget(e.target.value)} className="field flex-1 min-w-[200px]">
          <option value="">Elige un miembro…</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <button type="button" onClick={handleTransfer} disabled={!target || saving} className="btn btn-secondary btn-sm">
          {saving ? 'Pasando…' : 'Pasar capitanía'}
        </button>
      </div>
      {error && <p className="text-pink-ink text-[14px] font-bold">{error}</p>}
    </div>
  );
}
