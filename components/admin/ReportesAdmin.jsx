'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LocalTime } from '@/components/Countdown';

const REASON_LABELS = {
  spam:         'Spam',
  ofensivo:     'Contenido ofensivo',
  suplantacion: 'Suplantación',
  trampas:      'Trampas',
  otro:         'Otro',
};

const STATUS_PILL = {
  resolved:  ['Resuelto', 'bg-green text-on-color'],
  dismissed: ['Descartado', 'bg-surface text-ink'],
};

function Avatar({ src, name }) {
  return src
    ? <img src={src} alt="" className="w-11 h-11 rounded-full border-[3px] border-line object-cover shrink-0" />
    : <span className="w-11 h-11 rounded-full border-[3px] border-line bg-yellow font-display text-[18px] text-on-color inline-flex items-center justify-center shrink-0">
        {(name ?? '?')[0].toUpperCase()}
      </span>;
}

// ── Tarjeta de un objetivo reportado ──────────────────────────────────────
function ReportGroup({ group, closed = false }) {
  const router = useRouter();
  const [busy, setBusy]           = useState('');
  const [error, setError]         = useState('');
  const [banning, setBanning]     = useState(false);
  const [banReason, setBanReason] = useState('');
  const [deletePosts, setDeletePosts] = useState(false);

  const { target_type, target_id, reports, post, profile } = group;
  const isPost   = target_type === 'post';
  const snap     = reports[0]?.snapshot ?? {};
  const latest   = reports[0];
  const personId = isPost ? snap.author_id : target_id;
  const personName = isPost
    ? (profile?.display_name ?? snap.author_name ?? 'Jugador')
    : (profile?.display_name ?? snap.display_name ?? snap.discord_username ?? 'Jugador');

  const reasonCounts = reports.reduce((acc, r) => ({ ...acc, [r.reason]: (acc[r.reason] ?? 0) + 1 }), {});

  async function call(label, url, init, { resolveAfter = false } = {}) {
    setBusy(label); setError('');
    const res = await fetch(url, init);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(''); setError(data.error ?? 'Algo salió mal.'); return false; }
    if (resolveAfter) await setStatus('resolved', true);
    setBusy('');
    router.refresh();
    return true;
  }

  async function setStatus(status, silent = false) {
    if (!silent) { setBusy(status); setError(''); }
    const res = await fetch(`/api/admin/reports/${latest.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && !silent) setError(data.error ?? 'Algo salió mal.');
    if (!silent) { setBusy(''); router.refresh(); }
  }

  function deletePost() {
    if (!confirm('¿Borrar esta publicación del tablón?')) return;
    call('delete', `/api/lfg/${target_id}`, { method: 'DELETE' }, { resolveAfter: true });
  }

  function clearBanner() {
    if (!confirm('¿Quitar el banner propio de este jugador?')) return;
    call('banner', `/api/admin/players/${target_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clear_banner: true }),
    });
  }

  async function ban(e) {
    e.preventDefault();
    const ok = await call('ban', `/api/admin/players/${personId}/ban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: banReason, delete_posts: deletePosts }),
    });
    if (ok) { setBanning(false); setBanReason(''); setDeletePosts(false); }
  }

  function unban() {
    if (!confirm(`¿Desbloquear a ${personName}?`)) return;
    call('unban', `/api/admin/players/${personId}/ban`, { method: 'DELETE' });
  }

  const banned = !!profile?.banned_at;

  return (
    <article className={`sticker p-6 flex flex-col gap-4 ${closed ? 'opacity-70' : ''}`}>
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`pill text-on-color ${isPost ? 'bg-orange' : 'bg-cyan'}`}>
            {isPost ? '📌 Publicación' : '👤 Perfil'}
          </span>
          <span className="pill bg-surface text-ink">{reports.length} reporte{reports.length === 1 ? '' : 's'}</span>
          {Object.entries(reasonCounts).map(([reason, n]) => (
            <span key={reason} className="pill bg-pink text-on-color">{REASON_LABELS[reason] ?? reason}{n > 1 ? ` ×${n}` : ''}</span>
          ))}
          {closed && STATUS_PILL[latest.status] && (
            <span className={`pill ${STATUS_PILL[latest.status][1]}`}>{STATUS_PILL[latest.status][0]}</span>
          )}
        </div>
        <span className="text-[12px] text-ink-dim whitespace-nowrap"><LocalTime iso={latest.created_at} /></span>
      </div>

      {/* Lo reportado */}
      <div className="bg-surface-2 border-[3px] border-line rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar src={isPost ? profile?.avatar_url : (profile?.avatar_url ?? snap.avatar_url)} name={personName} />
          <div className="min-w-0">
            {personId
              ? <a href={`/jugador/${personId}`} target="_blank" rel="noopener noreferrer" className="font-display text-[18px] text-ink no-underline hover:underline truncate block">{personName}</a>
              : <span className="font-display text-[18px] truncate block">{personName}</span>}
            <p className="text-[13px] text-ink-dim truncate">
              {(profile?.discord_username ?? snap.discord_username) ? `@${profile?.discord_username ?? snap.discord_username}` : ''}
            </p>
          </div>
          <div className="ml-auto flex gap-2 flex-wrap justify-end">
            {banned && <span className="pill bg-red text-white">Bloqueado</span>}
            {profile?.is_admin && <span className="pill bg-yellow text-on-color">Admin</span>}
          </div>
        </div>

        {isPost ? (
          <>
            <p className="text-[15px] leading-relaxed whitespace-pre-line break-words border-l-[3px] border-line pl-3">
              {snap.message ?? '—'}
            </p>
            {!post && <span className="pill bg-surface text-ink self-start">Publicación ya borrada</span>}
          </>
        ) : (
          (snap.banner || profile?.custom_banner_url) && (
            <div className="flex flex-col gap-2">
              <span className="mono-label">Banner {profile?.custom_banner_url ? 'propio actual' : 'al reportar'}</span>
              <img src={profile?.custom_banner_url ?? snap.banner} alt="" className="w-full max-h-[140px] object-cover rounded-xl border-[3px] border-line" />
            </div>
          )
        )}
        {banned && profile?.ban_reason && <p className="text-[13px] text-ink-dim"><b>Motivo del bloqueo:</b> {profile.ban_reason}</p>}
      </div>

      {/* Quién reportó */}
      <ul className="flex flex-col gap-2">
        {reports.map(r => (
          <li key={r.id} className="text-[14px]">
            <b>{r.reporter?.display_name ?? r.reporter?.discord_username ?? 'Alguien'}</b>
            <span className="text-ink-dim"> · {REASON_LABELS[r.reason] ?? r.reason} · <LocalTime iso={r.created_at} /></span>
            {r.details && <p className="text-ink-dim mt-0.5 break-words">“{r.details}”</p>}
          </li>
        ))}
      </ul>

      {error && (
        <p className="px-4 py-3 bg-pink/15 border-[3px] border-line rounded-2xl text-pink-ink text-[14px] font-semibold">{error}</p>
      )}

      {/* Bloquear */}
      {banning && (
        <form onSubmit={ban} className="bg-surface-2 border-[3px] border-line rounded-2xl p-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="mono-label">Motivo del bloqueo (lo verá el jugador)</span>
            <input value={banReason} onChange={e => setBanReason(e.target.value)} maxLength={200}
              placeholder="Ej: spam en el tablón" className="field" />
          </label>
          <label className="flex items-center gap-2 text-[14px] font-semibold cursor-pointer">
            <input type="checkbox" checked={deletePosts} onChange={e => setDeletePosts(e.target.checked)} className="w-4 h-4 accent-[#ffd400]" />
            y borrar sus publicaciones del tablón
          </label>
          <div className="flex gap-2 flex-wrap">
            <button type="submit" disabled={!!busy} className="btn btn-sm bg-red text-white">
              {busy === 'ban' ? 'Bloqueando…' : `Bloquear a ${personName}`}
            </button>
            <button type="button" onClick={() => setBanning(false)} className="btn btn-secondary btn-sm">Cancelar</button>
          </div>
        </form>
      )}

      {/* Acciones */}
      <div className="flex gap-2 flex-wrap pt-1">
        {!closed && isPost && post && (
          <button onClick={deletePost} disabled={!!busy} className="btn btn-sm bg-red text-white">
            {busy === 'delete' ? 'Borrando…' : 'Borrar publicación'}
          </button>
        )}
        {!closed && !isPost && profile?.custom_banner_url && (
          <button onClick={clearBanner} disabled={!!busy} className="btn btn-secondary btn-sm">
            {busy === 'banner' ? 'Quitando…' : 'Quitar banner'}
          </button>
        )}
        {personId && profile && !profile.is_admin && !banned && !banning && (
          <button onClick={() => setBanning(true)} disabled={!!busy} className="btn btn-sm bg-red text-white">Bloquear usuario</button>
        )}
        {personId && banned && (
          <button onClick={unban} disabled={!!busy} className="btn btn-secondary btn-sm">
            {busy === 'unban' ? 'Desbloqueando…' : 'Desbloquear'}
          </button>
        )}
        {!closed && (
          <>
            <button onClick={() => setStatus('resolved')} disabled={!!busy} className="btn btn-primary btn-sm ml-auto">
              {busy === 'resolved' ? 'Guardando…' : 'Marcar resuelto'}
            </button>
            <button onClick={() => setStatus('dismissed')} disabled={!!busy} className="btn btn-secondary btn-sm">
              {busy === 'dismissed' ? 'Guardando…' : 'Descartar'}
            </button>
          </>
        )}
      </div>
    </article>
  );
}

// ── Página ────────────────────────────────────────────────────────────────
export default function ReportesAdmin({ openGroups, closedGroups }) {
  return (
    <div className="mt-8 flex flex-col gap-8">
      {openGroups.length === 0 ? (
        <div className="sticker p-10 text-center">
          <p className="font-display text-[26px]">Todo tranquilo por aquí. 🍻</p>
          <p className="text-ink-dim mt-2">No hay reportes abiertos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {openGroups.map(g => <ReportGroup key={g.key} group={g} />)}
        </div>
      )}

      {closedGroups.length > 0 && (
        <details className="group">
          <summary className="font-display text-[20px] cursor-pointer select-none list-none flex items-center gap-2">
            <span className="transition-transform group-open:rotate-90">▶</span>
            Cerrados recientes ({closedGroups.length})
          </summary>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mt-5">
            {closedGroups.map(g => <ReportGroup key={g.key} group={g} closed />)}
          </div>
        </details>
      )}
    </div>
  );
}
