import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';

// DELETE /api/admin/registrations/[id] — eliminar inscripción
export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { error } = await supabase
    .from('registrations')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
