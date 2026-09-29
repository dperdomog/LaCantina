'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FORMATS, TIMERS, MAX_BANS } from '@/lib/draft';
import DraftOrderStrip from '@/components/DraftOrderStrip';
import { LocalTime } from '@/components/Countdown';

const STATUS = {
  lobby:     ['Sala de espera', 'bg-surface text-ink'],
  drafting:  ['En curso', 'bg-green text-on-color'],
  done:      ['Terminado', 'bg-ink text-bg'],
  cancelled: ['Cancelado', 'bg-surface-2 text-ink-dim'],
};

async function loginWithDiscord() {
  await createClient().auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo: `${window.location.origin}/auth/callback`, scopes: 'identify email' },
  });
}

function Pills({ label, options, value, onChange }) {
  return (
    <div>
      <span className="mono-label block mb-2">{label}</span>
      <div className="flex gap-2 flex-wrap">
        {options.map(([val, text]) => (
          <button key={String(val)} type="button" onClick={() => onChange(val)} aria-pressed={value === val}
            className={`pill !text-[14px] !py-2 !px-3.5 transition-transform hover:-translate-y-0.5 ${
              value === val ? 'bg-ink text-bg' : 'bg-surface text-ink'
            }`}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DraftCreate({ isLoggedIn, recent }) {
  const router = useRouter();
  const [format, setFormat] = useState('6v6');
  const [bans, setBans]     = useState(2);
  const [timer, setTimer]   = useState(30);
  const [nameA, setNameA]   = useState('Equipo A');
  const [nameB, setNameB]   = useState('Equipo B');
  const [side, setSide]     = useState('A');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [code, setCode]       = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format, bans_per_team: bans, timer_s: timer,
        name_a: nameA, name_b: nameB,
        side: side === 'none' ? undefined : side,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setLoading(false); setError(data.error ?? 'No se pudo crear la sala.'); return; }
    router.push(`/draft/${data.draft.id}`);
  }

  function handleJoin(e) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (/^[A-Z0-9]{6}$/.test(c)) router.push(`/draft/${c}`);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <span className="mono-label">🎯 Draft</span>
        <h1 className="font-display text-[clamp(40px,6vw,68px)] leading-[1] tracking-[-0.02em] mt-2">
          Draft de{' '}
          <mark className="bg-yellow text-on-color px-3 rounded-2xl border-[3px] border-line inline-block -rotate-2">picks</mark>
          {' '}y bans
        </h1>
        <p className="text-[18px] text-ink-dim mt-4 max-w-[640px]">
          Crea una sala, comparte el enlace y cada capitán elige su lado. Los demás miran el draft en vivo.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
        {/* Crear sala */}
        <form onSubmit={handleCreate} className="sticker p-6 md:p-7 flex flex-col gap-6 min-w-0">
          <span className="font-display text-[24px] leading-none">Nueva sala</span>

          <Pills label="Formato" value={format} onChange={setFormat}
            options={Object.keys(FORMATS).map(f => [f, f])} />
          <Pills label="Bans por equipo" value={bans} onChange={setBans}
            options={Array.from({ length: MAX_BANS + 1 }, (_, i) => [i, i === 0 ? '—' : String(i)])} />
          <Pills label="Tiempo por turno" value={timer} onChange={setTimer}
            options={TIMERS.map(t => [t, t === 0 ? 'Sin límite' : `${t}s`])} />

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="mono-label">Nombre del lado A</span>
              <input value={nameA} onChange={e => setNameA(e.target.value)} maxLength={40} required className="field" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="mono-label">Nombre del lado B</span>
              <input value={nameB} onChange={e => setNameB(e.target.value)} maxLength={40} required className="field" />
            </label>
          </div>

          <Pills label="Tu lado" value={side} onChange={setSide}
            options={[['A', `Lado A · ${nameA || 'Equipo A'}`], ['B', `Lado B · ${nameB || 'Equipo B'}`], ['none', 'Solo organizo']]} />

          <div>
            <span className="mono-label block mb-2">Orden</span>
            <DraftOrderStrip format={format} bans={bans} names={{ A: nameA, B: nameB }} />
            <p className="text-[13px] text-ink-dim mt-2">
              Picks en serpiente. {bans > 0
                ? 'La mitad de los bans va al principio y el resto a mitad del draft.'
                : 'Sin bans.'} Si se acaba el tiempo, el ban se pierde y el pick es al azar.
            </p>
          </div>

          {error && (
            <p className="px-4 py-3 bg-pink/15 border-[3px] border-line rounded-2xl text-pink-ink text-[14px] font-semibold">{error}</p>
          )}

          {isLoggedIn
            ? <button type="submit" disabled={loading} className="btn btn-primary self-start">{loading ? 'Creando…' : 'Crear sala →'}</button>
            : <button type="button" onClick={loginWithDiscord} className="btn btn-discord self-start">Inicia sesión con Discord</button>}
        </form>

        <div className="flex flex-col gap-6 min-w-0">
          {/* Unirse con código */}
          <form onSubmit={handleJoin} className="sticker p-6 flex flex-col gap-3">
            <span className="font-display text-[20px] leading-none">Unirte con código</span>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="ABC123"
              aria-label="Código de sala"
              className="field font-display text-[22px] tracking-[0.3em] text-center uppercase"
            />
            <button type="submit" disabled={code.length !== 6} className="btn btn-secondary btn-sm">Entrar a la sala →</button>
          </form>

          {/* Recientes */}
          {isLoggedIn && (
            <div className="sticker p-6">
              <span className="font-display text-[20px] leading-none">Tus drafts recientes</span>
              {recent.length === 0 ? (
                <p className="text-[14px] text-ink-dim mt-3">Todavía no tienes drafts.</p>
              ) : (
                <ul className="flex flex-col gap-2 mt-4">
                  {recent.map(d => {
                    const [label, cls] = STATUS[d.status] ?? STATUS.lobby;
                    return (
                      <li key={d.id}>
                        <a href={`/draft/${d.id}`}
                          className="flex items-center gap-3 p-3 rounded-2xl bg-surface-2 border-[3px] border-line no-underline text-ink hover:-translate-y-0.5 transition-transform">
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-bold truncate">{d.name_a} vs {d.name_b}</p>
                            <p className="text-[12px] text-ink-dim">{d.format} · {d.id} · <LocalTime iso={d.created_at} part="date" /></p>
                          </div>
                          <span className={`pill ${cls} shrink-0`}>{label}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
