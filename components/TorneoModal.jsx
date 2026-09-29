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
      setError(`Selecciona exactamente ${slots} titulares.`);
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
        player_ids:    [...starters, ...subs],
      }),
    });
    const json = await res.json();

    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? 'Ocurrió un error. Intenta de nuevo o contáctanos por Discord.');
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
      player_ids:      user ? [user.id] : [],
    });

    setLoading(false);
    if (dbError) {
      setError(
        dbError.code === '23505'
          ? 'Ya existe una inscripción con ese Discord para este torneo.'
          : 'Ocurrió un error. Intenta de nuevo o contáctanos por Discord.'
      );
      return;
    }
    setSubmitted(true);
    setTimeout(onClose, 5000);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-[4px] flex items-center justify-center p-5"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="sticker p-7 md:p-8 w-full max-w-[540px] relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 w-9 h-9 rounded-full border-[3px] border-line bg-surface-2 text-ink font-bold cursor-pointer flex items-center justify-center hover:bg-yellow hover:text-on-color transition-colors"
        >✕</button>

        {/* ── Éxito ── */}
        {submitted ? (
          <div className="text-center py-6">
            <div className="text-[3rem] mb-4">🎉</div>
            <h3 className="font-display text-[30px] text-ink mb-2">¡Inscripción recibida!</h3>
            <p className="text-ink-dim text-[14px]">
              Te contactaremos por Discord con los detalles del torneo.
            </p>
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-discord w-full mt-6"
            >
              Ir al Discord ↗
            </a>
          </div>

        ) : checking ? (
          <div className="py-12 text-center text-ink-dim mono-label">Cargando…</div>

        ) : (
          <>
            <span className="mono-label">🏆 Inscripción</span>
            <h3 className="font-display text-[28px] text-ink leading-tight mt-2 mb-1 pr-10">{torneo.name}</h3>
            <p className="text-ink-dim text-[14px] mb-6">
              {isTeam ? 'Solo el capitán puede inscribir al equipo.' : 'Inscríbete individualmente al torneo.'}
            </p>

            {error && (
              <div className="mb-5 px-4 py-3 bg-pink/15 border-[3px] border-line rounded-2xl text-pink-ink text-[14px] font-semibold">
                {error}
              </div>
            )}

            {/* ── Team format flow ── */}
            {isTeam && (
              <>
                {!user && (
                  <div className="p-5 bg-surface-2 border-[3px] border-line rounded-2xl flex flex-col items-center gap-4 text-center">
                    <p className="text-ink-dim text-[13px]">Necesitas iniciar sesión con Discord para inscribir a tu equipo.</p>
                    <button
                      onClick={loginWithDiscord}
                      className="btn btn-discord btn-sm"
                    >
                      Conectar Discord
                    </button>
                  </div>
                )}

                {user && !team && (
                  <div className="p-5 bg-surface-2 border-[3px] border-line rounded-2xl text-center">
                    <p className="text-ink-dim text-[14px] mb-3">No perteneces a ningún equipo.</p>
                    <a href="/equipos" className="font-display text-[16px] text-ink underline decoration-[3px] underline-offset-4">
                      Ver equipos →
                    </a>
                  </div>
                )}

                {user && team && !isCaptain && (
                  <div className="p-5 bg-surface-2 border-[3px] border-line rounded-2xl text-center">
                    <p className="text-ink-dim text-[14px]">Solo el <span className="text-ink font-semibold">capitán del equipo</span> puede inscribirse al torneo.</p>
                  </div>
                )}

                {user && team && isCaptain && (
                  <form onSubmit={handleSubmitTeam} className="flex flex-col gap-5">
                    {/* Team card + player selection */}
                    <div className="p-4 bg-surface-2 border-[3px] border-line rounded-2xl">
                      <span className="mono-label block mb-3">Equipo</span>
                      <div className="flex items-center gap-3 mb-4">
                        {team.logo_url
                          ? <img src={team.logo_url} alt={team.name} className="w-11 h-11 rounded-xl object-cover border-[3px] border-line shrink-0" />
                          : <div className="w-11 h-11 rounded-xl bg-yellow border-[3px] border-line flex items-center justify-center font-display text-[18px] text-on-color shrink-0">
                              {team.name[0].toUpperCase()}
                            </div>
                        }
                        <div>
                          <p className="font-display text-[20px] text-ink leading-none">{team.name}</p>
                          {team.region && <p className="text-[13px] text-ink-dim mt-0.5">{team.region}</p>}
                        </div>
                      </div>

                      {/* Roster with selection */}
                      <span className="mono-label block mb-1">
                        SELECCIONA LOS JUGADORES ({members.length} disponibles)
                      </span>
                      <p className="text-[13px] text-ink-dim mb-3">
                        Elige {slots} titulares (TIT) y hasta 2 suplentes (SUP).
                      </p>

                      {members.length < slots + 1 && (
                        <div className="mb-3 px-3 py-2 bg-pink/15 border-2 border-line rounded-xl">
                          <span className="text-[13px] font-bold text-pink-ink">
                            Necesitas al menos {slots + 1} miembros en el equipo para participar.
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
                                ? <img src={m.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full border-2 border-line shrink-0" />
                                : <div className="w-8 h-8 rounded-full bg-yellow border-2 border-line flex items-center justify-center font-display text-[12px] text-on-color shrink-0">
                                    {(m.profiles?.display_name ?? '?')[0]}
                                  </div>
                              }
                              <span className="text-ink text-[14px] font-semibold flex-1 min-w-0 truncate">{name}</span>
                              {uid === team.captain_id && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow text-on-color border-2 border-line">CAP</span>
                              )}
                              {!hasLocker
                                ? <span className="text-[11px] font-bold text-pink-ink">Sin StatLocker</span>
                                : m.profiles?.player_role && (
                                    <span className="text-[12px] text-ink-dim">{m.profiles.player_role}</span>
                                  )
                              }
                              <div className="flex gap-1 ml-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => toggleStarter(uid)}
                                  disabled={!hasLocker || (!isStarter && starters.length >= slots)}
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border-2 transition-colors ${
                                    isStarter
                                      ? 'bg-yellow border-line text-on-color'
                                      : 'border-ink/30 text-ink-dim hover:border-line disabled:opacity-25 disabled:cursor-not-allowed'
                                  }`}
                                >TIT</button>
                                <button
                                  type="button"
                                  onClick={() => toggleSub(uid)}
                                  disabled={!hasLocker || (!isSub && subs.length >= 2)}
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border-2 transition-colors ${
                                    isSub
                                      ? 'bg-cyan border-line text-on-color'
                                      : 'border-ink/30 text-ink-dim hover:border-line disabled:opacity-25 disabled:cursor-not-allowed'
                                  }`}
                                >SUP</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Selection counter */}
                      <div className="flex gap-4 mt-4 pt-3 border-t-2 border-rule">
                        <span className={`text-[13px] font-bold ${starters.length === slots ? 'text-yellow-ink' : 'text-ink-dim'}`}>
                          {starters.length}/{slots} titulares
                        </span>
                        <span className={`text-[13px] font-bold ${subs.length > 0 ? 'text-cyan-ink' : 'text-ink-dim'}`}>
                          {subs.length}/2 suplentes
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-green/20 border-[3px] border-line rounded-2xl">
                      <span className="text-[13px] font-bold text-green-ink">
                        ✓ Inscribiendo como capitán: {user.user_metadata?.full_name ?? user.email}
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || starters.length !== slots || members.length < slots + 1}
                      className="btn btn-primary w-full text-[17px] py-4"
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
                  <div className="mb-5 p-3 bg-green/20 border-[3px] border-line rounded-2xl">
                    <span className="text-[13px] font-bold text-green-ink">
                      ✓ Conectado como {user.user_metadata?.full_name ?? user.email}
                    </span>
                  </div>
                )}

                {!user && (
                  <div className="mb-5 p-4 bg-surface-2 border-[3px] border-line rounded-2xl flex items-center justify-between gap-4">
                    <p className="text-ink-dim text-[13px] leading-snug">
                      Conecta tu Discord para inscribirte más rápido.
                    </p>
                    <button
                      onClick={loginWithDiscord}
                      className="btn btn-discord btn-sm shrink-0"
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
                    className="btn btn-primary w-full text-[17px] py-4 mt-2"
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
