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
    <div className="sticker bg-cyan text-on-color p-6 col-span-full">
      <span className="font-display text-[15px] uppercase tracking-wider block mb-4">📨 Invitaciones pendientes</span>
      <div className="flex flex-col gap-3">
        {invitations.map(inv => (
          <div key={inv.id} className="flex items-center justify-between gap-4 flex-wrap bg-white text-[#1c1c1c] border-[3px] border-[#1c1c1c] rounded-2xl px-4 py-3">
            <div>
              <p className="font-display text-[20px] leading-tight">{inv.teams?.name ?? 'Equipo'}</p>
              <p className="text-[14px] mt-0.5">Te invitaron a unirte</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => respond(inv.id, true)}
                className="btn btn-primary btn-sm">
                Aceptar →
              </button>
              <button onClick={() => respond(inv.id, false)}
                className="btn btn-sm bg-white text-[#1c1c1c]">
                Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
