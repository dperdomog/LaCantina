import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';

// PATCH /api/admin/players/[id] — editar statlocker (sin límite mensual)
export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { statlocker_url } = await request.json();

  const { error } = await supabase
    .from('profiles')
    .update({ statlocker_url: statlocker_url || null })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/players/[id] — eliminar jugador
export async function DELETE(_, { params }) {
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
