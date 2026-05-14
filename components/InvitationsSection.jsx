'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InvitationsSection({ invitations }) {
  const router = useRouter();

  async function respond(invId, accept) {
    await fetch('/api/teams/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'invitation', id: invId, accept }),
    });
    router.refresh();
  }

  if (!invitations?.length) return null;

  return (
    <div className="bg-[#0d0f15] border border-[rgba(127,227,255,0.25)] rounded-[16px] p-5 col-span-full">
      <span className="mono-label text-cyan block mb-4">// INVITACIONES PENDIENTES</span>
      <div className="flex flex-col gap-4">
        {invitations.map(inv => (
          <div key={inv.id} className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-ink text-[14px] font-semibold">{inv.teams?.name ?? 'Equipo'}</p>
              <p className="mono-label text-[10px] mt-0.5">Te invitaron a unirte</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => respond(inv.id, true)}
                className="px-4 py-2 rounded-full bg-yellow text-[#0a0a0a] font-bold text-[13px] hover:opacity-90 transition-opacity">
                Aceptar →
              </button>
              <button onClick={() => respond(inv.id, false)}
                className="px-4 py-2 rounded-full border border-[rgba(241,237,229,0.08)] text-ink-dim text-[13px] hover:border-ink-dim transition-colors">
                Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
