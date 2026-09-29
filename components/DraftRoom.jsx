'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FORMATS, currentTurn, summary } from '@/lib/draft';
import { ACTIVE_HERO_IDS, heroInfo } from '@/lib/heroes';
import DraftOrderStrip, { SIDE_STYLE } from '@/components/DraftOrderStrip';
import HeroPortrait from '@/components/HeroPortrait';

const STATUS = {
  lobby:     ['Sala de espera', 'bg-surface text-ink'],
  drafting:  ['En curso', 'bg-green text-on-color'],
  done:      ['Terminado', 'bg-ink text-bg'],
  cancelled: ['Cancelado', 'bg-surface-2 text-ink-dim'],
};
const STATUS_RANK = { lobby: 0, drafting: 1, done: 2, cancelled: 2 };

async function loginWithDiscord() {
  await createClient().auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo: `${window.location.origin}/auth/callback`, scopes: 'identify email' },
  });
}

// Buscar sin acentos ni mayúsculas
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Quedarse con la versión más avanzada de la sala (los eventos pueden llegar desordenados)
function newer(prev, next) {
  if (!prev) return next;
  if (!next) return prev;
  const bySteps = (next.actions?.length ?? 0) - (prev.actions?.length ?? 0);
  if (bySteps !== 0) return bySteps > 0 ? next : prev;
  const byStatus = (STATUS_RANK[next.status] ?? 0) - (STATUS_RANK[prev.status] ?? 0);
  if (byStatus !== 0) return byStatus > 0 ? next : prev;
  const a = Date.parse(prev.updated_at ?? '') || 0;
  const b = Date.parse(next.updated_at ?? '') || 0;
  return b >= a ? next : prev;
}

function Avatar({ profile, size = 36 }) {
  const name = profile?.display_name ?? profile?.discord_username ?? '?';
  return profile?.avatar_url
    ? <img src={profile.avatar_url} alt="" style={{ width: size, height: size }} className="rounded-full border-[3px] border-line object-cover shrink-0" />
    : <span style={{ width: size, height: size }} className="rounded-full border-[3px] border-line bg-surface-2 font-display text-[14px] flex items-center justify-center shrink-0">
        {name[0].toUpperCase()}
      </span>;
}

const profileName = p => p?.display_name ?? p?.discord_username ?? 'Jugador';

