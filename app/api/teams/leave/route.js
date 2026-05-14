import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/teams/leave — salir del equipo (o disolver si sos capitán)
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { team_id } = await request.json();

  const { data: team } = await supabase
    .from('teams').select('captain_id').eq('id', team_id).single();
  if (!team) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });

  if (team.captain_id === user.id) {
    // Capitán disuelve el equipo — CASCADE borra members, invitations, applications
    await supabase.from('teams').delete().eq('id', team_id);
  } else {
    // Miembro sale del equipo
    await supabase.from('team_members').delete().eq('team_id', team_id).eq('user_id', user.id);
  }

  return NextResponse.json({ ok: true });
}
