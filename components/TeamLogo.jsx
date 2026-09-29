'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const MAX_BYTES = 2 * 1024 * 1024;

// Logo del equipo; el capitán puede hacer clic para subir uno nuevo
export default function TeamLogo({ teamId, name, logoUrl, canEdit }) {
  const router  = useRouter();
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const logo = logoUrl
    ? <img src={logoUrl} alt={name}
        className="w-24 h-24 rounded-2xl object-cover border-[3px] border-line shadow-sticker-sm -rotate-3" />
    : <div className="w-24 h-24 rounded-2xl bg-yellow border-[3px] border-line shadow-sticker-sm flex items-center justify-center font-display text-[44px] text-on-color -rotate-3">
        {name[0].toUpperCase()}
      </div>;

  if (!canEdit) return <div className="shrink-0">{logo}</div>;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('El archivo tiene que ser una imagen.'); return; }
    if (file.size > MAX_BYTES) { setError('La imagen no puede pesar más de 2 MB.'); return; }

    setLoading(true); setError('');
    const supabase = createClient();
    const ext  = file.name.split('.').pop();
    const path = `team-logos/${teamId}-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadErr) { setError('Error al subir la imagen: ' + uploadErr.message); setLoading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    const res = await fetch('/api/teams', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: teamId, logo_url: publicUrl }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    router.refresh();
  }

  return (
    <div className="shrink-0 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        title={logoUrl ? 'Cambiar logo' : 'Agregar logo'}
        className="relative group rounded-2xl disabled:cursor-wait"
      >
        {logo}
        <span className={`absolute inset-0 -rotate-3 rounded-2xl bg-black/55 text-white font-display text-[14px] flex flex-col items-center justify-center gap-0.5 transition-opacity ${
          loading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
        }`}>
          {loading ? 'Subiendo…' : <><span className="text-[20px]">📷</span>{logoUrl ? 'Cambiar' : 'Agregar'}</>}
        </span>
      </button>
      <span className="text-[12px] font-bold text-ink-dim">{logoUrl ? 'Cambiar logo' : 'Agregar logo'}</span>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {error && <p className="text-pink-ink text-[12px] font-semibold max-w-[140px] text-center">{error}</p>}
    </div>
  );
}
