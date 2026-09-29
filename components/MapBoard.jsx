'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { COLORS, KINDS, LIMITS, DEFAULT_LAYERS, simplify } from '@/lib/board';
import { MAP_UPDATED } from '@/lib/mapData';
import BoardSvg from '@/components/map/BoardSvg';
import HeroPalette from '@/components/map/HeroPalette';

const TOOLS = [
  ['move',  '✋', 'Mover'],
  ['line',  '╱', 'Línea'],
  ['arrow', '➜', 'Flecha'],
  ['pen',   '✏️', 'Lápiz'],
  ['hero',  '🦸', 'Héroe'],
  ['text',  'Aa', 'Texto'],
  ['erase', '🧽', 'Borrar'],
];
const COLOR_NAMES = {
  '#ffd400': 'Amarillo', '#00c8f0': 'Celeste', '#ff2d2d': 'Rojo',
  '#00d97e': 'Verde', '#ff7043': 'Naranja', '#ffffff': 'Blanco',
};
const LAYER_LABELS = [['ziplines', 'Tirolesas'], ['mid_tunnels', 'Túneles centrales'], ['rat_tunnels', 'Túneles de ratas']];

let seq = 0;
const newId = () => `e${Date.now().toString(36)}${(seq++ % 1296).toString(36)}${Math.random().toString(36).slice(2, 5)}`.slice(0, 24);
const clamp = v => Math.max(0, Math.min(1000, Math.round(v)));
const formatDay = iso => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };

async function loginWithDiscord() {
  await createClient().auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo: `${window.location.origin}/auth/callback`, scopes: 'identify email' },
  });
}

function SavePill({ save, onRetry }) {
  if (save.state === 'error') {
    return (
      <span className="pill bg-pink/20 text-pink-ink">
        Error: {save.error}
        <button type="button" onClick={onRetry} className="underline underline-offset-2 ml-1">Reintentar</button>
      </span>
    );
  }
  const [text, cls] = {
    saved:  ['✓ Guardado', 'bg-green text-on-color'],
    dirty:  ['Cambios sin guardar', 'bg-surface text-ink'],
    saving: ['Guardando…', 'bg-yellow text-on-color'],
  }[save.state] ?? ['', ''];
  return <span className={`pill ${cls}`}>{text}</span>;
}

