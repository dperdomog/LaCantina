'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const REGIONS = ['LATAM', 'Argentina', 'México', 'Chile', 'Colombia', 'Brasil', 'Otra'];
const COMMITMENT = ['Serio', 'Por diversión'];

const ROLE_COLORS = {
  Carry: 'text-yellow border-yellow/40 bg-yellow/10',
  Flex: 'text-green border-green/40 bg-green/10',
  Frontline: 'text-[#f97316] border-[#f97316]/40 bg-[#f97316]/10',
  Support: 'text-cyan border-cyan/40 bg-cyan/10',
  Pick: 'text-[#a78bfa] border-[#a78bfa]/40 bg-[#a78bfa]/10',
  Roamer: 'text-pink border-pink/40 bg-pink/10',
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
    <div className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-[6px] flex items-center justify-center p-6"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#0d0f15] border border-[rgba(255,214,10,0.35)] rounded-[20px] p-8 w-full max-w-[480px] relative glow-yellow max-h-[90vh] overflow-y-auto">
        <button onClick={onClose}
          className="absolute top-4 right-4 bg-white/[.06] border-none text-ink-dim w-8 h-8 rounded-[8px] cursor-pointer flex items-center justify-center hover:bg-white/[.12] transition-colors">✕</button>

        <span className="mono-label text-yellow">// NUEVO EQUIPO</span>
        <h2 className="font-display text-[28px] text-ink leading-none mt-2 mb-6">CREAR EQUIPO</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Imagen */}
          <div className="flex flex-col gap-1.5">
            <span className="mono-label text-[10px]">Imagen del equipo <span className="text-ink-faint">(opcional)</span></span>
            <div className="flex items-center gap-4">
              <div
                onClick={() => fileRef.current?.click()}
                className="w-20 h-20 rounded-[12px] border-2 border-dashed border-[rgba(255,214,10,0.3)] flex items-center justify-center cursor-pointer hover:border-yellow transition-colors overflow-hidden shrink-0 bg-[#06070a]"
              >
                {preview
                  ? <img src={preview} alt="" className="w-full h-full object-cover" />
                  : <span className="text-[24px] text-ink-faint">+</span>
                }
              </div>
              <div className="flex flex-col gap-1">
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="mono-label text-yellow text-[10px] hover:opacity-80 transition-opacity text-left">
                  {preview ? 'Cambiar imagen' : 'Subir imagen'}
                </button>
                <p className="mono-label text-[9px] normal-case text-ink-faint">PNG, JPG · Máx 2MB</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImg} />
            </div>
          </div>

          {/* Nombre */}
          <label className="flex flex-col gap-1.5">
            <span className="mono-label text-[10px]">Nombre del equipo *</span>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ej: Los Cuervos" maxLength={30} required className="field" />
          </label>

          {/* Descripción */}
          <label className="flex flex-col gap-1.5">
            <span className="mono-label text-[10px]">Descripción <span className="text-ink-faint">(opcional)</span></span>
            <textarea value={description} onChange={e => setDesc(e.target.value)}
              placeholder="Contá un poco de qué se trata el equipo…"
              maxLength={200} rows={3}
              className="field resize-none" />
          </label>

          {/* Región */}
          <label className="flex flex-col gap-1.5">
            <span className="mono-label text-[10px]">Región</span>
            <select value={region} onChange={e => setRegion(e.target.value)} className="field">
              {REGIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </label>

          {/* Compromiso */}
          <div className="flex flex-col gap-2">
            <span className="mono-label text-[10px]">Nivel de compromiso</span>
            <div className="grid grid-cols-2 gap-3">
              {COMMITMENT.map(c => (
                <button key={c} type="button" onClick={() => setCommit(commitment === c ? '' : c)}
                  className={`py-3 rounded-[12px] border text-[13px] font-semibold transition-all ${
                    commitment === c
                      ? c === 'Serio'
                        ? 'border-yellow bg-yellow/10 text-yellow'
                        : 'border-cyan bg-cyan/10 text-cyan'
                      : 'border-[rgba(241,237,229,0.1)] text-ink-dim hover:border-ink-dim'
                  }`}>
                  {c === 'Serio' ? '⚡ Serio' : '🎮 Por diversión'}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-pink text-[13px]">{error}</p>}

          <button type="submit" disabled={loading || !name}
            className="w-full py-4 rounded-full bg-yellow text-[#0a0a0a] font-bold text-[15px] shadow-yellow-btn hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Creando…' : 'Crear equipo →'}
          </button>
        </form>
      </div>
    </div>
  );
}

function TeamCard({ team, currentUserId }) {
  const isMine      = team.team_members?.some(m => m.user_id === currentUserId);
  const isCaptain   = team.captain_id === currentUserId;
  const memberCount = team.team_members?.length ?? 0;

  return (
    <a href={`/equipos/${team.id}`} className="no-underline block">
    <div className={`bg-[#0d0f15] rounded-[16px] p-6 border transition-all cursor-pointer ${
      isMine ? 'border-[rgba(255,214,10,0.4)] shadow-[0_0_30px_rgba(255,214,10,0.06)]'
             : 'border-[rgba(241,237,229,0.08)] hover:border-[rgba(255,214,10,0.35)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,.4)]'
    }`}>
      {isMine && (
        <div className="mono-label text-yellow text-[10px] mb-3">
          {isCaptain ? '⚡ Tu equipo (capitán)' : '✓ Tu equipo'}
        </div>
      )}

      <div className="flex items-start gap-3 mb-4">
        {/* Logo */}
        {team.logo_url
          ? <img src={team.logo_url} alt={team.name} className="w-12 h-12 rounded-[10px] object-cover shrink-0 border border-[rgba(241,237,229,0.08)]" />
          : <div className="w-12 h-12 rounded-[10px] bg-yellow/10 border border-yellow/20 flex items-center justify-center font-display text-[18px] text-yellow shrink-0">
              {team.name[0].toUpperCase()}
            </div>
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <h3 className="font-display text-[22px] text-ink leading-none">{team.name}</h3>
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              {team.commitment && (
                <span className={`pill border text-[10px] ${team.commitment === 'Serio' ? 'border-yellow/40 bg-yellow/10 text-yellow' : 'border-cyan/40 bg-cyan/10 text-cyan'}`}>
                  {team.commitment === 'Serio' ? '⚡ Serio' : '🎮 Por diversión'}
                </span>
              )}
              {team.region && (
                <span className="pill border border-[rgba(241,237,229,0.12)] text-ink-dim text-[10px]">{team.region}</span>
              )}
            </div>
          </div>
          <p className="mono-label text-[10px] mt-0.5">
            Cap: <span className="text-ink">{team.profiles?.display_name ?? team.profiles?.discord_username ?? '—'}</span>
          </p>
        </div>
      </div>
      {team.description && (
        <p className="text-ink-dim text-[13px] leading-relaxed mb-4 -mt-1">{team.description}</p>
      )}

      <div className="flex items-center gap-2 mb-5">
        <span className="mono-label text-[10px]">{memberCount}/6 miembros</span>
        <div className="flex-1 h-[3px] bg-[rgba(241,237,229,0.07)] rounded-full">
          <div className="h-full bg-yellow rounded-full" style={{ width: `${(memberCount / 6) * 100}%` }} />
        </div>
      </div>

      {/* Avatares de miembros */}
      <div className="flex items-center gap-1.5 mt-1">
        {team.team_members?.slice(0, 6).map(m => (
          m.profiles?.avatar_url
            ? <img key={m.user_id} src={m.profiles.avatar_url} alt=""
                className="w-7 h-7 rounded-full border-2 border-[#0d0f15]" />
            : <div key={m.user_id} className="w-7 h-7 rounded-full bg-yellow/20 border-2 border-[#0d0f15] flex items-center justify-center mono-label text-[9px] text-yellow">
                {(m.profiles?.display_name ?? '?')[0]}
              </div>
        ))}
        <span className="mono-label text-[10px] ml-1">Ver equipo →</span>
      </div>
    </div>
    </a>
  );
}

export default function EquiposClient({ teams, currentUserId, userTeamId, appliedTeamIds }) {
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
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <span className="mono-label text-yellow">// COMPETENCIA</span>
          <h1 className="font-display text-[clamp(48px,6vw,80px)] leading-[0.9] mt-3 text-ink">
            EQUIPOS <span className="gradient-text">ACTIVOS.</span>
          </h1>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreate(true)}
            className="px-6 py-3 rounded-full bg-yellow text-[#0a0a0a] font-bold text-[14px] shadow-yellow-btn hover:opacity-90 transition-opacity">
            + Crear equipo
          </button>
        )}
        {!currentUserId && (
          <p className="mono-label text-ink-dim text-[11px]">Conectá Discord para crear un equipo</p>
        )}
      </div>

      {/* Barra de búsqueda */}
      <div className="relative mb-8">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint text-[14px] pointer-events-none">⌕</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar equipo…"
          className="w-full max-w-[360px] bg-[#0d0f15] border border-[rgba(241,237,229,0.08)] rounded-full pl-9 pr-4 py-2.5 text-ink text-[14px] placeholder:text-ink-faint focus:outline-none focus:border-[rgba(255,214,10,0.4)] transition-colors"
        />
      </div>

      {/* Grid */}
      {teams.length === 0 ? (
        <div className="text-center py-24">
          <p className="font-display text-[32px] text-ink-dim">No hay equipos aún.</p>
          {canCreate && (
            <button onClick={() => setShowCreate(true)}
              className="mt-6 px-6 py-3 rounded-full border border-yellow text-yellow font-bold text-[14px] hover:bg-yellow/10 transition-colors">
              Sé el primero en crear uno →
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <p className="font-display text-[32px] text-ink-dim">Sin resultados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              currentUserId={currentUserId}
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
