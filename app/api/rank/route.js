import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { accountIdFromStatlocker, fetchRanks, rankInfo } from '@/lib/ranks';
import { NextResponse } from 'next/server';

function normalizeStatlockerUrl(raw) {
  const url = new URL(raw);
  if (!url.hostname.includes('statlocker.gg')) return null;
  const match = url.pathname.match(/\/profile\/(\d+)/);
  if (!match) return null;
  return `https://statlocker.gg/profile/${match[1]}`;
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { statlocker_url: raw } = await request.json();

  let statlocker_url;
  try {
    statlocker_url = normalizeStatlockerUrl(raw);
  } catch { statlocker_url = null; }

  if (!statlocker_url) {
    return NextResponse.json(
      { error: 'URL inválida. Debe ser del tipo https://statlocker.gg/profile/{steam_id}' },
      { status: 400 }
    );
  }

  // Verificar si ya tiene StatLocker y si fue cambiado hace menos de 30 días
  const { data: profile } = await supabase
    .from('profiles')
    .select('statlocker_url, statlocker_updated_at')
    .eq('id', user.id)
    .single();

  if (profile?.statlocker_url && profile?.statlocker_updated_at) {
    const daysSince = (Date.now() - new Date(profile.statlocker_updated_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 30) {
      const nextDate = new Date(profile.statlocker_updated_at);
      nextDate.setDate(nextDate.getDate() + 30);
      const formatted = nextDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
      return NextResponse.json(
        { error: `Solo puedes cambiar tu StatLocker una vez por mes. Próximo cambio disponible: ${formatted}.` },
        { status: 429 }
      );
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ statlocker_url, statlocker_updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Traer el rango ya mismo. Lo escribe el servidor: el usuario no puede editar su rango.
  const accountId = accountIdFromStatlocker(statlocker_url);
  const ranks     = await fetchRanks([accountId]);
  const badge     = ranks.has(accountId) ? ranks.get(accountId) : null;
  try {
    await createAdminClient().from('profiles').update({
      rank_badge:      badge,
      deadlock_rank:   badge === null ? null : rankInfo(badge).name,
      // Sin dato (API caída o cuenta privada): se reintenta en la próxima visita
      rank_updated_at: badge === null ? null : new Date().toISOString(),
    }).eq('id', user.id);
  } catch {
    // El rango no es crítico; el enlace ya quedó guardado
  }

  return NextResponse.json({ statlocker_url, rank_badge: badge });
}
