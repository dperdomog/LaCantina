'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE ?? '#discord';
const REGIONS = ['Argentina', 'Chile', 'México', 'Colombia', 'Brasil', 'Otra'];
const EXPERIENCE = ['Principiante (menos de 100h)', 'Intermedio (100–500h)', 'Avanzado (500h+)'];

// Detect any team-based format: 4v4, 6v6, etc.
const isTeamFormat = (format) => /\d+v\d+/i.test(format ?? '');
// Extract the N from NvN (e.g. 4 from "4v4")
const teamSize = (format) => {
  const m = (format ?? '').match(/^(\d+)v\d+/i);
  return m ? parseInt(m[1], 10) : 4;
};

async function loginWithDiscord() {
  const supabase = createClient();
  await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: 'identify email',
    },
  });
}

export default function TorneoModal({ torneo, onClose }) {
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [checking,  setChecking]  = useState(true);
  const [error,     setError]     = useState('');

  const [user,      setUser]      = useState(null);
  const [team,      setTeam]      = useState(null);
  const [members,   setMembers]   = useState([]);
  const [isCaptain, setIsCaptain] = useState(false);

  // Player selection state
  const [starters, setStarters] = useState([]); // array of user_ids, max = slots
  const [subs,     setSubs]     = useState([]); // array of user_ids, max 2

  const isTeam = isTeamFormat(torneo.format);
  const slots  = teamSize(torneo.format); // e.g. 4 for "4v4"

  useEffect(() => {
    const supabase = createClient();

    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user ?? null);

      if (user && isTeam) {
        const { data: membership } = await supabase
          .from('team_members')
          .select('team_id, teams(id, name, region, captain_id, logo_url)')
          .eq('user_id', user.id)
          .single();

        if (membership?.teams) {
          const t = membership.teams;
          setTeam(t);
          setIsCaptain(t.captain_id === user.id);

          const { data: mList } = await supabase
            .from('team_members')
            .select('user_id, profiles!team_members_user_id_fkey(display_name, discord_username, avatar_url, player_role, statlocker_url)')
            .eq('team_id', t.id);
          setMembers(mList ?? []);
        }
      }

      setChecking(false);
    }

    loadData();

    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, isTeam]);

  // ── Selection helpers ──────────────────────────────────────────────────────

  function toggleStarter(userId) {
    if (starters.includes(userId)) {
      setStarters(s => s.filter(id => id !== userId));
    } else if (starters.length < slots) {
      setSubs(s => s.filter(id => id !== userId)); // quitar de subs si estaba
      setStarters(s => [...s, userId]);
    }
  }

  function toggleSub(userId) {
    if (subs.includes(userId)) {
      setSubs(s => s.filter(id => id !== userId));
    } else if (subs.length < 2) {
      setStarters(s => s.filter(id => id !== userId)); // quitar de titulares si estaba
      setSubs(s => [...s, userId]);
    }
  }

  // ── Submit: team format ────────────────────────────────────────────────────

  async function handleSubmitTeam(e) {
    e.preventDefault();
    if (starters.length !== slots) {
      setError(`Seleccioná exactamente ${slots} titulares.`);
      return;
    }
    setLoading(true);
    setError('');

    const supabase = createClient();

    const getName = (uid) => {
      const m = members.find(m => m.user_id === uid);
      return m?.profiles?.display_name ?? m?.profiles?.discord_username ?? 'Jugador';
    };

    const starterNames = starters.map(getName).join(', ');
    const subNames     = subs.map(getName).join(', ');

    const res = await fetch('/api/tournaments/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tournament_id: torneo.id,
        team_name:     team.name,
        region:        team.region ?? 'LATAM',
        members:       `Titulares: ${starterNames}${subNames ? `\nSuplentes: ${subNames}` : ''}`,
      }),
    });
    const json = await res.json();

    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? 'Ocurrió un error. Intentá de nuevo o contactanos por Discord.');
      return;
    }
    setSubmitted(true);
    setTimeout(onClose, 5000);
  }

  // ── Submit: 1v1 ───────────────────────────────────────────────────────────

  async function handleSubmit1v1(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const fd = new FormData(e.target);
    const supabase = createClient();

    const { error: dbError } = await supabase.from('registrations').insert({
      tournament_id:   torneo.id,
      user_id:         user?.id ?? null,
      captain_nick:    fd.get('captain_nick'),
      captain_discord: fd.get('captain_discord') || user?.user_metadata?.user_name || '',
      region:          fd.get('region'),
      experience:      fd.get('experience') || null,
    });

    setLoading(false);
    if (dbError) {
      setError(
        dbError.code === '23505'
          ? 'Ya existe una inscripción con ese Discord para este torneo.'
          : 'Ocurrió un error. Intentá de nuevo o contactanos por Discord.'
      );
      return;
    }
    setSubmitted(true);
    setTimeout(onClose, 5000);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-[6px] flex items-center justify-center p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#0d0f15] border border-[rgba(255,214,10,0.35)] rounded-[20px] p-8 w-full max-w-[520px] relative max-h-[90vh] overflow-y-auto glow-yellow">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/[.06] border-none text-ink-dim w-8 h-8 rounded-[8px] cursor-pointer text-base flex items-center justify-center hover:bg-white/[.12] transition-colors"
        >✕</button>

        {/* ── Éxito ── */}
        {submitted ? (
          <div className="text-center py-6">
            <div className="text-[3rem] mb-4">🎉</div>
            <h3 className="font-display text-[28px] text-green mb-2">¡Inscripción recibida!</h3>
            <p className="text-ink-dim text-[14px]">
              Te contactaremos por Discord con los detalles del torneo.
            </p>
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex items-center justify-center gap-2 w-full px-5 py-3 rounded-full bg-[#5865f2] text-white font-bold text-[14px] no-underline hover:opacity-90 transition-opacity"
            >
              Ir al Discord ↗
            </a>
          </div>

        ) : checking ? (
          <div className="py-12 text-center text-ink-dim mono-label">Cargando…</div>

        ) : (
          <>
            <span className="mono-label text-yellow">INSCRIPCIÓN</span>
            <h3 className="font-display text-[26px] text-ink leading-none mt-2 mb-1">{torneo.name}</h3>
            <p className="text-ink-dim text-[13px] mb-6">
              {isTeam ? 'Solo el capitán puede inscribir al equipo.' : 'Inscribite individualmente al torneo.'}
            </p>

            {error && (
              <div className="mb-5 px-4 py-3 bg-pink/10 border border-pink/30 rounded-xl text-pink text-[13px]">
                {error}
              </div>
            )}

            {/* ── Team format flow ── */}
            {isTeam && (
              <>
                {!user && (
                  <div className="p-5 bg-[#141823] border border-[rgba(255,214,10,0.2)] rounded-xl flex flex-col items-center gap-4 text-center">
                    <p className="text-ink-dim text-[13px]">Necesitás iniciar sesión con Discord para inscribir a tu equipo.</p>
                    <button
                      onClick={loginWithDiscord}
                      className="px-6 py-2.5 rounded-full bg-yellow text-[#0a0a0a] font-bold text-[13px] hover:opacity-90 transition-opacity"
                    >
                      Conectar Discord
                    </button>
                  </div>
                )}

                {user && !team && (
                  <div className="p-5 bg-[#141823] border border-[rgba(241,237,229,0.08)] rounded-xl text-center">
                    <p className="text-ink-dim text-[14px] mb-3">No pertenecés a ningún equipo.</p>
                    <a href="/equipos" className="mono-label text-yellow text-[11px] hover:opacity-80 transition-opacity no-underline">
                      Ver equipos →
                    </a>
                  </div>
                )}

                {user && team && !isCaptain && (
                  <div className="p-5 bg-[#141823] border border-[rgba(241,237,229,0.08)] rounded-xl text-center">
                    <p className="text-ink-dim text-[14px]">Solo el <span className="text-ink font-semibold">capitán del equipo</span> puede inscribirse al torneo.</p>
                  </div>
                )}

                {user && team && isCaptain && (
                  <form onSubmit={handleSubmitTeam} className="flex flex-col gap-5">
                    {/* Team card + player selection */}
                    <div className="p-4 bg-[#06070a] border border-[rgba(255,214,10,0.2)] rounded-[14px]">
                      <span className="mono-label text-yellow text-[10px] block mb-3">// EQUIPO</span>
                      <div className="flex items-center gap-3 mb-4">
                        {team.logo_url
                          ? <img src={team.logo_url} alt={team.name} className="w-10 h-10 rounded-[8px] object-cover border border-[rgba(255,214,10,0.2)] shrink-0" />
                          : <div className="w-10 h-10 rounded-[8px] bg-yellow/10 border border-yellow/20 flex items-center justify-center font-display text-[18px] text-yellow shrink-0">
                              {team.name[0].toUpperCase()}
                            </div>
                        }
                        <div>
                          <p className="font-display text-[20px] text-ink leading-none">{team.name}</p>
                          {team.region && <p className="mono-label text-[10px] mt-0.5">{team.region}</p>}
                        </div>
                      </div>

                      {/* Roster with selection */}
                      <span className="mono-label text-[10px] block mb-1">
                        SELECCIONÁ LOS JUGADORES ({members.length} disponibles)
                      </span>
                      <p className="mono-label text-[9px] normal-case text-ink-faint mb-3">
                        Elegí {slots} titulares (TIT) y hasta 2 suplentes (SUP).
                      </p>

                      {members.length < slots + 1 && (
                        <div className="mb-3 px-3 py-2 bg-pink/10 border border-pink/30 rounded-lg">
                          <span className="mono-label text-pink text-[10px]">
                            Necesitás al menos {slots + 1} miembros en el equipo para participar.
                          </span>
                        </div>
                      )}

                      <div className="flex flex-col gap-2.5">
                        {members.map(m => {
                          const uid        = m.user_id;
                          const isStarter  = starters.includes(uid);
                          const isSub      = subs.includes(uid);
                          const hasLocker  = !!m.profiles?.statlocker_url;
                          const name       = m.profiles?.display_name ?? m.profiles?.discord_username ?? 'Jugador';
                          return (
                            <div key={uid} className={`flex items-center gap-2 ${!hasLocker ? 'opacity-50' : ''}`}>
                              {m.profiles?.avatar_url
                                ? <img src={m.profiles.avatar_url} alt="" className="w-7 h-7 rounded-full border border-[rgba(241,237,229,0.1)] shrink-0" />
                                : <div className="w-7 h-7 rounded-full bg-yellow/10 flex items-center justify-center mono-label text-[10px] text-yellow shrink-0">
                                    {(m.profiles?.display_name ?? '?')[0]}
                                  </div>
                              }
                              <span className="text-ink text-[13px] flex-1 min-w-0 truncate">{name}</span>
                              {uid === team.captain_id && (
                                <span className="mono-label text-yellow text-[9px]">CAP</span>
                              )}
                              {!hasLocker
                                ? <span className="mono-label text-pink text-[9px]">SIN STAT</span>
                                : m.profiles?.player_role && (
                                    <span className="mono-label text-ink-faint text-[9px]">{m.profiles.player_role}</span>
                                  )
                              }
                              <div className="flex gap-1 ml-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => toggleStarter(uid)}
                                  disabled={!hasLocker || (!isStarter && starters.length >= slots)}
                                  className={`px-2 py-0.5 rounded-full mono-label text-[9px] border transition-colors ${
                                    isStarter
                                      ? 'bg-yellow/20 border-yellow text-yellow'
                                      : 'border-[rgba(241,237,229,0.15)] text-ink-faint hover:border-yellow/50 disabled:opacity-25 disabled:cursor-not-allowed'
                                  }`}
                                >TIT</button>
                                <button
                                  type="button"
                                  onClick={() => toggleSub(uid)}
                                  disabled={!hasLocker || (!isSub && subs.length >= 2)}
                                  className={`px-2 py-0.5 rounded-full mono-label text-[9px] border transition-colors ${
                                    isSub
                                      ? 'bg-cyan/20 border-cyan text-cyan'
                                      : 'border-[rgba(241,237,229,0.15)] text-ink-faint hover:border-cyan/50 disabled:opacity-25 disabled:cursor-not-allowed'
                                  }`}
                                >SUP</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Selection counter */}
                      <div className="flex gap-4 mt-3 pt-3 border-t border-[rgba(241,237,229,0.08)]">
                        <span className={`mono-label text-[10px] ${starters.length === slots ? 'text-yellow' : 'text-ink-dim'}`}>
                          {starters.length}/{slots} titulares
                        </span>
                        <span className={`mono-label text-[10px] ${subs.length > 0 ? 'text-cyan' : 'text-ink-dim'}`}>
                          {subs.length}/2 suplentes
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-green/10 border border-green/30 rounded-xl">
                      <span className="mono-label text-green text-[11px]">
                        ✓ Inscribiendo como capitán: {user.user_metadata?.full_name ?? user.email}
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || starters.length !== slots || members.length < slots + 1}
                      className="w-full py-4 rounded-full bg-yellow text-[#0a0a0a] font-bold text-[15px] shadow-yellow-btn hover:opacity-90 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {loading ? 'Enviando…' : 'Confirmar inscripción →'}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* ── 1v1 flow ── */}
            {!isTeam && (
              <>
                {user && (
                  <div className="mb-5 p-3 bg-green/10 border border-green/30 rounded-xl">
                    <span className="mono-label text-green text-[11px]">
                      ✓ Conectado como {user.user_metadata?.full_name ?? user.email}
                    </span>
                  </div>
                )}

                {!user && (
                  <div className="mb-5 p-4 bg-[#141823] border border-[rgba(255,214,10,0.2)] rounded-xl flex items-center justify-between gap-4">
                    <p className="text-ink-dim text-[13px] leading-snug">
                      Conectá tu Discord para inscribirte más rápido.
                    </p>
                    <button
                      onClick={loginWithDiscord}
                      className="shrink-0 px-4 py-2 rounded-full bg-yellow text-[#0a0a0a] font-bold text-[12px] hover:opacity-90 transition-opacity"
                    >
                      Conectar Discord
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmit1v1} className="flex flex-col gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="mono-label">Nick en Deadlock *</span>
                    <input name="captain_nick" type="text" placeholder="Tu nick en el juego" required className="field" />
                  </label>

                  {!user && (
                    <label className="flex flex-col gap-1.5">
                      <span className="mono-label">Discord *</span>
                      <input name="captain_discord" type="text" placeholder="usuario o usuario#0000" required className="field" />
                    </label>
                  )}

                  <label className="flex flex-col gap-1.5">
                    <span className="mono-label">País</span>
                    <select name="region" className="field">
                      {REGIONS.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="mono-label">Experiencia en Deadlock</span>
                    <select name="experience" className="field">
                      {EXPERIENCE.map(x => <option key={x}>{x}</option>)}
                    </select>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 w-full py-4 rounded-full bg-yellow text-[#0a0a0a] font-bold text-[15px] shadow-yellow-btn hover:opacity-90 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? 'Enviando…' : 'Confirmar inscripción →'}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
