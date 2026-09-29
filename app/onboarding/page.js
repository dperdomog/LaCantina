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
      setError(data.error ?? 'Ocurrió un error. Revisa la URL e intenta de nuevo.');
      return;
    }

    router.push('/');
  }

  function handleSkip() {
    router.push('/');
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-14 md:py-20">
      <div className="w-full max-w-[520px]">

        {/* Header */}
        <div className="text-center mb-10">
          <span className="mono-label">✨ Setup de perfil</span>
          <h1 className="font-display text-[clamp(40px,6vw,60px)] leading-[1] tracking-[-0.02em] text-ink mt-2">
            Vincula tu{' '}
            <mark className="bg-yellow text-on-color px-3 rounded-2xl border-[3px] border-line inline-block -rotate-2">rango</mark>
          </h1>
          <p className="text-ink-dim text-[18px] mt-4 leading-relaxed">
            Pega la URL de tu perfil en StatLocker para vincularlo a tu cuenta en La Cantina.
          </p>
        </div>

        {/* Card */}
        <div className="sticker p-6 md:p-8">

          {/* Cómo encontrar la URL */}
          <div className="mb-6 p-5 bg-surface-2 border-[3px] border-line rounded-2xl">
            <span className="mono-label block mb-3">¿Cómo encontrar tu URL?</span>
            <ol className="text-ink text-[15px] flex flex-col gap-2 list-none">
              <li><span className="font-display mr-1">1.</span> Entra a <a href="https://statlocker.gg" target="_blank" rel="noopener noreferrer" className="font-bold text-ink underline decoration-[3px] decoration-yellow underline-offset-2">statlocker.gg</a></li>
              <li><span className="font-display mr-1">2.</span> Busca tu perfil por nombre de Steam</li>
              <li><span className="font-display mr-1">3.</span> Copia la URL de la barra del navegador</li>
            </ol>
            <div className="mt-4 px-3 py-2 bg-surface border-2 border-line rounded-xl font-mono text-[12px] text-ink-dim break-all">
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
              <div className="px-4 py-3 bg-pink/15 border-[3px] border-line rounded-2xl text-pink-ink text-[14px] font-bold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !url}
              className="btn btn-primary w-full text-[17px]"
            >
              {STATLOCKER_ICON}
              {loading ? 'Vinculando…' : 'Vincular perfil →'}
            </button>

            <button
              type="button"
              onClick={handleSkip}
              className="btn btn-secondary w-full"
            >
              Saltar por ahora
            </button>
          </form>
        </div>

        <p className="text-center text-[14px] mt-6 text-ink-dim">
          Puedes vincular o cambiar tu StatLocker en cualquier momento desde tu perfil.
        </p>
      </div>
    </main>
  );
}
