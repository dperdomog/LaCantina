import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notify } from '@/lib/notify';
import { NextResponse } from 'next/server';

// POST /api/teams/apply — jugador libre aplica a un equipo
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { team_id } = await request.json();

  // Verificar que no esté ya en un equipo
  const { data: member } = await supabase
    .from('team_members').select('id').eq('user_id', user.id).single();
  if (member) return NextResponse.json({ error: 'Ya estás en un equipo' }, { status: 400 });

  // Verificar que el equipo exista y obtener capitán
  const { data: team } = await supabase
    .from('teams').select('captain_id, name').eq('id', team_id).single();
  if (!team) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });

  // Usar admin client para limpiar aplicaciones previas (bypass RLS)
  const admin = createAdminClient();
  await admin.from('team_applications')
    .delete()
    .eq('team_id', team_id)
    .eq('applicant_id', user.id);

  // Insertar nueva solicitud
  const { error } = await admin.from('team_applications')
    .insert({ team_id, applicant_id: user.id, status: 'pending' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notificar al capitán
  const applicantName = user.user_metadata?.full_name
    ?? user.user_metadata?.user_name
    ?? 'Un jugador';
  await notify(null, {
    user_id: team.captain_id,
    type:    'team_apply',
    title:   `${applicantName} quiere unirse a ${team.name}`,
    body:    'Revisá las solicitudes en la página de tu equipo o en tu perfil.',
    data:    { team_id, applicant_id: user.id },
  });

  return NextResponse.json({ ok: true });
}
