'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { roundLabel, canRevert, hasResults } from '@/lib/bracket';

function sideText(m, side, names) {
  const reg = m[`reg_${side}`];
  if (reg) return names[reg] ?? 'Equipo';
  return m[`bye_${side}`] ? 'Pase libre' : 'Por definir';
}

function MatchRow({ m, all, names, onSave, onRevert, onDraft, busy }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const played = m.status === 'done' && m.score_a != null;

  return (
    <div className={`px-5 py-4 flex items-center gap-3 flex-wrap ${m.status === 'skipped' ? 'opacity-40' : ''}`}>
      <div className="flex-1 min-w-[220px] flex flex-col gap-1">
        {['a', 'b'].map(side => {
          const won = m.winner_id && m.winner_id === m[`reg_${side}`];
          return (
            <span key={side} className={`text-[15px] truncate ${won ? 'font-bold text-ink' : m[`reg_${side}`] ? 'text-ink' : 'text-ink-faint italic'}`}>
              {won && '🏆 '}{sideText(m, side, names)}
              {played && <span className="font-display ml-2">{m[`score_${side}`]}</span>}
            </span>
          );
        })}
      </div>

      {m.status === 'ready' && (
        <form
          className="flex items-center gap-2"
          onSubmit={e => { e.preventDefault(); onSave(m.id, Number(a), Number(b)); }}
        >
          <input type="number" min={0} value={a} onChange={e => setA(e.target.value)} required
            aria-label="Puntaje A" className="field !w-[72px] !py-2 text-center" />
          <span className="font-bold text-ink-dim">–</span>
          <input type="number" min={0} value={b} onChange={e => setB(e.target.value)} required
            aria-label="Puntaje B" className="field !w-[72px] !py-2 text-center" />
          <button type="submit" disabled={busy} className="btn btn-primary btn-sm">Guardar</button>
        </form>
      )}
      {played && canRevert(all, m.id) && (
        <button onClick={() => onRevert(m.id)} disabled={busy} className="btn btn-secondary btn-sm">Corregir</button>
      )}
      {m.reg_a && m.reg_b && m.status !== 'done' && m.status !== 'skipped' && (
        <button type="button" onClick={() => onDraft(m.id)} disabled={busy} className="btn btn-secondary btn-sm" title="Abrir la sala de draft de esta partida">🎯 Draft</button>
      )}
      {m.status === 'done' && m.score_a == null && <span className="pill bg-surface-2 text-ink-dim">Pase libre</span>}
      {m.status === 'pending' && <span className="text-[13px] text-ink-dim">Esperando rivales</span>}
    </div>
  );
}

export default function BracketAdmin({ tournament, matches, registrations }) {
  const router = useRouter();
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');

  const isTeam = /\d+v\d+/i.test(tournament.format ?? '');
  const names  = Object.fromEntries(registrations.map(r => [r.id, (isTeam ? r.team_name : r.captain_nick) ?? r.captain_nick ?? '—']));
  const checkedIn = registrations.filter(r => r.checked_in_at).length;

  async function call(url, method, body) {
    setBusy(true); setError('');
    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error ?? 'Ocurrió un error'); return; }
    router.refresh();
  }

  const generate = () => call(`/api/admin/tournaments/${tournament.id}/bracket`, 'POST');
  const reset    = () => confirm('¿Borrar la llave? Se puede volver a generar.') && call(`/api/admin/tournaments/${tournament.id}/bracket`, 'DELETE');
  const save     = (id, score_a, score_b) => call(`/api/admin/matches/${id}`, 'PATCH', { score_a, score_b });
  const revert   = id => call(`/api/admin/matches/${id}`, 'PATCH', { revert: true });

  // Abre (o crea) la sala de draft de la partida en otra pestaña.
  // La pestaña se abre antes del fetch para que el navegador no la bloquee.
  async function openDraft(matchId) {
    const tab = window.open('', '_blank');
    setBusy(true); setError('');
    const res  = await fetch('/api/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId, format: '6v6', timer_s: 30 }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) { tab?.close(); setError(data.error ?? 'No se pudo abrir el draft.'); return; }
    const url = `/draft/${data.draft.id}`;
    if (tab) tab.location.href = url;
    else window.location.href = url;
  }

  const champion = tournament.winner_registration_id ? names[tournament.winner_registration_id] : null;
  const sections = [
    ['W', matches.some(m => m.bracket === 'GF') ? 'Llave de ganadores' : 'Llave'],
    ['L', 'Llave de perdedores'],
    ['GF', 'Gran final'],
  ];

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="px-4 py-3 bg-pink/15 border-[3px] border-line rounded-2xl text-pink-ink text-[14px] font-semibold">{error}</div>
      )}

      {matches.length === 0 ? (
        <div className="sticker p-6 flex flex-col gap-4 max-w-[720px]">
          <div>
            <span className="font-display text-[22px]">Generar la llave</span>
            <p className="text-[15px] text-ink-dim mt-1">
              {tournament.bracket_type === 'double' ? 'Eliminación doble' : 'Eliminación simple'} con {checkedIn > 0
                ? <><b className="text-ink">{checkedIn}</b> inscritos que hicieron check-in</>
                : <>los <b className="text-ink">{registrations.length}</b> inscritos (nadie hizo check-in)</>}.
              Los seeds siguen el orden de inscripción. El torneo pasa a &ldquo;En vivo&rdquo;.
            </p>
          </div>
          <button onClick={generate} disabled={busy || registrations.length < 2} className="btn btn-primary self-start">
            {busy ? 'Generando…' : 'Generar llave →'}
          </button>
          {registrations.length < 2 && <p className="text-[13px] text-ink-dim">Se necesitan al menos 2 inscritos.</p>}
        </div>
      ) : (
        <>
          {champion && (
            <div className="sticker bg-yellow text-on-color p-5 flex items-center gap-3">
              <span className="text-[36px] leading-none">🏆</span>
              <div>
                <span className="font-display text-[14px] uppercase tracking-wider">Campeón</span>
                <p className="font-display text-[26px] leading-tight">{champion}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <a href={`/torneos/${tournament.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Ver llave pública ↗</a>
            <button onClick={reset} disabled={busy || hasResults(matches)} className="btn btn-sm bg-red text-white"
              title={hasResults(matches) ? 'Ya hay resultados cargados' : undefined}>
              Borrar llave
            </button>
            {hasResults(matches) && <span className="text-[13px] text-ink-dim">Con resultados cargados la llave ya no se puede borrar; usa &ldquo;Corregir&rdquo;.</span>}
          </div>

          {sections.map(([key, title]) => {
            const ms = matches.filter(m => m.bracket === key && !(key === 'GF' && m.round === 2 && m.status === 'skipped'));
            if (ms.length === 0) return null;
            const rounds = [...new Set(ms.map(m => m.round))].sort((x, y) => x - y);
            return (
              <div key={key}>
                <h3 className="font-display text-[22px] mb-3">{title}</h3>
                <div className="flex flex-col gap-4">
                  {rounds.map(r => (
                    <div key={r} className="sticker overflow-hidden">
                      <div className="px-5 py-2 bg-surface-2 border-b-[3px] border-line mono-label">{roundLabel(matches, key, r)}</div>
                      <div className="divide-y-2 divide-rule">
                        {ms.filter(m => m.round === r).sort((x, y) => x.position - y.position).map(m => (
                          <MatchRow key={m.id} m={m} all={matches} names={names} onSave={save} onRevert={revert} onDraft={openDraft} busy={busy} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
