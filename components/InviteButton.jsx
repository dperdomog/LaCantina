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
    <span className="pill bg-green text-on-color">✓ Invitación enviada</span>
  );

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button onClick={handleInvite} disabled={state === 'loading'} className="btn btn-primary btn-sm whitespace-nowrap">
        {state === 'loading' ? 'Enviando…' : 'Invitar al equipo →'}
      </button>
      {state === 'error' && <p className="text-pink-ink text-[13px] font-bold text-right">{msg}</p>}
    </div>
  );
}
