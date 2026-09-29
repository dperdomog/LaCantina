'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import RankBadge from '@/components/RankBadge';
import CopyButton from '@/components/CopyButton';
import { RANK_OPTIONS, rankInfo } from '@/lib/ranks';
import { COUNTRIES, countryInfo } from '@/lib/countries';

const ROLES = ['Carry', 'Flex', 'Frontline', 'Support', 'Pick', 'Roamer'];
const ROLE_COLORS = {
  Carry: 'bg-yellow', Flex: 'bg-green', Frontline: 'bg-[#f97316]',
  Support: 'bg-cyan', Pick: 'bg-[#a78bfa]', Roamer: 'bg-pink',
};

function timeAgo(iso) {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso)) / 60000));
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} día${d > 1 ? 's' : ''}`;
}

async function loginWithDiscord() {
  await createClient().auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo: `${window.location.origin}/auth/callback`, scopes: 'identify email' },
  });
}

// Rango que muestra cada publicación: el mínimo pedido (equipos) o el del autor (jugadores)
const postRank = p => (p.kind === 'team' ? p.rank_min : p.author?.rank_badge) ?? null;

// ── Formulario para publicar ───────────────────────────────────────────────
function NewPostForm({ viewer, onDone }) {
  const router = useRouter();
  const [kind, setKind]         = useState('player');
  const [roles, setRoles]       = useState([]);
  const [rankMin, setRankMin]   = useState('');
  const [country, setCountry]   = useState('');
  const [schedule, setSchedule] = useState('');
  const [message, setMessage]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const toggleRole = r => setRoles(rs => (rs.includes(r) ? rs.filter(x => x !== r) : [...rs, r]));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/lfg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, roles, rank_min: kind === 'team' ? rankMin || null : null, country: country || null, schedule, message }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'No se pudo publicar.'); return; }
    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="sticker p-6 md:p-7 flex flex-col gap-5 mb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="font-display text-[22px]">Nueva publicación</span>
        <button type="button" onClick={onDone} className="btn btn-secondary btn-sm">Cancelar</button>
      </div>

      {/* Tipo */}
      <div className="flex gap-3 flex-wrap">
        {[
          ['player', '🙋 Busco equipo', 'bg-cyan'],
          ['team', viewer.captainTeam ? `🛡️ ${viewer.captainTeam.name} busca jugadores` : '🛡️ Busco jugadores (solo capitanes)', 'bg-orange'],
        ].map(([val, label, color]) => {
          const disabled = val === 'team' && !viewer.captainTeam;
          return (
            <button key={val} type="button" disabled={disabled} onClick={() => setKind(val)}
              className={`pill !text-[14px] !py-2.5 !px-4 transition-transform ${
                kind === val ? `${color} text-on-color` : 'bg-surface text-ink'
              } ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Roles */}
      <div>
        <span className="mono-label block mb-2">{kind === 'team' ? 'Roles que buscan' : 'Roles que juegas'}</span>
        <div className="flex gap-2 flex-wrap">
          {ROLES.map(r => (
            <button key={r} type="button" onClick={() => toggleRole(r)}
              className={`pill !py-2 transition-transform hover:-translate-y-0.5 ${
                roles.includes(r) ? `${ROLE_COLORS[r]} text-on-color` : 'bg-surface text-ink-dim'
              }`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kind === 'team' && (
          <label className="flex flex-col gap-1.5">
            <span className="mono-label">Rango mínimo</span>
            <select value={rankMin} onChange={e => setRankMin(e.target.value)} className="field">
              <option value="">Cualquiera</option>
              {RANK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">País</span>
          <select value={country} onChange={e => setCountry(e.target.value)} className="field">
            <option value="">Cualquiera</option>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
          </select>
        </label>
        <label className={`flex flex-col gap-1.5 ${kind === 'team' ? '' : 'sm:col-span-2'}`}>
          <span className="mono-label">Horario</span>
          <input value={schedule} onChange={e => setSchedule(e.target.value)} maxLength={120}
            placeholder="Ej: noches entre semana, GMT-5" className="field" />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="mono-label">Mensaje</span>
        <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={500} rows={4} required
          placeholder={kind === 'team'
            ? 'Cuenta qué buscan: nivel, compromiso, días de práctica…'
            : 'Cuéntale a los equipos cómo juegas y qué buscas…'}
          className="field resize-y" />
        <span className="text-[12px] text-ink-dim self-end">{message.length}/500</span>
      </label>

      {error && <p className="text-pink-ink text-[14px] font-bold">{error}</p>}
      <button type="submit" disabled={loading || !message.trim()} className="btn btn-primary self-start">
        {loading ? 'Publicando…' : 'Publicar →'}
      </button>
    </form>
  );
}

// ── Tarjeta de publicación ────────────────────────────────────────────────
function PostCard({ post, viewer }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const isTeam   = post.kind === 'team';
  const author   = post.author;
  const name     = author?.display_name ?? author?.discord_username ?? 'Jugador';
  const country  = countryInfo(post.country);
  const rank     = postRank(post);
  const canDelete = viewer && (viewer.id === post.author_id || viewer.isAdmin);

  async function handleDelete() {
    if (!confirm('¿Borrar esta publicación?')) return;
    setDeleting(true);
    const res = await fetch(`/api/lfg/${post.id}`, { method: 'DELETE' });
    setDeleting(false);
    if (res.ok) router.refresh();
  }

  return (
    <article className="sticker p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <span className={`pill text-on-color ${isTeam ? 'bg-orange' : 'bg-cyan'}`}>
          {isTeam ? '🛡️ Busca jugadores' : '🙋 Busca equipo'}
        </span>
        <span className="text-[12px] text-ink-dim whitespace-nowrap">{timeAgo(post.created_at)}</span>
      </div>

      {/* Quién */}
      <div className="flex items-center gap-3 min-w-0">
        {isTeam && post.team
          ? (post.team.logo_url
              ? <img src={post.team.logo_url} alt="" className="w-12 h-12 rounded-xl border-[3px] border-line object-cover shrink-0" />
              : <span className="w-12 h-12 rounded-xl border-[3px] border-line bg-orange font-display text-[20px] text-on-color inline-flex items-center justify-center shrink-0">{post.team.name[0].toUpperCase()}</span>)
          : (author?.avatar_url
              ? <img src={author.avatar_url} alt="" className="w-12 h-12 rounded-full border-[3px] border-line object-cover shrink-0" />
              : <span className="w-12 h-12 rounded-full border-[3px] border-line bg-cyan font-display text-[20px] text-on-color inline-flex items-center justify-center shrink-0">{name[0].toUpperCase()}</span>)}
        <div className="min-w-0">
          {isTeam && post.team
            ? <a href={`/equipos/${post.team.slug ?? post.team.id}`} className="font-display text-[20px] leading-tight text-ink no-underline hover:underline block truncate">{post.team.name}</a>
            : <a href={`/jugador/${post.author_id}`} className="font-display text-[20px] leading-tight text-ink no-underline hover:underline block truncate">{name}</a>}
          <p className="text-[13px] text-ink-dim truncate">
            {isTeam ? <>por <a href={`/jugador/${post.author_id}`} className="text-ink-dim underline underline-offset-2">{name}</a></> : null}
            {author?.discord_username ? `${isTeam ? ' · ' : ''}@${author.discord_username}` : ''}
          </p>
        </div>
      </div>

      {/* Detalles */}
      <div className="flex flex-wrap gap-2">
        {post.roles?.map(r => <span key={r} className={`pill text-on-color ${ROLE_COLORS[r] ?? 'bg-surface-2'}`}>{r}</span>)}
        {rank > 0 && (isTeam
          ? <span className="pill bg-surface text-ink">Rango {rankInfo(rank).tierName}+</span>
          : <RankBadge badge={rank} />)}
        {country && <span className="pill bg-surface text-ink">{country.flag} {country.name}</span>}
        {post.schedule && <span className="pill bg-surface text-ink">🕒 {post.schedule}</span>}
      </div>

      <p className="text-[15px] leading-relaxed whitespace-pre-line break-words">{post.message}</p>

      <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
        {author?.discord_username && <CopyButton text={author.discord_username} />}
        <a href={`/jugador/${post.author_id}`} className="btn btn-secondary btn-sm">Ver perfil</a>
        {canDelete && (
          <button onClick={handleDelete} disabled={deleting} className="btn btn-sm bg-red text-white ml-auto">
            {deleting ? 'Borrando…' : 'Borrar'}
          </button>
        )}
      </div>
    </article>
  );
}

// ── Página ────────────────────────────────────────────────────────────────
export default function TablonClient({ posts, viewer }) {
  const [creating, setCreating] = useState(false);
  const [kind, setKind]         = useState('all');
  const [role, setRole]         = useState('');
  const [country, setCountry]   = useState('');
  const [minRank, setMinRank]   = useState(0);

  const filtered = useMemo(() => posts.filter(p => {
    if (kind !== 'all' && p.kind !== kind) return false;
    if (role && !p.roles?.includes(role)) return false;
    if (country && p.country !== country) return false;
    if (minRank && !((postRank(p) ?? 0) >= minRank)) return false;
    return true;
  }), [posts, kind, role, country, minRank]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
        <div>
          <span className="mono-label">📌 Tablón</span>
          <h1 className="font-display text-[clamp(40px,6vw,68px)] leading-[1] tracking-[-0.02em] mt-2">
            Busco{' '}
            <mark className="bg-yellow text-on-color px-3 rounded-2xl border-[3px] border-line inline-block -rotate-2">equipo</mark>
            {' '}o jugadores
          </h1>
          <p className="text-[18px] text-ink-dim mt-4 max-w-[600px]">
            Publica qué buscas y encuentra con quién jugar. Las publicaciones duran 14 días.
          </p>
        </div>
        {!creating && (viewer
          ? <button onClick={() => setCreating(true)} className="btn btn-primary">+ Publicar</button>
          : <button onClick={loginWithDiscord} className="btn btn-discord">Conecta Discord para publicar</button>)}
      </div>

      {creating && viewer && <NewPostForm viewer={viewer} onDone={() => setCreating(false)} />}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-8 items-center">
        <div className="flex gap-2 flex-wrap">
          {[['all', 'Todo'], ['player', '🙋 Buscan equipo'], ['team', '🛡️ Buscan jugadores']].map(([val, label]) => (
            <button key={val} onClick={() => setKind(val)}
              className={`pill !py-2 transition-transform hover:-translate-y-0.5 ${kind === val ? 'bg-ink text-bg' : 'bg-surface text-ink'}`}>
              {label}
            </button>
          ))}
        </div>
        <select value={role} onChange={e => setRole(e.target.value)} aria-label="Rol" className="field !rounded-full !py-2 !w-auto text-[14px]">
          <option value="">Cualquier rol</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={minRank} onChange={e => setMinRank(Number(e.target.value))} aria-label="Rango" className="field !rounded-full !py-2 !w-auto text-[14px]">
          <option value={0}>Cualquier rango</option>
          {RANK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={country} onChange={e => setCountry(e.target.value)} aria-label="País" className="field !rounded-full !py-2 !w-auto text-[14px]">
          <option value="">Todos los países</option>
          {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
        </select>
      </div>

      {/* Publicaciones */}
      {filtered.length === 0 ? (
        <div className="sticker p-10 text-center max-w-[640px] mx-auto">
          <p className="font-display text-[26px]">{posts.length === 0 ? 'El tablón está vacío.' : 'Nada con esos filtros.'}</p>
          <p className="text-ink-dim mt-2">
            {posts.length === 0
              ? 'Sé el primero: publica si buscas equipo o si tu equipo busca jugadores.'
              : 'Prueba quitando algún filtro.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
          {filtered.map(p => <PostCard key={p.id} post={p} viewer={viewer} />)}
        </div>
      )}
    </div>
  );
}
