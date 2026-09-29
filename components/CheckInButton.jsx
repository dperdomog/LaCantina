'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LocalTime } from '@/components/Countdown';

// Check-in del capitán: habilitado entre (inicio - checkinMinutes) y el inicio
export default function CheckInButton({ registrationId, startsAt, checkinMinutes = 60, checkedInAt, bracketReady }) {
  const router = useRouter();
  const [now, setNow]         = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  const start = new Date(startsAt).getTime();
  const opens = start - checkinMinutes * 60000;
  const opensIso = new Date(opens).toISOString();

  async function checkIn() {
    setLoading(true); setError('');
    const res  = await fetch('/api/tournaments/checkin', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ registration_id: registrationId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'No se pudo hacer el check-in'); return; }
    router.refresh();
  }

  let content;
  if (checkedInAt) {
    content = <span className="pill bg-green text-on-color text-[14px]">✓ Check-in hecho</span>;
  } else if (now === null) {
    content = null;
  } else if (bracketReady || now > start) {
    content = <span className="pill bg-surface-2 text-ink-dim text-[14px]">Check-in cerrado</span>;
  } else if (now < opens) {
    content = <p className="text-[15px] text-ink-dim">El check-in abre el <b className="text-ink"><LocalTime iso={opensIso} /></b>.</p>;
  } else {
    content = (
      <button onClick={checkIn} disabled={loading} className="btn btn-primary">
        {loading ? 'Confirmando…' : 'Hacer check-in ✓'}
      </button>
    );
  }

  return (
    <div className="sticker p-5 flex items-center gap-4 flex-wrap">
      <div className="flex-1 min-w-[220px]">
        <span className="font-display text-[18px]">Check-in de tu inscripción</span>
        <p className="text-[14px] text-ink-dim mt-0.5">
          Confirma que vas a jugar. Abre {checkinMinutes} min antes del inicio; sin check-in podrías quedar fuera de la llave.
        </p>
      </div>
      <div className="flex flex-col items-start gap-1">
        {content}
        {error && <p className="text-pink-ink text-[13px] font-semibold">{error}</p>}
      </div>
    </div>
  );
}
