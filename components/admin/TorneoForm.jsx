'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/admin';

const FORMATS   = ['1v1', '2v2', '4v4', '6v6', '5v5'];
const STATUSES  = [
  { value: 'open',   label: 'Abierto — inscripciones activas' },
  { value: 'soon',   label: 'Próximamente' },
  { value: 'live',   label: 'En vivo' },
  { value: 'closed', label: 'Cerrado' },
];

const EMPTY = {
  name:         '',
  id:           '',       // slug — solo editable en creación
  format:       '4v4',
  status:       'soon',
  max_slots:    32,
  date_display: 'Por definir',
  time_display: 'Por definir',
  prize:        'Por definir',
  region:       'LATAM',
  featured:     false,
  description:  '',
};

/**
 * Props:
 *   tournament?: objeto existente (modo edición)
 *   onSaved?:   callback tras guardar
 */
export default function TorneoForm({ tournament, onSaved }) {
  const router   = useRouter();
  const isEdit   = !!tournament;
  const [form, setForm]   = useState(tournament ? {
    ...EMPTY, ...tournament,
    date_display: tournament.date_display ?? 'Por definir',
    time_display: tournament.time_display ?? 'Por definir',
    prize:        tournament.prize        ?? 'Por definir',
  } : EMPTY);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function set(key, value) {
    setForm(f => {
      const next = { ...f, [key]: value };
      // Auto-generar slug al cambiar el nombre (solo en creación y si el usuario no lo tocó)
      if (key === 'name' && !isEdit) {
        next.id = slugify(value);
      }
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const url    = isEdit ? `/api/admin/tournaments/${tournament.id}` : '/api/admin/tournaments';
    const method = isEdit ? 'PATCH' : 'POST';

    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Error desconocido');
      return;
    }

    if (onSaved) {
      onSaved(data.tournament);
    } else {
      router.push(`/admin/torneos/${data.tournament.id}`);
    }
  }

  function Field({ label, children, note }) {
    return (
      <label className="flex flex-col gap-1.5">
        <span className="mono-label text-[10px]">
          {label}
          {note && <span className="ml-1 normal-case text-ink-faint">{note}</span>}
        </span>
        {children}
      </label>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Nombre */}
      <Field label="Nombre del torneo *">
        <input
          type="text"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Ej: Street Brawl — Temporada 2"
          maxLength={80}
          required
          className="field"
        />
      </Field>

      {/* Slug — solo en creación */}
      {!isEdit && (
        <Field label="ID / URL" note="(auto-generado, editable)">
          <div className="flex items-center gap-2">
            <span className="mono-label text-ink-faint text-[11px] shrink-0">/torneos/</span>
            <input
              type="text"
              value={form.id}
              onChange={e => set('id', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="street-brawl-s2"
              maxLength={60}
              className="field flex-1"
            />
          </div>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Formato */}
        <Field label="Formato">
          <select value={form.format} onChange={e => set('format', e.target.value)} className="field">
            {FORMATS.map(f => <option key={f}>{f}</option>)}
          </select>
        </Field>

        {/* Max slots */}
        <Field label="Cupos máximos">
          <input
            type="number"
            value={form.max_slots}
            onChange={e => set('max_slots', parseInt(e.target.value) || 0)}
            min={2}
            max={256}
            className="field"
          />
        </Field>

        {/* Fecha */}
        <Field label="Fecha" note="(texto, ej: SÁB 15 JUN)">
          <input
            type="text"
            value={form.date_display}
            onChange={e => set('date_display', e.target.value)}
            placeholder="Por definir"
            className="field"
          />
        </Field>

        {/* Hora */}
        <Field label="Hora" note="(texto, ej: 20:00 GMT-6)">
          <input
            type="text"
            value={form.time_display}
            onChange={e => set('time_display', e.target.value)}
            placeholder="Por definir"
            className="field"
          />
        </Field>
      </div>

      {/* Premio */}
      <Field label="Premio">
        <input
          type="text"
          value={form.prize}
          onChange={e => set('prize', e.target.value)}
          placeholder="Ej: $25,000 MXN"
          className="field"
        />
      </Field>

      {/* Región */}
      <Field label="Región">
        <input
          type="text"
          value={form.region}
          onChange={e => set('region', e.target.value)}
          placeholder="LATAM"
          className="field"
        />
      </Field>

      {/* Status */}
      <Field label="Estado">
        <select value={form.status} onChange={e => set('status', e.target.value)} className="field">
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </Field>

      {/* Descripción */}
      <Field label="Descripción" note="(opcional)">
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Reglas, info adicional, contexto del torneo…"
          maxLength={1000}
          rows={4}
          className="field resize-none"
        />
      </Field>

      {/* Featured */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => set('featured', !form.featured)}
          className={`w-10 h-5 rounded-full transition-colors relative ${form.featured ? 'bg-yellow' : 'bg-[rgba(241,237,229,0.1)]'}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.featured ? 'left-5' : 'left-0.5'}`} />
        </div>
        <span className="mono-label text-[10px]">Torneo destacado <span className="normal-case text-ink-faint">(aparece primero en el home)</span></span>
      </label>

      {error && (
        <div className="px-4 py-3 bg-pink/10 border border-pink/30 rounded-xl text-pink text-[13px]">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || !form.name.trim()}
          className="px-8 py-3.5 rounded-full bg-yellow text-[#0a0a0a] font-bold text-[15px] shadow-yellow-btn hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando…' : isEdit ? 'Guardar cambios →' : 'Crear torneo →'}
        </button>
        <a
          href="/admin"
          className="mono-label text-[11px] text-ink-dim hover:text-ink transition-colors no-underline"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
