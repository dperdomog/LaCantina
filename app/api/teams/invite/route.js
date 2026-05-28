import { createClient } from '@/lib/supabase/server';
import { notify } from '@/lib/notify';
import { NextResponse } from 'next/server';

// POST /api/teams/invite — capitán invita a un jugador
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { invitee_id } = await request.json();

  // Verificar que el usuario sea capitán de un equipo
  const { data: team } = await supabase
    .from('teams').select('id, name').eq('captain_id', user.id).single();
  if (!team) return NextResponse.json({ error: 'No sos capitán de ningún equipo' }, { status: 403 });

  // Verificar que el invitado no esté ya en un equipo
  const { data: member } = await supabase
    .from('team_members').select('id').eq('user_id', invitee_id).single();
  if (member) return NextResponse.json({ error: 'El jugador ya está en un equipo' }, { status: 400 });

  // Verificar que el equipo no supere los 9 miembros
  const { count } = await supabase
    .from('team_members').select('id', { count: 'exact', head: true }).eq('team_id', team.id);
  if (count >= 9) return NextResponse.json({ error: 'Tu equipo ya tiene el máximo de 9 miembros' }, { status: 400 });

  const { error } = await supabase.from('team_invitations')
    .insert({ team_id: team.id, invitee_id });

  if (error?.code === '23505') return NextResponse.json({ error: 'Ya enviaste una invitación a este jugador' }, { status: 400 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notificar al jugador invitado
  await notify(supabase, {
    user_id: invitee_id,
    type:    'team_invite',
    title:   `${team.name} te invitó a su equipo`,
    body:    'Entrá a tu perfil para aceptar o rechazar la invitación.',
    data:    { team_id: team.id },
  });

  return NextResponse.json({ ok: true, team_name: team.name });
}
