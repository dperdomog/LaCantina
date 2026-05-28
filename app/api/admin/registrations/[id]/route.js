import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { notify } from '@/lib/notify';
import { NextResponse } from 'next/server';

// DELETE /api/admin/registrations/[id] — eliminar inscripción
export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  // Obtener datos antes de borrar para poder notificar
  const { data: reg } = await supabase
    .from('registrations')
    .select('user_id, team_name, tournament_id, tournaments(name)')
    .eq('id', params.id)
    .single();

  const { error } = await supabase
    .from('registrations')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notificar al capitán que registró
  if (reg?.user_id) {
    const torneoName = reg.tournaments?.name ?? 'el torneo';
    await notify(supabase, {
      user_id: reg.user_id,
      type:    'registration_removed',
      title:   `⚠️ Inscripción de ${reg.team_name ?? 'tu equipo'} eliminada`,
      body:    `Tu inscripción en ${torneoName} fue eliminada por un administrador. Contactanos por Discord si creés que es un error.`,
      data:    { tournament_id: reg.tournament_id },
    });
  }

  return NextResponse.json({ ok: true });
}