export default function MapBoard({ initialBoard, viewerId, owner }) {
  const router  = useRouter();
  const id      = initialBoard.id;
  const isOwner = !!viewerId && viewerId === initialBoard.created_by;

  const [elements, setElements] = useState(() => initialBoard.data?.elements ?? []);
  const [layers, setLayers]     = useState(() => ({ ...DEFAULT_LAYERS, ...(initialBoard.data?.layers ?? {}) }));
  const [title, setTitle]       = useState(initialBoard.title);
  const [titleDraft, setTitleDraft] = useState(initialBoard.title);

  const [tool, setTool]       = useState(isOwner ? 'arrow' : 'move');
  const [color, setColor]     = useState(COLORS[0]);
  const [width, setWidth]     = useState('thin');
  const [heroId, setHeroId]   = useState(null);
  const [team, setTeam]       = useState('A');
  const [preview, setPreview] = useState(null);
  const [textBox, setTextBoxState] = useState(null);       // { x, y, value }
  const [notice, setNotice]   = useState('');
  const [save, setSave]       = useState({ state: 'saved', error: '' });
  const [live, setLive]       = useState(false);
  const [copied, setCopied]   = useState(false);
  const [exporting, setExporting] = useState(false);
  const [busy, setBusy]       = useState(false);
  const [, rerender]          = useState(0);

  const svgRef      = useRef(null);
  const drawRef     = useRef(null);                         // elemento que se está dibujando
  const dragRef     = useRef(null);                         // { id, offset, before, moved }
  const past        = useRef([]);
  const future      = useRef([]);
  const elementsRef = useRef(elements);
  const layersRef   = useRef(layers);
  const dirtyRef    = useRef(false);
  const savingRef   = useRef(false);
  const timerRef    = useRef(null);
  const lastRemote  = useRef(initialBoard.updated_at);
  const textRef     = useRef(null);                         // copia de textBox (evita guardar el texto dos veces)
  const setTextBox  = useCallback(next => {
    textRef.current = typeof next === 'function' ? next(textRef.current) : next;
    setTextBoxState(textRef.current);
  }, []);
  elementsRef.current = elements;
  layersRef.current   = layers;

  // ── Guardado automático (solo el dueño) ──────────────────────────────────
  const saveNow = useCallback(async () => {
    clearTimeout(timerRef.current);
    if (!dirtyRef.current) return;
    if (savingRef.current) return;                           // se reintenta al terminar el guardado en curso
    savingRef.current = true;
    dirtyRef.current = false;
    setSave({ state: 'saving', error: '' });
    let failed = null;
    try {
      const res = await fetch(`/api/boards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { elements: elementsRef.current, layers: layersRef.current } }),
      });
      if (!res.ok) failed = (await res.json().catch(() => ({}))).error ?? 'No se pudo guardar';
    } catch {
      failed = 'Sin conexión';
    }
    savingRef.current = false;
    if (failed) {
      dirtyRef.current = true;
      setSave({ state: 'error', error: failed });
      return;
    }
    if (dirtyRef.current) { setSave({ state: 'dirty', error: '' }); saveNow(); }
    else setSave({ state: 'saved', error: '' });
  }, [id]);

  const scheduleSave = useCallback(() => {
    if (!isOwner) return;
    dirtyRef.current = true;
    setSave(s => (s.state === 'saving' ? s : { state: 'dirty', error: '' }));
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(saveNow, 1200);
  }, [isOwner, saveNow]);

  const setBoard = useCallback(next => { elementsRef.current = next; setElements(next); }, []);

  // Cambio con historial (deshacer/rehacer)
  const commit = useCallback(next => {
    if (next.length > LIMITS.elements) {
      setNotice(`Llegaste al máximo de ${LIMITS.elements} elementos. Borra algunos para seguir.`);
      return false;
    }
    past.current.push(elementsRef.current);
    if (past.current.length > 100) past.current.shift();
    future.current = [];
    setBoard(next);
    setNotice('');
    scheduleSave();
    rerender(n => n + 1);
    return true;
  }, [scheduleSave, setBoard]);

  const undo = useCallback(() => {
    if (!past.current.length) return;
    future.current.push(elementsRef.current);
    setBoard(past.current.pop());
    scheduleSave();
    rerender(n => n + 1);
  }, [scheduleSave, setBoard]);

  const redo = useCallback(() => {
    if (!future.current.length) return;
    past.current.push(elementsRef.current);
    setBoard(future.current.pop());
    scheduleSave();
    rerender(n => n + 1);
  }, [scheduleSave, setBoard]);

  function toggleLayer(key) {
    const next = { ...layersRef.current, [key]: !layersRef.current[key] };
    layersRef.current = next;
    setLayers(next);
    scheduleSave();                                          // los que miran solo lo cambian para ellos
  }

  // ── Dibujo ───────────────────────────────────────────────────────────────
  function toBoard(e) {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return [clamp(p.x), clamp(p.y)];
  }
  const targetId = e => e.target?.closest?.('[data-id]')?.getAttribute('data-id') ?? null;

  function commitText() {
    const box = textRef.current;
    setTextBox(null);
    const text = box?.value.trim().slice(0, LIMITS.text);
    if (text) commit([...elementsRef.current, { id: newId(), kind: 'text', color, text, points: [[box.x, box.y]] }]);
  }

  function onPointerDown(e) {
    if (!isOwner || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const p = toBoard(e);
    if (!p) return;
    if (textRef.current) { commitText(); return; }
    const capture = () => svgRef.current?.setPointerCapture?.(e.pointerId);

    switch (tool) {
      case 'line':
      case 'arrow':
        drawRef.current = { id: newId(), kind: tool, color, width, points: [p, p] };
        setPreview(drawRef.current);
        capture();
        break;
      case 'pen':
        drawRef.current = { id: newId(), kind: 'pen', color, width, points: [p] };
        setPreview(drawRef.current);
        capture();
        break;
      case 'hero':
        if (!heroId) { setNotice('Elige un héroe de la lista para colocarlo.'); return; }
        commit([...elementsRef.current, { id: newId(), kind: 'hero', hero_id: heroId, team, points: [p] }]);
        break;
      case 'text':
        setTextBox({ x: p[0], y: p[1], value: '' });
        break;
      case 'erase': {
        const tid = targetId(e);
        if (tid) commit(elementsRef.current.filter(el => el.id !== tid));
        break;
      }
      case 'move': {
        const tid = targetId(e);
        const el = elementsRef.current.find(x => x.id === tid);
        if (el && (el.kind === 'hero' || el.kind === 'text')) {
          dragRef.current = { id: tid, offset: [p[0] - el.points[0][0], p[1] - el.points[0][1]], before: elementsRef.current, moved: false };
          capture();
        }
        break;
      }
      default:
    }
    e.preventDefault();
  }

  function onPointerMove(e) {
    const d = drawRef.current;
    const g = dragRef.current;
    if (!d && !g) return;
    const p = toBoard(e);
    if (!p) return;
    if (d) {
      if (d.kind === 'pen') {
        const last = d.points[d.points.length - 1];
        if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 3) return;
        d.points = [...d.points, p];
      } else {
        d.points = [d.points[0], p];
      }
      setPreview({ ...d });
    } else {
      g.moved = true;
      const np = [clamp(p[0] - g.offset[0]), clamp(p[1] - g.offset[1])];
      setBoard(elementsRef.current.map(el => (el.id === g.id ? { ...el, points: [np] } : el)));
    }
  }

  function onPointerUp() {
    const d = drawRef.current;
    drawRef.current = null;
    setPreview(null);
    if (d) {
      if (d.kind === 'pen') {
        let pts = simplify(d.points, 1.5);
        for (let tol = 3; pts.length > LIMITS.penPoints; tol *= 1.6) pts = simplify(d.points, tol);
        if (pts.length >= 2) commit([...elementsRef.current, { ...d, points: pts }]);
      } else {
        const [a, b] = d.points;
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) >= 8) commit([...elementsRef.current, d]);
      }
    }
    const g = dragRef.current;
    dragRef.current = null;
    if (g?.moved) {
      past.current.push(g.before);
      future.current = [];
      scheduleSave();
      rerender(n => n + 1);
    }
  }

  // ── Atajos de teclado y aviso al salir ───────────────────────────────────
  useEffect(() => {
    if (!isOwner) return;
    function onKey(e) {
      const t = e.target;
      if (t?.closest?.('input, textarea, [contenteditable="true"]')) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    }
    function onUnload(e) {
      if (dirtyRef.current || savingRef.current) { e.preventDefault(); e.returnValue = ''; }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onUnload);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('beforeunload', onUnload); };
  }, [isOwner, undo, redo]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // ── En vivo para quienes miran ───────────────────────────────────────────
  useEffect(() => {
    if (isOwner) return undefined;
    const sb = createClient();
    const apply = row => {
      if (!row) return;
      if (lastRemote.current && row.updated_at && new Date(row.updated_at) < new Date(lastRemote.current)) return;
      lastRemote.current = row.updated_at ?? lastRemote.current;
      setBoard(Array.isArray(row.data?.elements) ? row.data.elements : []);
      setLayers({ ...DEFAULT_LAYERS, ...(row.data?.layers ?? {}) });
      if (row.title) setTitle(row.title);
    };
    const refetch = async () => {
      const { data } = await sb.from('boards').select('title, data, updated_at').eq('id', id).maybeSingle();
      if (data) apply(data);
    };
    const channel = sb.channel(`board-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'boards', filter: `id=eq.${id}` }, p => apply(p.new))
      .subscribe(status => {
        setLive(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') refetch();
      });
    const onFocus = () => refetch();
    window.addEventListener('focus', onFocus);
    return () => { window.removeEventListener('focus', onFocus); sb.removeChannel(channel); };
  }, [id, isOwner, setBoard]);

  // ── Acciones ─────────────────────────────────────────────────────────────
  async function saveTitle() {
    const t = titleDraft.trim().slice(0, LIMITS.title);
    if (!t || t === title) { setTitleDraft(title); return; }
    setTitle(t);
    const res = await fetch(`/api/boards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: t }),
    });
    if (!res.ok) setNotice((await res.json().catch(() => ({}))).error ?? 'No se pudo guardar el título.');
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice('No se pudo copiar el enlace. Cópialo desde la barra del navegador.');
    }
  }

  async function downloadPng() {
    setExporting(true);
    try {
      const { exportBoardPng } = await import('@/components/map/exportPng');
      await exportBoardPng({ elements: elementsRef.current, layers: layersRef.current, title });
    } catch {
      setNotice('No se pudo generar la imagen.');
    }
    setExporting(false);
  }

  async function duplicate() {
    setBusy(true);
    const res = await fetch(`/api/boards/${id}`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); setNotice(data.error ?? 'No se pudo duplicar el mapa.'); return; }
    router.push(`/mapa/${data.board.id}`);
  }

  function clearAll() {
    if (!elementsRef.current.length) return;
    if (window.confirm('¿Borrar todo lo dibujado en el mapa?')) commit([]);
  }

  const hitKinds = !isOwner ? [] : tool === 'erase' ? KINDS : tool === 'move' ? ['hero', 'text'] : [];
  const cursor = !isOwner ? 'cursor-default' : tool === 'move' ? 'cursor-grab' : tool === 'erase' ? 'cursor-pointer' : 'cursor-crosshair';
  const ownerName = owner?.display_name ?? owner?.discord_username ?? 'Jugador';

  return (
    <div className="flex flex-col gap-5">
      {/* ── Encabezado ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-[280px]">
          <a href="/mapa" className="text-[14px] font-bold text-ink-dim hover:text-ink no-underline">← Mapas</a>
          <span className="mono-label block mt-3">🗺️ Mapa de coaching</span>
          {isOwner ? (
            <input value={titleDraft} onChange={e => setTitleDraft(e.target.value)} maxLength={LIMITS.title}
              onBlur={saveTitle} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              aria-label="Título del mapa" className="field font-display !text-[22px] md:!text-[26px] !py-2 mt-2 max-w-[640px]" />
          ) : (
            <h1 className="font-display text-[clamp(26px,4vw,42px)] leading-tight mt-2 break-words">{title}</h1>
          )}
          <div className="flex items-center gap-2 flex-wrap mt-3 text-[14px] text-ink-dim">
            {owner?.avatar_url
              ? <img src={owner.avatar_url} alt="" className="w-7 h-7 rounded-full border-2 border-line" />
              : <span className="w-7 h-7 rounded-full border-2 border-line bg-yellow inline-flex items-center justify-center font-display text-[12px] text-on-color">{ownerName[0]?.toUpperCase()}</span>}
            <span>por <b className="text-ink">{ownerName}</b></span>
            {isOwner && <SavePill save={save} onRetry={() => { dirtyRef.current = true; saveNow(); }} />}
            {!isOwner && live && <span className="pill bg-red text-white">● En vivo</span>}
            {!isOwner && <span className="pill bg-surface text-ink">👀 Solo lectura</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={copyLink} className="btn btn-secondary btn-sm">{copied ? '✓ Enlace copiado' : '🔗 Copiar enlace'}</button>
          <button type="button" onClick={downloadPng} disabled={exporting} className="btn btn-secondary btn-sm">{exporting ? 'Generando…' : '⬇️ Descargar PNG'}</button>
          {!isOwner && (viewerId
            ? <button type="button" onClick={duplicate} disabled={busy} className="btn btn-primary btn-sm">{busy ? 'Duplicando…' : '📄 Duplicar para editar'}</button>
            : <button type="button" onClick={loginWithDiscord} className="btn btn-discord btn-sm">Inicia sesión para editar una copia</button>)}
        </div>
      </div>

      {/* ── Herramientas (dueño) ── */}
      {isOwner && (
        <div className="sticker p-3 flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Herramientas">
            {TOOLS.map(([key, icon, label]) => (
              <button key={key} type="button" onClick={() => { setTool(key); setNotice(''); }} aria-pressed={tool === key} title={label}
                className={`pill !text-[13px] !py-1.5 !px-2.5 ${tool === key ? 'bg-ink text-bg' : 'bg-surface text-ink hover:-translate-y-0.5 transition-transform'}`}>
                <span aria-hidden>{icon}</span>{label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5" role="group" aria-label="Color">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-pressed={color === c} title={COLOR_NAMES[c]}
                aria-label={COLOR_NAMES[c]} style={{ background: c }}
                className={`w-7 h-7 rounded-full border-[3px] border-line transition-transform ${color === c ? 'scale-110 outline outline-2 outline-offset-2 outline-ink' : 'hover:scale-105'}`} />
            ))}
          </div>
          <div className="flex gap-1.5" role="group" aria-label="Grosor">
            {[['thin', 'Fino'], ['thick', 'Grueso']].map(([w, label]) => (
              <button key={w} type="button" onClick={() => setWidth(w)} aria-pressed={width === w}
                className={`pill !text-[13px] !py-1.5 ${width === w ? 'bg-ink text-bg' : 'bg-surface text-ink'}`}>{label}</button>
            ))}
          </div>
          <div className="flex gap-1.5 ml-auto">
            <button type="button" onClick={undo} disabled={!past.current.length} title="Deshacer (Ctrl+Z)" className="btn btn-secondary btn-sm !px-3">↶ Deshacer</button>
            <button type="button" onClick={redo} disabled={!future.current.length} title="Rehacer (Ctrl+Y)" className="btn btn-secondary btn-sm !px-3">↷ Rehacer</button>
          </div>
        </div>
      )}

      {isOwner && tool === 'hero' && (
        <HeroPalette heroId={heroId} team={team} onHero={id => { setHeroId(id); setNotice(''); }} onTeam={setTeam} />
      )}

      {notice && (
        <p role="status" className="px-4 py-3 bg-pink/15 border-[3px] border-line rounded-2xl text-pink-ink text-[14px] font-semibold">{notice}</p>
      )}

      {/* ── Mapa + panel ── */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-5 items-start">
        <div className="sticker p-2 md:p-3 min-w-0">
          <div className="relative rounded-2xl overflow-hidden bg-[#141414]">
            <BoardSvg ref={svgRef} elements={elements} layers={layers} preview={preview} hitKinds={hitKinds} className={cursor}
              style={{ touchAction: isOwner ? 'none' : 'manipulation' }}
              onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} />
            {textBox && (
              <input autoFocus value={textBox.value} maxLength={LIMITS.text} placeholder="Escribe y presiona Enter"
                onChange={e => setTextBox(b => ({ ...b, value: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') commitText(); if (e.key === 'Escape') setTextBox(null); }}
                onBlur={() => commitText()}
                className="field absolute !w-[min(260px,70%)] !py-1.5 !text-[14px] -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${textBox.x / 10}%`, top: `${textBox.y / 10}%` }} />
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4 min-w-0">
          <div className="sticker p-4">
            <span className="mono-label block mb-3">Capas</span>
            <div className="flex flex-col gap-2">
              {LAYER_LABELS.map(([key, label]) => (
                <label key={key} className="flex items-center gap-2.5 text-[15px] font-semibold cursor-pointer">
                  <input type="checkbox" checked={!!layers[key]} onChange={() => toggleLayer(key)} className="w-5 h-5 accent-[#ffd400]" />
                  {label}
                </label>
              ))}
            </div>
            {!isOwner && <p className="text-[12px] text-ink-dim mt-3">Los cambios de capas solo se ven en tu pantalla.</p>}
          </div>

          {isOwner && (
            <div className="sticker p-4 flex flex-col gap-3">
              <span className="mono-label">Consejos</span>
              <ul className="text-[14px] text-ink-dim flex flex-col gap-1.5 list-disc pl-5">
                <li>Arrastra sobre el mapa para dibujar líneas, flechas o trazos.</li>
                <li>Con <b className="text-ink">Mover</b> arrastras héroes y textos.</li>
                <li>Quien tenga el enlace ve tus cambios en vivo.</li>
                <li><b className="text-ink">Ctrl+Z</b> deshace, <b className="text-ink">Ctrl+Y</b> rehace.</li>
              </ul>
              <p className="text-[12px] text-ink-dim">{elements.length}/{LIMITS.elements} elementos</p>
              <button type="button" onClick={clearAll} disabled={!elements.length} className="btn btn-sm bg-red text-white self-start">🗑️ Limpiar todo</button>
            </div>
          )}

          <p className="text-[12px] text-ink-dim">Mapa actualizado el {formatDay(MAP_UPDATED)}.</p>
        </aside>
      </div>
    </div>
  );
}
