'use client';

import { useState } from 'react';

export default function InviteButton({ teamId, inviteeId }) {
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [msg, setMsg]     = useState('');

  async function handleInvite() {
    setState('loading');
    const res = await fetch('/api/teams/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitee_id: inviteeId }),
    });
    const data = await res.json();
    if (!res.ok) { setState('error'); setMsg(data.error); return; }
    setState('done');
  }

  if (state === 'done') return (
    <span className="mono-label text-green text-[10px]">✓ Invitación enviada</span>
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={handleInvite} disabled={state === 'loading'}
        className="px-5 py-2.5 rounded-full border border-yellow text-yellow font-bold text-[13px] hover:bg-yellow/10 transition-all disabled:opacity-50">
        {state === 'loading' ? 'Enviando…' : 'Invitar al equipo →'}
      </button>
      {state === 'error' && <p className="text-pink text-[11px]">{msg}</p>}
    </div>
  );
}
