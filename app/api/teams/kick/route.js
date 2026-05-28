import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/teams/kick — capitán elimina a un miembro
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { team_id, user_id } = await request.json();

  // Verificar que quien llama es el capitán
  const { data: team } = await supabase
    .from('teams').select('captain_id').eq('id', team_id).single();
  if (!team) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
  if (team.captain_id !== user.id)
    return NextResponse.json({ error: 'No sos el capitán' }, { status: 403 });

  // No puede kickearse a sí mismo
  if (user_id === user.id)
    return NextResponse.json({ error: 'No podés kickearte a vos mismo' }, { status: 400 });

  await supabase.from('team_members')
    .delete()
    .eq('team_id', team_id)
    .eq('user_id', user_id);

  return NextResponse.json({ ok: true });
}
