'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const MAX_BYTES = 3 * 1024 * 1024;

// Botones sobre el banner del perfil: subir uno propio o volver al de Discord
export default function BannerUpload({ userId, hasCustom }) {
  const router  = useRouter();
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function save(custom_banner_url) {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_banner_url }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'No se pudo guardar el banner.'); return false; }
    router.refresh();
    return true;
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('El archivo tiene que ser una imagen.'); return; }
    if (file.size > MAX_BYTES) { setError('La imagen no puede pesar más de 3 MB.'); return; }

    setLoading(true); setError('');
    const supabase = createClient();
    const ext  = file.name.split('.').pop();
    const path = `banners/${userId}-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadErr) { setError('Error al subir la imagen: ' + uploadErr.message); setLoading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    await save(publicUrl);
    setLoading(false);
  }

  async function handleRemove() {
    setLoading(true); setError('');
    await save(null);
    setLoading(false);
  }

  return (
    <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
      <div className="flex gap-2">
        {hasCustom && (
          <button type="button" onClick={handleRemove} disabled={loading} className="btn btn-secondary btn-sm">
            Quitar banner
          </button>
        )}
        <button type="button" onClick={() => fileRef.current?.click()} disabled={loading} className="btn btn-primary btn-sm">
          {loading ? 'Subiendo…' : '📷 Cambiar banner'}
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {error && (
        <p className="bg-surface border-2 border-line rounded-xl px-3 py-1.5 text-pink-ink text-[12px] font-bold max-w-[260px]">{error}</p>
      )}
    </div>
  );
}
