'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { averageBadge, RankChip } from '@/components/TeamRank';

const REGIONS = ['LATAM', 'Argentina', 'México', 'Chile', 'Colombia', 'Brasil', 'Otra'];
const COMMITMENT = ['Serio', 'Por diversión'];

const ROLE_COLORS = {
  Carry: 'text-yellow-ink border-yellow/40 bg-yellow/10',
  Flex: 'text-green-ink border-green/40 bg-green/10',
  Frontline: 'text-[#f97316] border-[#f97316]/40 bg-[#f97316]/10',
  Support: 'text-cyan-ink border-cyan/40 bg-cyan/10',
  Pick: 'text-[#a78bfa] border-[#a78bfa]/40 bg-[#a78bfa]/10',
  Roamer: 'text-pink-ink border-pink/40 bg-pink/10',
};

function CreateTeamModal({ onClose, onCreated }) {
  const [name, setName]           = useState('');
  const [region, setRegion]       = useState('LATAM');
  const [description, setDesc]    = useState('');
  const [commitment, setCommit]   = useState('');
  const [preview, setPreview]     = useState(null);
  const [imgFile, setImgFile]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const fileRef                   = useRef(null);

  function handleImg(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');

    let logo_url = null;

    // Subir imagen a Supabase Storage si el usuario eligió una
    if (imgFile) {
      const supabase = createClient();
      const ext  = imgFile.name.split('.').pop();
      const path = `team-logos/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, imgFile, { upsert: true });

      if (uploadErr) {
        setError('Error al subir la imagen: ' + uploadErr.message);
        setLoading(false); return;
      }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      logo_url = publicUrl;
    }

    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, region, logo_url, description, commitment: commitment || null }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    onCreated(data.team);
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-5"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sticker p-7 md:p-8 w-full max-w-[480px] relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} aria-label="Cerrar"
          className="absolute top-4 right-4 w-9 h-9 rounded-full border-[3px] border-line bg-surface text-ink font-bold flex items-center justify-center hover:bg-surface-2 transition-colors">✕</button>

        <span className="mono-label">🛡️ Nuevo equipo</span>
        <h2 className="font-display text-[32px] text-ink leading-none mt-2 mb-6">Crea tu equipo</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Imagen */}
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-bold text-ink">Imagen del equipo <span className="font-normal text-ink-dim">(opcional)</span></span>
            <div className="flex items-center gap-4">
              <div
                onClick={() => fileRef.current?.click()}
                className="w-20 h-20 rounded-2xl border-[3px] border-dashed border-line flex items-center justify-center cursor-pointer hover:bg-surface-2 transition-colors overflow-hidden shrink-0 bg-surface-2"
              >
                {preview
                  ? <img src={preview} alt="" className="w-full h-full object-cover" />
                  : <span className="font-display text-[28px] text-ink-dim">+</span>
                }
              </div>
              <div className="flex flex-col gap-1.5 items-start">
                <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-secondary btn-sm">
                  {preview ? 'Cambiar imagen' : 'Subir imagen'}
                </button>
                <p className="text-[12px] text-ink-dim">PNG o JPG · Máx. 2 MB</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImg} />
            </div>
          </div>

          {/* Nombre */}
          <label className="flex flex-col gap-2">
            <span className="text-[14px] font-bold text-ink">Nombre del equipo *</span>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ej: Los Cuervos" maxLength={30} required className="field" />
          </label>

          {/* Descripción */}
          <label className="flex flex-col gap-2">
            <span className="text-[14px] font-bold text-ink">Descripción <span className="font-normal text-ink-dim">(opcional)</span></span>
            <textarea value={description} onChange={e => setDesc(e.target.value)}
              placeholder="Cuenta un poco de qué se trata el equipo…"
              maxLength={200} rows={3}
              className="field resize-none" />
          </label>

          {/* Región */}
          <label className="flex flex-col gap-2">
            <span className="text-[14px] font-bold text-ink">Región</span>
            <select value={region} onChange={e => setRegion(e.target.value)} className="field">
              {REGIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </label>

          {/* Compromiso */}
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-bold text-ink">Nivel de compromiso</span>
            <div className="grid grid-cols-2 gap-3">
              {COMMITMENT.map(c => (
                <button key={c} type="button" onClick={() => setCommit(commitment === c ? '' : c)}
                  className={`font-display py-3 rounded-2xl border-[3px] border-line text-[16px] transition-all ${
                    commitment === c
                      ? c === 'Serio'
                        ? 'bg-yellow text-on-color shadow-sticker-sm'
                        : 'bg-cyan text-on-color shadow-sticker-sm'
                      : 'bg-surface text-ink-dim hover:text-ink hover:bg-surface-2'
                  }`}>
                  {c === 'Serio' ? '⚡ Serio' : '🎮 Por diversión'}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-pink-ink text-[14px] font-bold">{error}</p>}

          <button type="submit" disabled={loading || !name} className="btn btn-primary w-full text-[17px]">
            {loading ? 'Creando…' : 'Crear equipo →'}
          </button>
        </form>
      </div>
    </div>
  );
}

function TeamCard({ team, currentUserId, rankById }) {
  const isMine      = team.team_members?.some(m => m.user_id === currentUserId);
  const avgBadge    = averageBadge((team.team_members ?? []).map(m => rankById[m.user_id]));
  const isCaptain   = team.captain_id === currentUserId;
  const memberCount = team.team_members?.length ?? 0;

  return (
    <a href={`/equipos/${team.slug ?? team.id}`} className="no-underline block h-full text-ink">
    <div className={`sticker p-6 h-full flex flex-col hover:-translate-y-1 transition-transform cursor-pointer ${
      isMine ? 'bg-yellow/[0.18]' : ''
    }`}>
      {isMine && (
        <span className="pill bg-yellow text-on-color self-start mb-4">
          {isCaptain ? '⚡ Tu equipo · capitán' : '✓ Tu equipo'}
        </span>
      )}

      <div className="flex items-start gap-3 mb-4">
        {/* Logo */}
        {team.logo_url
          ? <img src={team.logo_url} alt={team.name} className="w-14 h-14 rounded-2xl object-cover shrink-0 border-[3px] border-line" />
          : <div className="w-14 h-14 rounded-2xl bg-yellow border-[3px] border-line flex items-center justify-center font-display text-[24px] text-on-color shrink-0">
              {team.name[0].toUpperCase()}
            </div>
        }
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-[24px] text-ink leading-tight break-words">{team.name}</h3>
          <p className="text-[13px] text-ink-dim mt-0.5 truncate">
            Capitán: <span className="text-ink font-bold">{team.profiles?.display_name ?? team.profiles?.discord_username ?? '—'}</span>
          </p>
        </div>
      </div>

      {(team.commitment || team.region) && (
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {team.commitment && (
            <span className={`pill text-on-color ${team.commitment === 'Serio' ? 'bg-yellow' : 'bg-cyan'}`}>
              {team.commitment === 'Serio' ? '⚡ Serio' : '🎮 Por diversión'}
            </span>
          )}
          {team.region && (
            <span className="pill bg-surface text-ink">{team.region}</span>
          )}
        </div>
      )}

      {avgBadge && (
        <div className="flex items-center gap-2 mb-4 text-[13px] text-ink-dim">
          Rango promedio <RankChip badge={avgBadge} />
        </div>
      )}

      {team.description && (
        <p className="text-ink-dim text-[14px] leading-relaxed mb-4">{team.description}</p>
      )}

      <div className="mt-auto">
        <div className="flex justify-between text-[13px] font-bold mb-1.5">
          <span>Miembros</span><span>{memberCount}/6</span>
        </div>
        <div className="h-4 bg-surface-2 border-[3px] border-line rounded-full overflow-hidden">
          <div className="h-full bg-orange" style={{ width: `${Math.min(100, (memberCount / 6) * 100)}%` }} />
        </div>

        {/* Avatares de miembros */}
        <div className="flex items-center justify-between gap-2 mt-4">
          <div className="flex -space-x-2">
            {team.team_members?.slice(0, 6).map(m => (
              m.profiles?.avatar_url
                ? <img key={m.user_id} src={m.profiles.avatar_url} alt=""
                    className="w-8 h-8 rounded-full border-[3px] border-line bg-surface object-cover" />
                : <div key={m.user_id} className="w-8 h-8 rounded-full bg-green border-[3px] border-line flex items-center justify-center font-display text-[13px] text-on-color">
                    {(m.profiles?.display_name ?? '?')[0]}
                  </div>
            ))}
          </div>
          <span className="font-display text-[15px] text-ink whitespace-nowrap">Ver equipo →</span>
        </div>
      </div>
    </div>
    </a>
  );
}

export default function EquiposClient({ teams, currentUserId, userTeamId, appliedTeamIds, rankById = {} }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const canCreate = currentUserId && !userTeamId;

  const filtered = search.trim()
    ? teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    : teams;

  function handleCreated() {
    setShowCreate(false);
    router.refresh();
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between mb-10 flex-wrap gap-6">
        <div>
          <span className="mono-label">🛡️ Equipos</span>
          <h1 className="font-display text-[clamp(40px,6vw,68px)] leading-[1] tracking-[-0.02em] mt-2 text-ink">
            Equipos{' '}
            <mark className="bg-yellow text-on-color px-3 rounded-2xl border-[3px] border-line inline-block -rotate-2">activos</mark>
          </h1>
          <p className="text-[18px] text-ink-dim mt-4 max-w-[520px]">
            Encuentra un equipo que busque jugadores o arma el tuyo e invita a la comunidad.
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreate(true)} className="btn btn-primary text-[17px]">
            + Crear equipo
          </button>
        )}
        {!currentUserId && (
          <p className="text-[14px] font-bold text-ink-dim">Conecta Discord para crear un equipo.</p>
        )}
      </div>

      {/* Barra de búsqueda */}
      <div className="relative mb-10 w-full max-w-[380px]">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-dim text-[16px] pointer-events-none">⌕</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar equipo…"
          className="field rounded-full pl-10"
        />
      </div>

      {/* Grid */}
      {teams.length === 0 ? (
        <div className="sticker p-10 text-center max-w-[560px] mx-auto">
          <p className="font-display text-[30px] text-ink leading-tight">Todavía no hay equipos.</p>
          <p className="text-[16px] text-ink-dim mt-2">Arma el primero y empieza a invitar gente de la comunidad.</p>
          {canCreate && (
            <button onClick={() => setShowCreate(true)} className="btn btn-primary mt-6">
              Crear el primer equipo →
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="sticker p-10 text-center max-w-[560px] mx-auto">
          <p className="font-display text-[28px] text-ink leading-tight">Sin resultados.</p>
          <p className="text-[16px] text-ink-dim mt-2">Ningún equipo coincide con “{search}”.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              currentUserId={currentUserId}
              rankById={rankById}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateTeamModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </>
  );
}
