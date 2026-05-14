'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STATLOCKER_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
    <polyline points="13,2 13,9 20,9"/>
  </svg>
);

export default function OnboardingPage() {
  const router = useRouter();
  const [url, setUrl]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/rank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statlocker_url: url.trim() }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Ocurrió un error. Revisá la URL e intentá de nuevo.');
      return;
    }

    router.push('/');
  }

  function handleSkip() {
    router.push('/');
  }

  return (
    <main className="min-h-screen bg-[#06070a] flex items-center justify-center px-6">
      <div className="w-full max-w-[480px]">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="font-display text-[28px] text-ink mb-1">
            LA<span className="text-yellow">·</span>CANTINA
          </div>
          <span className="mono-label text-yellow">// SETUP DE PERFIL</span>
          <h1 className="font-display text-[clamp(36px,6vw,56px)] leading-none text-ink mt-4">
            VINCULÁ<br />TU <span className="gradient-text">RANGO.</span>
          </h1>
          <p className="text-ink-dim text-[14px] mt-4 leading-relaxed">
            Pegá la URL de tu perfil en StatLocker para vincularlo a tu cuenta en La Cantina.
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0d0f15] border border-[rgba(255,214,10,0.2)] rounded-[20px] p-7 glow-yellow">

          {/* Cómo encontrar la URL */}
          <div className="mb-6 p-4 bg-[#141823] rounded-[12px]">
            <span className="mono-label text-yellow block mb-2">¿Cómo encontrar tu URL?</span>
            <ol className="text-ink-dim text-[13px] flex flex-col gap-1.5 list-none">
              <li><span className="text-yellow font-bold">1.</span> Entrá a <a href="https://statlocker.gg" target="_blank" rel="noopener noreferrer" className="text-yellow hover:opacity-80 transition-opacity">statlocker.gg</a></li>
              <li><span className="text-yellow font-bold">2.</span> Buscá tu perfil por nombre de Steam</li>
              <li><span className="text-yellow font-bold">3.</span> Copiá la URL de la barra del navegador</li>
            </ol>
            <div className="mt-3 px-3 py-2 bg-[#06070a] rounded-[8px] font-mono text-[11px] text-ink-faint">
              https://statlocker.gg/profile/161957659
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="mono-label">URL de StatLocker</span>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://statlocker.gg/profile/161957659"
                className="field"
                required
              />
            </label>

            {error && (
              <div className="px-4 py-3 bg-pink/10 border border-pink/30 rounded-xl text-pink text-[13px]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !url}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-full bg-yellow text-[#0a0a0a] font-bold text-[15px] shadow-yellow-btn hover:opacity-90 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {STATLOCKER_ICON}
              {loading ? 'Vinculando…' : 'Vincular perfil →'}
            </button>

            <button
              type="button"
              onClick={handleSkip}
              className="w-full py-3 rounded-full bg-transparent border border-[rgba(241,237,229,0.08)] text-ink-dim text-[13px] font-medium hover:border-ink-dim transition-colors"
            >
              Saltar por ahora
            </button>
          </form>
        </div>

        <p className="text-center mono-label text-[10px] normal-case mt-5 text-ink-faint">
          Podés vincular o cambiar tu StatLocker en cualquier momento desde tu perfil.
        </p>
      </div>
    </main>
  );
}
