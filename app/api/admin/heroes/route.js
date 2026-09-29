import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { PENDING_HERO_IDS, heroInfo } from '@/lib/heroes';

// PATCH /api/admin/heroes — habilita o deshabilita un héroe pendiente en el draft
// body: { hero_id, enabled }
export async function PATCH(request) {
  const supabase = await createClient();
  const { user, error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { hero_id, enabled } = await request.json().catch(() => ({}));
  const id = Number(hero_id);
  if (!PENDING_HERO_IDS.includes(id))
    return NextResponse.json({ error: 'Ese héroe no está pendiente de salir' }, { status: 400 });
  if (typeof enabled !== 'boolean')
    return NextResponse.json({ error: 'Falta indicar si está disponible' }, { status: 400 });

  const { error } = await supabase.from('hero_availability').upsert({
    hero_id: id, enabled, updated_by: user.id, updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, hero_id: id, name: heroInfo(id).name, enabled });
}