// ── Reloj del turno ───────────────────────────────────────────────────────────
function Clock({ ms, total }) {
  const secs = Math.max(0, Math.ceil(ms / 1000));
  const pct  = Math.max(0, Math.min(100, (ms / (total * 1000)) * 100));
  const low  = secs <= 5;
  return (
    <div className="flex flex-col items-center gap-1 shrink-0" aria-live="off">
      <span className={`font-display text-[40px] leading-none tabular-nums ${low ? 'text-red animate-pulse' : ''}`}>{secs}s</span>
      <div className="w-[96px] h-3 bg-surface border-[3px] border-line rounded-full overflow-hidden">
        <div className={`h-full ${low ? 'bg-red' : 'bg-green'} transition-[width] duration-200`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Columna de un lado: bans y picks ─────────────────────────────────────────
function SideColumn({ side, draft, actions, turn, profile, isMe }) {
  const s     = SIDE_STYLE[side];
  const size  = FORMATS[draft.format] ?? 6;
  const bans  = actions.filter(a => a.side === side && a.type === 'ban');
  const picks = actions.filter(a => a.side === side && a.type === 'pick');
  const activeBan  = turn?.side === side && turn.type === 'ban' ? bans.length : -1;
  const activePick = turn?.side === side && turn.type === 'pick' ? picks.length : -1;
  const onTurn = turn?.side === side;

  return (
    <div className={`sticker p-3 sm:p-4 min-w-0 flex flex-col gap-3 ${onTurn ? `outline outline-4 outline-offset-2 ${side === 'A' ? 'outline-yellow' : 'outline-cyan'}` : ''}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`pill ${s.bg} text-on-color shrink-0`}>{side}</span>
        <span className="font-display text-[17px] sm:text-[20px] leading-tight truncate">{side === 'A' ? draft.name_a : draft.name_b}</span>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        {profile ? <Avatar profile={profile} size={28} /> : <span className="w-7 h-7 rounded-full border-[3px] border-dashed border-ink/25 shrink-0" />}
        <span className="text-[13px] text-ink-dim truncate">{profile ? profileName(profile) : 'Sin capitán'}</span>
        {isMe && <span className="pill bg-ink text-bg !text-[10px] shrink-0">Tú</span>}
      </div>

      {draft.bans_per_team > 0 && (
        <div>
          <span className="mono-label block mb-1.5">Bans</span>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: draft.bans_per_team }, (_, i) => {
              const a = bans[i];
              return (
                <HeroPortrait key={i} variant="icon" className="w-10 sm:w-11"
                  heroId={a?.hero_id ?? null} crossed={!!a && a.hero_id != null} lost={!!a && a.hero_id == null}
                  active={i === activeBan} />
              );
            })}
          </div>
        </div>
      )}

      <div>
        <span className="mono-label block mb-1.5">Picks</span>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {Array.from({ length: size }, (_, i) => {
            const a = picks[i];
            return (
              <div key={i} className="relative">
                <HeroPortrait variant="card" heroId={a?.hero_id ?? null} active={i === activePick} />
                {a?.auto && (
                  <span className="absolute top-1 right-1 pill bg-surface text-ink !text-[9px] !px-1.5 !py-0.5" title="Elegido al azar por tiempo">⏱</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Lado en la sala de espera ────────────────────────────────────────────────
function LobbySide({ side, draft, profile, viewerId, mySide, linked, busy, onJoin }) {
  const s = SIDE_STYLE[side];
  const captainId = side === 'A' ? draft.captain_a : draft.captain_b;
  const mine = captainId && captainId === viewerId;

  let action = null;
  if (!linked && viewerId) {
    if (mine) action = <button type="button" disabled={busy} onClick={() => onJoin(null)} className="btn btn-secondary btn-sm">Salir</button>;
    else if (!captainId) action = (
      <button type="button" disabled={busy} onClick={() => onJoin(side)} className="btn btn-primary btn-sm">
        {mySide ? `Cambiar al lado ${side}` : `Unirme al lado ${side}`}
      </button>
    );
  }

  return (
    <div className="sticker p-5 flex flex-col gap-4 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`pill ${s.bg} text-on-color shrink-0`}>Lado {side}</span>
        <span className="font-display text-[22px] leading-tight truncate">{side === 'A' ? draft.name_a : draft.name_b}</span>
      </div>
      <div className={`flex items-center gap-3 p-3 rounded-2xl border-[3px] ${captainId ? `border-line ${s.soft}` : 'border-dashed border-ink/25 bg-surface-2/60'}`}>
        {captainId
          ? <><Avatar profile={profile} /><span className="font-bold text-[15px] truncate">{profile ? profileName(profile) : 'Capitán'}</span>{mine && <span className="pill bg-ink text-bg !text-[10px] shrink-0 ml-auto">Tú</span>}</>
          : <span className="text-[14px] text-ink-dim font-bold">Libre</span>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── Sala de draft ────────────────────────────────────────────────────────────
export default function DraftRoom({ initialDraft, initialProfiles, viewerId, isAdmin }) {
  const id = initialDraft.id;
  const sbRef = useRef(null);
  const getSb = () => (sbRef.current ??= createClient());

  const [draft, setDraftRaw] = useState(initialDraft);
  const setDraft = useCallback(next => setDraftRaw(prev => newer(prev, next)), []);
  const [profiles, setProfiles] = useState(() => Object.fromEntries(initialProfiles.map(p => [p.id, p])));
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');
  const [selected, setSelected] = useState(null);
  const [search, setSearch]     = useState('');
  const [copied, setCopied]     = useState('');
  const [now, setNow]           = useState(null);
  const [jitter]                = useState(() => 1000 + Math.random() * 1000);
  const offsetRef   = useRef(0);                         // reloj local - reloj del servidor (estimado)
  const lastTurnRef = useRef(initialDraft.turn_started_at);
  const timeoutRef  = useRef({ step: -1, at: 0 });

  const actions   = useMemo(() => (Array.isArray(draft.actions) ? draft.actions : []), [draft.actions]);
  const step      = actions.length;
  const drafting  = draft.status === 'drafting';
  const turn      = drafting ? currentTurn({ ...draft, actions }) : null;
  const mySide    = viewerId && draft.captain_a === viewerId ? 'A' : viewerId && draft.captain_b === viewerId ? 'B' : null;
  const isCreator = !!viewerId && viewerId === draft.created_by;
  const linked    = !!(draft.scrim_id || draft.match_id);
  const names     = { A: draft.name_a, B: draft.name_b };
  const isMyTurn  = !!turn && turn.side === mySide;
  const used      = useMemo(() => {
    const m = new Map();
    for (const a of actions) if (a.hero_id != null) m.set(a.hero_id, a);
    return m;
  }, [actions]);

  // ── Datos en vivo ──
  const refetch = useCallback(async () => {
    const { data } = await getSb().from('drafts').select('*').eq('id', id).maybeSingle();
    if (data) setDraft(data);
  }, [id, setDraft]);

  useEffect(() => {
    const sb = getSb();
    const channel = sb.channel(`draft-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'drafts', filter: `id=eq.${id}` }, p => setDraft(p.new))
      .subscribe(status => { if (status === 'SUBSCRIBED') refetch(); });
    const onVisible = () => { if (document.visibilityState === 'visible') refetch(); };
    window.addEventListener('focus', refetch);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      sb.removeChannel(channel);
      window.removeEventListener('focus', refetch);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [id, refetch, setDraft]);

  // Perfiles de capitanes nuevos
  useEffect(() => {
    const missing = [draft.captain_a, draft.captain_b].filter(x => x && !profiles[x]);
    if (missing.length === 0) return;
    getSb().from('profiles').select('id, display_name, discord_username, avatar_url').in('id', missing)
      .then(({ data }) => { if (data?.length) setProfiles(p => ({ ...p, ...Object.fromEntries(data.map(x => [x.id, x])) })); });
  }, [draft.captain_a, draft.captain_b]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al ver empezar un turno nuevo, estimar la diferencia de reloj con el servidor
  useEffect(() => {
    const t = draft.turn_started_at;
    if (t && t !== lastTurnRef.current) {
      const off = Date.now() - Date.parse(t);
      if (Math.abs(off) < 10000) offsetRef.current = off;
    }
    lastTurnRef.current = t;
  }, [draft.turn_started_at]);

  // La selección no sobrevive a un cambio de turno
  useEffect(() => { setSelected(null); }, [step, draft.status]);

  // ── Reloj ──
  const running = drafting && draft.timer_s > 0 && !!draft.turn_started_at;
  useEffect(() => {
    if (!running) { setNow(null); return; }
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);
  const remainingMs = running && now != null
    ? Date.parse(draft.turn_started_at) + draft.timer_s * 1000 - (now - offsetRef.current)
    : null;

  // Tiempo agotado: cualquiera avisa al servidor (el capitán del turno primero, el resto con un poco de demora)
  useEffect(() => {
    if (remainingMs == null || remainingMs > 0) return;
    const r = timeoutRef.current;
    const t = Date.now();
    if (r.step === step && t - r.at < 2000) return;
    if (r.step !== step && mySide !== turn?.side && -remainingMs < jitter) return;
    timeoutRef.current = { step, at: t };
    fetch(`/api/drafts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'timeout' }),
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => { if (ok && data.draft) setDraft(data.draft); else refetch(); })
      .catch(() => {});
  }, [remainingMs, step, mySide, turn?.side, jitter, id, setDraft, refetch]);

  // ── Acciones ──
  async function patch(body) {
    setBusy(true); setError('');
    try {
      const res  = await fetch(`/api/drafts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Ocurrió un error.');
        if (res.status === 409) refetch();
        return false;
      }
      if (data.draft) setDraft(data.draft);
      return true;
    } catch {
      setError('Sin conexión. Intenta de nuevo.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function copy(text, key) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      setError('No se pudo copiar. Copia el enlace desde la barra del navegador.');
    }
  }

  const cancel = () => confirm('¿Cancelar la sala? El draft no se podrá seguir.') && patch({ op: 'cancel' });

  const heroes = useMemo(() => {
    const q = norm(search.trim());
    return q ? ACTIVE_HERO_IDS.filter(h => norm(heroInfo(h).name).includes(q)) : ACTIVE_HERO_IDS;
  }, [search]);

  const sum = summary({ ...draft, actions });
  const resultText = [
    `Draft ${draft.name_a} vs ${draft.name_b} (${draft.format}) — Sala ${id}`,
    ...['A', 'B'].map(side => {
      const picks = sum[side].picks.map(h => heroInfo(h).name).join(', ') || '—';
      const bans  = sum[side].bans.map(h => (h == null ? 'Perdido' : heroInfo(h).name)).join(', ');
      return `${names[side]}: ${picks}${bans ? `\n  Bans: ${bans}` : ''}`;
    }),
  ].join('\n');

  const [statusLabel, statusCls] = STATUS[draft.status] ?? STATUS.lobby;
  const canCancel = (isCreator || isAdmin) && (draft.status === 'lobby' || drafting);
  const canStart  = isCreator || isAdmin || !!mySide;
  const bothReady = !!(draft.captain_a && draft.captain_b);

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <span className="mono-label">🎯 Draft · Sala {id}</span>
          <h1 className="font-display text-[clamp(28px,5vw,52px)] leading-[1.05] tracking-[-0.02em] mt-1 break-words">
            <span className={SIDE_STYLE.A.text}>{draft.name_a}</span>
            <span className="text-ink-dim"> vs </span>
            <span className={SIDE_STYLE.B.text}>{draft.name_b}</span>
          </h1>
          <div className="flex gap-2 flex-wrap mt-3">
            <span className={`pill ${statusCls}`}>{statusLabel}</span>
            <span className="pill bg-surface text-ink">{draft.format}</span>
            <span className="pill bg-surface text-ink">{draft.bans_per_team ? `${draft.bans_per_team} ban${draft.bans_per_team > 1 ? 's' : ''} por equipo` : 'Sin bans'}</span>
            <span className="pill bg-surface text-ink">{draft.timer_s ? `${draft.timer_s}s por turno` : 'Sin límite de tiempo'}</span>
            {!mySide && <span className="pill bg-surface-2 text-ink-dim">👀 Estás mirando</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => copy(`${window.location.origin}/draft/${id}`, 'link')} className="btn btn-secondary btn-sm">
            {copied === 'link' ? '✓ Enlace copiado' : '🔗 Copiar enlace'}
          </button>
          {canCancel && <button type="button" disabled={busy} onClick={cancel} className="btn btn-sm bg-red text-white">Cancelar sala</button>}
        </div>
      </div>

      {error && (
        <p className="px-4 py-3 bg-pink/15 border-[3px] border-line rounded-2xl text-pink-ink text-[14px] font-semibold" role="alert">{error}</p>
      )}

      {/* ── Sala de espera ── */}
      {draft.status === 'lobby' && (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            {['A', 'B'].map(side => (
              <LobbySide key={side} side={side} draft={draft} profile={profiles[side === 'A' ? draft.captain_a : draft.captain_b]}
                viewerId={viewerId} mySide={mySide} linked={linked} busy={busy} onJoin={s => patch({ op: 'join', side: s })} />
            ))}
          </div>

          {linked && (
            <p className="text-[14px] text-ink-dim">
              Capitanes definidos por {draft.scrim_id ? 'el scrim' : 'la partida'}. El resto puede mirar el draft en vivo.
            </p>
          )}

          {!viewerId && !linked && (
            <div className="sticker p-5 flex items-center gap-4 flex-wrap">
              <p className="text-[15px] flex-1 min-w-[200px]">Inicia sesión para tomar un lado. Sin sesión puedes mirar el draft.</p>
              <button type="button" onClick={loginWithDiscord} className="btn btn-discord btn-sm">Inicia sesión con Discord</button>
            </div>
          )}

          {canStart && (
            <div className="flex items-center gap-3 flex-wrap">
              <button type="button" disabled={busy || !bothReady} onClick={() => patch({ op: 'start' })} className="btn btn-primary">
                {busy ? 'Un momento…' : 'Empezar draft →'}
              </button>
              {!bothReady && <span className="text-[14px] text-ink-dim">Cada lado necesita un capitán para empezar.</span>}
            </div>
          )}

          <div className="sticker p-5">
            <span className="mono-label block mb-2">Orden</span>
            <DraftOrderStrip format={draft.format} bans={draft.bans_per_team} names={names} />
          </div>
        </>
      )}

      {/* ── Draft en curso ── */}
      {drafting && turn && (
        <div className={`sticker p-4 sm:p-5 flex items-center gap-4 flex-wrap ${isMyTurn ? `${SIDE_STYLE[turn.side].bg} text-on-color` : ''}`}>
          <div className="flex-1 min-w-[200px]">
            <span className={`font-display text-[13px] uppercase tracking-wider ${isMyTurn ? '' : 'text-ink-dim'}`}>
              Turno {turn.step + 1} de {turn.total}
            </span>
            <p className="font-display text-[clamp(22px,3.5vw,32px)] leading-tight mt-0.5">
              {isMyTurn && '¡Te toca! '}
              {!isMyTurn && <span className={SIDE_STYLE[turn.side].text}>{names[turn.side]}</span>}
              {isMyTurn ? (turn.type === 'ban' ? 'Banea un héroe' : 'Elige un héroe') : `: ${turn.type === 'ban' ? 'Ban' : 'Pick'}`}
            </p>
          </div>
          {remainingMs != null && <Clock ms={remainingMs} total={draft.timer_s} />}
        </div>
      )}

      {(drafting || draft.status === 'done') && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            {['A', 'B'].map(side => (
              <SideColumn key={side} side={side} draft={draft} actions={actions} turn={turn}
                profile={profiles[side === 'A' ? draft.captain_a : draft.captain_b]} isMe={mySide === side} />
            ))}
          </div>

          <div className="sticker p-4 sm:p-5">
            <span className="mono-label block mb-2">Orden</span>
            <DraftOrderStrip format={draft.format} bans={draft.bans_per_team} step={drafting ? step : -1} names={names} />
          </div>
        </>
      )}

      {/* Grilla de héroes */}
      {drafting && turn && (
        <div className="sticker p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <span className="font-display text-[22px] leading-none">Héroes</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar héroe…" aria-label="Buscar héroe"
              className="field rounded-full !py-2 w-full sm:w-[240px]" />
          </div>

          {heroes.length === 0 ? (
            <p className="text-[14px] text-ink-dim">Ningún héroe coincide con la búsqueda.</p>
          ) : (
            <div className="grid grid-cols-4 min-[480px]:grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {heroes.map(hid => {
                const u = used.get(hid);
                const canChoose = isMyTurn && !u && !busy;
                const isSel = selected === hid;
                return (
                  <button key={hid} type="button" disabled={!canChoose} onClick={() => setSelected(hid)} aria-pressed={isSel}
                    className={`relative text-left rounded-lg transition-transform min-w-0 ${canChoose ? 'hover:-translate-y-0.5 cursor-pointer' : 'cursor-default'} ${u ? 'opacity-45' : ''} ${isSel ? 'outline outline-4 outline-offset-2 outline-ink' : ''}`}>
                    <HeroPortrait heroId={hid} variant="icon" crossed={u?.type === 'ban'} />
                    {u?.type === 'pick' && (
                      <span className={`absolute top-1 left-1 pill ${SIDE_STYLE[u.side].bg} text-on-color !text-[9px] !px-1.5 !py-0.5`}>{u.side}</span>
                    )}
                    <span className="block text-[11px] font-bold text-ink truncate mt-1">{heroInfo(hid).name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {isMyTurn && (
            <div className="sticky bottom-3 z-10 mt-4 sticker p-3 flex items-center gap-3 flex-wrap">
              {selected != null && <HeroPortrait heroId={selected} variant="icon" className="w-12 shrink-0" />}
              <span className="text-[15px] font-bold flex-1 min-w-[140px]">
                {selected != null ? heroInfo(selected).name : `Elige un héroe para ${turn.type === 'ban' ? 'banear' : 'tu equipo'}`}
              </span>
              <button type="button" disabled={selected == null || busy}
                onClick={() => patch({ op: 'pick', hero_id: selected })}
                className={`btn ${turn.type === 'ban' ? 'bg-red text-white' : 'btn-primary'}`}>
                {busy ? 'Enviando…' : `Confirmar ${turn.type === 'ban' ? 'ban' : 'pick'}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Resultado ── */}
      {draft.status === 'done' && (
        <div className="flex gap-3 flex-wrap">
          <button type="button" onClick={() => copy(resultText, 'result')} className="btn btn-primary">
            {copied === 'result' ? '✓ Resultado copiado' : '📋 Copiar resultado'}
          </button>
          <a href="/draft" className="btn btn-secondary">Nuevo draft</a>
        </div>
      )}

      {/* ── Cancelado ── */}
      {draft.status === 'cancelled' && (
        <div className="sticker p-6 flex items-center gap-4 flex-wrap">
          <p className="text-[16px] flex-1 min-w-[200px]">Esta sala fue cancelada.</p>
          <a href="/draft" className="btn btn-primary btn-sm">Crear otro draft →</a>
        </div>
      )}
    </div>
  );
}
