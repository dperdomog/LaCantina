'use client';

import { useState } from 'react';

const ROLES = ['Carry', 'Flex', 'Frontline', 'Support', 'Pick', 'Roamer'];

const ROLE_COLORS = {
  Carry:     'text-yellow  border-yellow/40    bg-yellow/10',
  Flex:      'text-green   border-green/40     bg-green/10',
  Frontline: 'text-[#f97316] border-[#f97316]/40 bg-[#f97316]/10',
  Support:   'text-cyan    border-cyan/40      bg-cyan/10',
  Pick:      'text-[#a78bfa] border-[#a78bfa]/40 bg-[#a78bfa]/10',
  Roamer:    'text-pink    border-pink/40      bg-pink/10',
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
    <div className="bg-[#0d0f15] border border-[rgba(241,237,229,0.08)] rounded-[16px] px-5 py-4 col-span-full">
      <div className="flex items-center gap-4">
        <span className="mono-label text-yellow shrink-0">// ROL</span>

        {!editing && (
          <>
            <div className="flex-1">
              {savedRole ? (
                <span className={`pill border text-[12px] font-semibold ${roleClass}`}>
                  {savedRole}
                </span>
              ) : (
                <span className="text-ink-dim text-[13px]">Sin rol asignado.</span>
              )}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="mono-label text-[10px] text-ink-dim hover:text-yellow transition-colors shrink-0"
            >
              Editar →
            </button>
          </>
        )}
      </div>

      {!editing && null /* evitar espacio extra */}

      {editing && (
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="mono-label text-[10px]">Rol</span>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(role === r ? '' : r)}
                  className={`pill border text-[12px] font-semibold transition-all ${
                    role === r
                      ? ROLE_COLORS[r]
                      : 'text-ink-dim border-[rgba(241,237,229,0.12)] bg-transparent hover:border-ink-dim'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-pink text-[12px]">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-full bg-yellow text-[#0a0a0a] font-bold text-[13px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando…' : 'Guardar →'}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setTeam(savedTeam); setRole(savedRole); setError(''); }}
              className="px-5 py-3 rounded-full border border-[rgba(241,237,229,0.08)] text-ink-dim text-[13px] hover:border-ink-dim transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
