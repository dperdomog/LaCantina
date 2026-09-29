'use client';

import { useEffect, useMemo, useState } from 'react';

// Fechas en la hora local de quien mira: se formatea solo en el cliente
const LOCALE = 'es-MX';

const TYPE_PILL = {
  torneo: { label: '🏆 Torneo', cls: 'bg-yellow text-on-color' },
  evento: { label: '📣 Evento', cls: 'bg-cyan text-on-color' },
};

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
}

function groupByMonth(items) {
  const groups = [];
  for (const item of items) {
    const d = new Date(item.starts_at);
    const key = monthKey(d);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = { key, label: capitalize(d.toLocaleString(LOCALE, { month: 'long', year: 'numeric' })), items: [] };
      groups.push(g);
    }
    g.items.push(item);
  }
  return groups;
}

function ItemRow({ item, dim = false }) {
  const d       = new Date(item.starts_at);
  const day     = d.toLocaleString(LOCALE, { day: 'numeric' });
  const weekday = d.toLocaleString(LOCALE, { weekday: 'short' }).replace('.', '');
  const time    = d.toLocaleString(LOCALE, { hour: '2-digit', minute: '2-digit' });
  const type    = TYPE_PILL[item.kind];

  const body = (
    <div className={`sticker p-4 md:p-5 flex items-start gap-4 md:gap-5 transition-transform ${item.href ? 'hover:-translate-y-1' : ''} ${dim ? 'opacity-60' : ''}`}>
      {/* Bloque de fecha */}
      <div className={`shrink-0 w-[64px] md:w-[72px] rounded-2xl border-[3px] border-line text-center py-2 ${item.kind === 'torneo' ? 'bg-yellow' : 'bg-cyan'} text-on-color`}>
        <span className="block font-display text-[30px] md:text-[34px] leading-none">{day}</span>
        <span className="block text-[12px] font-bold uppercase tracking-wider mt-1">{weekday}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`pill ${type.cls}`}>{type.label}</span>
          <span className="text-[13px] font-bold text-ink-dim">{time}</span>
          {item.meta && <span className="text-[13px] text-ink-dim">· {item.meta}</span>}
        </div>
        <h3 className="font-display text-[20px] md:text-[22px] leading-tight text-ink mt-2 break-words">{item.title}</h3>
        {item.description && (
          <p className="text-[14px] text-ink-dim mt-1 line-clamp-2">{item.description}</p>
        )}
      </div>

      {item.href && (
        <span className="hidden sm:inline-flex self-center font-display text-[16px] text-ink shrink-0">
          {item.external ? 'Abrir ↗' : 'Ver →'}
        </span>
      )}
    </div>
  );

  if (!item.href) return body;
  return item.external
    ? <a href={item.href} target="_blank" rel="noopener noreferrer" className="block no-underline">{body}</a>
    : <a href={item.href} className="block no-underline">{body}</a>;
}

export default function CalendarioView({ upcoming, past }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const groups = useMemo(() => (mounted ? groupByMonth(upcoming) : []), [mounted, upcoming]);

  // En el servidor no se conoce la zona horaria de quien mira
  if (!mounted) {
    if (upcoming.length === 0) return null;
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        {[0, 1, 2].map(i => <div key={i} className="sticker h-[104px] opacity-40" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      {groups.map(g => (
        <section key={g.key}>
          <h2 className="font-display text-[26px] md:text-[30px] text-ink mb-5">{g.label}</h2>
          <div className="flex flex-col gap-4">
            {g.items.map(item => <ItemRow key={`${item.kind}-${item.id}`} item={item} />)}
          </div>
        </section>
      ))}

      {past.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none inline-flex items-center gap-2 font-display text-[20px] text-ink-dim hover:text-ink transition-colors">
            <span className="inline-block transition-transform group-open:rotate-90">▸</span>
            Pasados (últimos 30 días) · {past.length}
          </summary>
          <div className="flex flex-col gap-4 mt-5">
            {past.map(item => <ItemRow key={`${item.kind}-${item.id}`} item={item} dim />)}
          </div>
        </details>
      )}
    </div>
  );
}
