import { createClient } from '@/lib/supabase/server';
import { notify } from '@/lib/notify';
import { NextResponse } from 'next/server';
import { bannedResponse } from '@/lib/moderation';

// POST /api/scrims — el capitán propone un scrim (partida de práctica) a otro equipo
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const banned = await bannedResponse(supabase, user.id);
  if (banned) return banned;

  const { from_team, to_team, proposed_at, message } = await request.json();
  if (!from_team || !to_team)
    return NextResponse.json({ error: 'Elige el equipo rival' }, { status: 400 });
  if (from_team === to_team)
    return NextResponse.json({ error: 'No puedes proponerle un scrim a tu propio equipo' }, { status: 400 });

  const when = new Date(proposed_at);
  if (!proposed_at || Number.isNaN(when.getTime()))
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
  if (when.getTime() <= Date.now())
    return NextResponse.json({ error: 'La fecha tiene que ser en el futuro' }, { status: 400 });

  const text = typeof message === 'string' ? message.trim() : '';
  if (text.length > 300)
    return NextResponse.json({ error: 'El mensaje no puede superar los 300 caracteres' }, { status: 400 });

  const [{ data: fromTeam }, { data: toTeam }] = await Promise.all([
    supabase.from('teams').select('id, name, captain_id').eq('id', from_team).single(),
    supabase.from('teams').select('id, name, captain_id').eq('id', to_team).single(),
  ]);
  if (!fromTeam || !toTeam) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
  if (fromTeam.captain_id !== user.id)
    return NextResponse.json({ error: 'Solo el capitán puede proponer scrims' }, { status: 403 });

  const { data: scrim, error } = await supabase.from('scrims').insert({
    from_team,
    to_team,
    proposed_at: when.toISOString(),
    message:     text || null,
    created_by:  user.id,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await notify(supabase, {
    user_id: toTeam.captain_id,
    type:    'scrim_request',
    title:   `🎯 ${fromTeam.name} te propone un scrim`,
    body:    'Revisa la fecha y responde desde la página de tu equipo.',
    data:    { scrim_id: scrim.id, team_id: toTeam.id },
  });

  return NextResponse.json({ scrim });
}
