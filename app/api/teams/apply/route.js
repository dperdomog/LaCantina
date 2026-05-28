import { createClient } from '@/lib/supabase/server';
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

  const { error } = await supabase.from('team_applications')
    .insert({ team_id, applicant_id: user.id });

  if (error?.code === '23505') return NextResponse.json({ error: 'Ya aplicaste a este equipo' }, { status: 400 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notificar al capitán del equipo
  const { data: team } = await supabase
    .from('teams').select('captain_id, name').eq('id', team_id).single();
  if (team) {
    const applicantName = user.user_metadata?.full_name
      ?? user.user_metadata?.user_name
      ?? 'Un jugador';
    await notify(supabase, {
      user_id: team.captain_id,
      type:    'team_apply',
      title:   `${applicantName} quiere unirse a ${team.name}`,
      body:    'Entrá al perfil de tu equipo para aceptar o rechazar la solicitud.',
      data:    { team_id, applicant_id: user.id },
    });
  }

  return NextResponse.json({ ok: true });
}
