import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';

// PATCH /api/admin/players/[id] — editar statlocker (sin límite mensual)
// o quitar el banner propio con { clear_banner: true } (moderación)
export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const body = await request.json();

  if (body.clear_banner) {
    const { error } = await supabase
      .from('profiles')
      .update({ custom_banner_url: null })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { statlocker_url } = body;

  const { error } = await supabase
    .from('profiles')
    .update({ statlocker_url: statlocker_url || null })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/players/[id] — eliminar jugador
export async function DELETE(_, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
