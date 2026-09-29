'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LIMITS } from '@/lib/board';
import { LocalTime } from '@/components/Countdown';

async function loginWithDiscord() {
  await createClient().auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo: `${window.location.origin}/auth/callback`, scopes: 'identify email' },
  });
}

export default function MapList({ isLoggedIn, boards: initialBoards }) {
  const router = useRouter();
  const [boards, setBoards]   = useState(initialBoards);
  const [title, setTitle]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [deleting, setDeleting] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setLoading(false); setError(data.error ?? 'No se pudo crear el mapa.'); return; }
    router.push(`/mapa/${data.board.id}`);
  }

  async function handleDelete(board) {
    if (!window.confirm(`¿Borrar "${board.title}"? No se puede deshacer.`)) return;
    setDeleting(board.id); setError('');
    const res = await fetch(`/api/boards/${board.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    setDeleting(null);
    if (!res.ok) { setError(data.error ?? 'No se pudo borrar el mapa.'); return; }
    setBoards(list => list.filter(b => b.id !== board.id));
  }

  return (
    <div>
      <div className="mb-10">
        <span className="mono-label">🗺️ Coaching</span>
        <h1 className="font-display text-[clamp(40px,6vw,68px)] leading-[1] tracking-[-0.02em] mt-2">
          Mapa de{' '}
          <mark className="bg-yellow text-on-color px-3 rounded-2xl border-[3px] border-line inline-block -rotate-2">coaching</mark>
        </h1>
        <p className="text-[18px] text-ink-dim mt-4 max-w-[640px]">
          Dibuja jugadas sobre el mapa nuevo y compártelas con tu equipo.
        </p>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-8 items-start">
        {/* Nuevo mapa */}
        <div className="sticker p-6 flex flex-col gap-4 min-w-0">
          <span className="font-display text-[24px] leading-none">Nuevo mapa</span>
          {isLoggedIn ? (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="mono-label">Título (opcional)</span>
                <input value={title} onChange={e => setTitle(e.target.value)} maxLength={LIMITS.title}
                  placeholder="Ej: Rotación a mid tras el titán" className="field" />
              </label>
              <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Creando…' : 'Crear mapa →'}</button>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[15px] text-ink-dim">Inicia sesión para crear y guardar tus mapas.</p>
              <button type="button" onClick={loginWithDiscord} className="btn btn-discord self-start">Inicia sesión con Discord</button>
            </div>
          )}
          {error && <p className="px-4 py-3 bg-pink/15 border-[3px] border-line rounded-2xl text-pink-ink text-[14px] font-semibold">{error}</p>}
          <p className="text-[13px] text-ink-dim border-t-2 border-rule pt-3">
            💡 Al terminar un <a href="/draft" className="font-bold text-ink underline underline-offset-2">draft</a>, el botón
            {' '}<b className="text-ink">Planificar en el mapa</b> abre un mapa con los 12 héroes elegidos.
          </p>
        </div>

        {/* Tus mapas */}
        <div className="min-w-0">
          <span className="font-display text-[24px] leading-none block mb-4">Tus mapas</span>
          {!isLoggedIn ? (
            <div className="sticker p-6"><p className="text-ink-dim">Cuando inicies sesión, acá vas a ver los mapas que creaste.</p></div>
          ) : boards.length === 0 ? (
            <div className="sticker p-6"><p className="text-ink-dim">Todavía no creaste ningún mapa. Empieza con uno nuevo.</p></div>
          ) : (
            <ul className="flex flex-col gap-3">
              {boards.map(b => (
                <li key={b.id} className="sticker p-4 flex items-center gap-3 flex-wrap">
                  <a href={`/mapa/${b.id}`} className="min-w-0 flex-1 basis-[200px] no-underline group">
                    <p className="font-display text-[19px] leading-tight text-ink truncate group-hover:underline">{b.title}</p>
                    <p className="text-[13px] text-ink-dim mt-0.5">
                      Editado <LocalTime iso={b.updated_at} /> · {b.id}{b.draft_id ? ' · desde un draft' : ''}
                    </p>
                  </a>
                  <a href={`/mapa/${b.id}`} className="btn btn-secondary btn-sm">Abrir</a>
                  <button type="button" onClick={() => handleDelete(b)} disabled={deleting === b.id}
                    className="btn btn-sm bg-red text-white">{deleting === b.id ? '…' : 'Borrar'}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
