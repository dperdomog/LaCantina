'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// ISO (UTC) → valor de <input type="datetime-local"> en hora local
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Valor de datetime-local (hora local) → ISO (UTC)
function fromLocalInput(value) {
  return value ? new Date(value).toISOString() : '';
}

const EMPTY = { title: '', starts_at: '', url: '', description: '' };

// ─── Field fuera del componente para evitar re-mount en cada render ───────────
function Field({ label, note, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="mono-label">
        {label}
        {note && <span className="ml-1 normal-case tracking-normal font-medium text-ink-faint">{note}</span>}
      </span>
      {children}
    </label>
  );
}

function EventForm({ initial, onCancel, onSaved }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState(initial?.id
    ? { title: initial.title ?? '', starts_at: toLocalInput(initial.starts_at), url: initial.url ?? '', description: initial.description ?? '' }
    : EMPTY);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const url = form.url.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      setError('El enlace debe empezar con http:// o https://');
      return;
    }

    setLoading(true);
    const res = await fetch(isEdit ? `/api/admin/events/${initial.id}` : '/api/admin/events', {
      method:  isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:       form.title,
        starts_at:   fromLocalInput(form.starts_at),
        url,
        description: form.description,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'No se pudo guardar el evento'); return; }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Título">
          <input className="field" value={form.title} onChange={e => set('title', e.target.value)}
            placeholder="Noche de customs" maxLength={120} required />
        </Field>
        <Field label="Fecha y hora" note="(tu hora local)">
          <input type="datetime-local" className="field" value={form.starts_at}
            onChange={e => set('starts_at', e.target.value)} required />
        </Field>
      </div>

      <Field label="Enlace" note="(opcional: Discord, Twitch, formulario…)">
        <input type="url" className="field" value={form.url} onChange={e => set('url', e.target.value)}
          placeholder="https://discord.gg/…" />
      </Field>

      <Field label="Descripción" note="(opcional)">
        <textarea className="field min-h-[96px] resize-y" value={form.description}
          onChange={e => set('description', e.target.value)} maxLength={1000}
          placeholder="¿De qué se trata? ¿Cómo se participa?" />
      </Field>

      {error && (
        <p className="px-4 py-3 bg-pink/15 border-[3px] border-line rounded-2xl text-pink-ink text-[14px] font-semibold">{error}</p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear evento'}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancelar</button>
      </div>
    </form>
  );
}

export default function EventosAdmin({ events }) {
  const router = useRouter();
  const [editing, setEditing] = useState(null); // null | 'new' | evento
  const [mounted, setMounted] = useState(false);
  const [now, setNow]         = useState(0);

  // Las fechas se muestran en la hora local del admin (solo en el cliente)
  useEffect(() => { setMounted(true); setNow(Date.now()); }, []);

  function saved() {
    setEditing(null);
    router.refresh();
  }

  async function handleDelete(ev) {
    if (!confirm(`¿Eliminar el evento "${ev.title}"? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/admin/events/${ev.id}`, { method: 'DELETE' });
    if (editing?.id === ev.id) setEditing(null);
    router.refresh();
  }

  const formatDate = iso => new Date(iso).toLocaleString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <main className="max-w-[1180px] mx-auto px-5 py-10">

      {/* Header */}
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <span className="mono-label block mb-2">Calendario</span>
          <h1 className="font-display text-[clamp(32px,4vw,48px)] leading-none text-ink">Eventos</h1>
          <p className="text-[15px] text-ink-dim mt-3 max-w-[520px]">
            Aparecen en el calendario público junto a los torneos con fecha.
          </p>
        </div>
        {editing !== 'new' && (
          <button onClick={() => setEditing('new')} className="btn btn-primary">+ Nuevo evento</button>
        )}
      </div>

      {editing === 'new' && (
        <div className="sticker p-6 mb-10 max-w-[760px]">
          <h2 className="font-display text-[22px] text-ink mb-5">Nuevo evento</h2>
          <EventForm onCancel={() => setEditing(null)} onSaved={saved} />
        </div>
      )}

      {events.length === 0 ? (
        <div className="text-center py-16 border-[3px] border-dashed border-line rounded-[22px]">
          <p className="font-display text-[28px] text-ink-dim">No hay eventos.</p>
          {editing !== 'new' && (
            <button onClick={() => setEditing('new')} className="btn btn-secondary btn-sm mt-4">Crear el primero →</button>
          )}
        </div>
      ) : (
        <div className="sticker overflow-hidden divide-y-[3px] divide-line">
          {events.map(ev => {
            const isPast = mounted && new Date(ev.starts_at).getTime() < now;
            return (
              <div key={ev.id} className="p-5 hover:bg-surface-2 transition-colors">
                {editing?.id === ev.id ? (
                  <EventForm initial={ev} onCancel={() => setEditing(null)} onSaved={saved} />
                ) : (
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className="flex-1 min-w-[220px]">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-display text-[20px] text-ink leading-tight break-words">{ev.title}</h3>
                        {mounted && (
                          <span className={`pill ${isPast ? 'bg-surface text-ink' : 'bg-cyan text-on-color'}`}>
                            {isPast ? 'Pasado' : 'Próximo'}
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-ink-dim">{mounted ? formatDate(ev.starts_at) : ' '}</p>
                      {ev.description && <p className="text-[14px] text-ink-dim mt-2 line-clamp-2">{ev.description}</p>}
                      {ev.url && (
                        <a href={ev.url} target="_blank" rel="noopener noreferrer"
                          className="text-[13px] font-bold text-ink underline underline-offset-2 break-all mt-2 inline-block">
                          {ev.url}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => setEditing(ev)} className="btn btn-secondary btn-sm">Editar</button>
                      <button onClick={() => handleDelete(ev)} className="btn btn-sm bg-red text-white">Eliminar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
