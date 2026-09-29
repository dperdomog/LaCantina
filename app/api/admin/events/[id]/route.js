import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';
import { validateEvent } from '../validate';

// PATCH /api/admin/events/[id] — editar evento
export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { values, error } = validateEvent(await request.json(), { partial: true });
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (Object.keys(values).length === 0) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });

  const { data, error: dbError } = await supabase
    .from('events').update(values).eq('id', id).select();
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });

  return NextResponse.json({ event: data[0] });
}

// DELETE /api/admin/events/[id] — eliminar evento
export async function DELETE(_, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
