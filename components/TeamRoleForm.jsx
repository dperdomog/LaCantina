'use client';

import { useState } from 'react';

const ROLES = ['Carry', 'Flex', 'Frontline', 'Support', 'Pick', 'Roamer'];

const ROLE_COLORS = {
  Carry:     'bg-yellow text-on-color',
  Flex:      'bg-green text-on-color',
  Frontline: 'bg-[#f97316] text-on-color',
  Support:   'bg-cyan text-on-color',
  Pick:      'bg-[#a78bfa] text-on-color',
  Roamer:    'bg-pink text-on-color',
};

export default function TeamRoleForm({ initialTeam, initialRole }) {
  const [editing, setEditing]   = useState(false);
  const [team, setTeam]         = useState(initialTeam ?? '');
  const [role, setRole]         = useState(initialRole ?? '');
  const [savedTeam, setSavedTeam] = useState(initialTeam ?? '');
  const [savedRole, setSavedRole] = useState(initialRole ?? '');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_name: team, player_role: role }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? 'Error al guardar.'); return; }

    setSavedTeam(data.team_name ?? '');
    setSavedRole(data.player_role ?? '');
    setEditing(false);
  }

  const roleClass = savedRole ? ROLE_COLORS[savedRole] : '';

  return (
    <div className="sticker px-6 py-5 col-span-full">
      <div className="flex items-center gap-4">
        <span className="mono-label shrink-0">🎯 Rol</span>

        {!editing && (
          <>
            <div className="flex-1">
              {savedRole ? (
                <span className={`pill ${roleClass}`}>
                  {savedRole}
                </span>
              ) : (
                <span className="text-ink-dim text-[15px]">Todavía no eliges un rol.</span>
              )}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="btn btn-secondary btn-sm shrink-0"
            >
              Editar
            </button>
          </>
        )}
      </div>

      {!editing && null /* evitar espacio extra */}

      {editing && (
        <form onSubmit={handleSave} className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col gap-2">
            <span className="mono-label text-[11px]">Elige tu rol</span>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(role === r ? '' : r)}
                  className={`pill !py-2 transition-transform hover:-translate-y-0.5 ${
                    role === r
                      ? ROLE_COLORS[r]
                      : 'bg-surface text-ink-dim'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-pink-ink text-[14px] font-bold">{error}</p>}

          <div className="flex gap-3 flex-wrap">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex-1"
            >
              {loading ? 'Guardando…' : 'Guardar →'}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setTeam(savedTeam); setRole(savedRole); setError(''); }}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
