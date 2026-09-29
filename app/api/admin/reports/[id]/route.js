import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';

// PATCH /api/admin/reports/[id] — marcar resuelto o descartar.
// Aplica a todos los reportes abiertos sobre el mismo objetivo.
export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { status } = await request.json();
  if (!['resolved', 'dismissed'].includes(status))
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });

  const { data: report } = await supabase
    .from('reports').select('target_type, target_id').eq('id', id).maybeSingle();
  if (!report) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });

  const { data: updated, error } = await supabase
    .from('reports')
    .update({ status, resolved_by: user.id, resolved_at: new Date().toISOString() })
    .eq('target_type', report.target_type)
    .eq('target_id', report.target_id)
    .eq('status', 'open')
    .select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, updated: updated?.length ?? 0 });
}
