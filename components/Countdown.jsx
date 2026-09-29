'use client';

import { useEffect, useState } from 'react';

const DATE_OPTS = { weekday: 'short', day: 'numeric', month: 'short' };
const TIME_OPTS = { hour: '2-digit', minute: '2-digit' };

// Fecha/hora en la zona horaria del visitante (se muestra después de montar
// para no chocar con el render del servidor, que está en UTC)
export function LocalTime({ iso, part = 'both', fallback = '' }) {
  const [text, setText] = useState(null);
  useEffect(() => {
    const d = new Date(iso);
    const date = d.toLocaleDateString('es-MX', DATE_OPTS);
    const time = d.toLocaleTimeString('es-MX', TIME_OPTS);
    setText(part === 'date' ? date : part === 'time' ? time : `${date}, ${time}`);
  }, [iso, part]);
  return <>{text ?? fallback}</>;
}

function split(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
}

// Cuenta regresiva hasta el inicio del torneo
export default function Countdown({ startsAt }) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now === null) return null;
  const left = new Date(startsAt).getTime() - now;
  if (left <= 0) return null;

  const { d, h, m, s } = split(left);
  const units = [[d, 'días'], [h, 'horas'], [m, 'min'], [s, 'seg']].filter(([v], i) => i > 0 || v > 0);

  return (
    <div className="sticker bg-cyan text-on-color p-5 flex items-center gap-5 flex-wrap">
      <div>
        <span className="font-display text-[15px] uppercase tracking-wider">⏳ Empieza en</span>
        <p className="text-[14px] mt-0.5"><LocalTime iso={startsAt} /></p>
      </div>
      <div className="flex gap-2 ml-auto">
        {units.map(([v, label]) => (
          <div key={label} className="bg-white border-[3px] border-[#1c1c1c] rounded-2xl px-3 py-2 text-center min-w-[62px]">
            <span className="font-display text-[26px] leading-none block">{String(v).padStart(2, '0')}</span>
            <span className="text-[11px] font-bold uppercase">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
