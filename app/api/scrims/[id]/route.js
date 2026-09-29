import { createClient } from '@/lib/supabase/server';
import { notify } from '@/lib/notify';
import { NextResponse } from 'next/server';

const MESSAGES = {
  accepted:  (team) => ({ type: 'scrim_accepted',  title: `✅ ${team} aceptó el scrim` }),
  declined:  (team) => ({ type: 'scrim_declined',  title: `❌ ${team} rechazó el scrim` }),
  cancelled: (team) => ({ type: 'scrim_cancelled', title: `🚫 ${team} canceló el scrim` }),
};

// PATCH /api/scrims/[id] — responder o cancelar un scrim
// - El capitán del equipo invitado acepta o rechaza un scrim pendiente.
// - El capitán que lo propuso puede cancelarlo (pendiente o aceptado).
// - Un scrim aceptado lo puede cancelar cualquiera de los dos capitanes.
export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { status } = await request.json();
  if (!MESSAGES[status]) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });

  const { data: scrim } = await supabase
    .from('scrims').select('id, from_team, to_team, status').eq('id', id).single();
  if (!scrim) return NextResponse.json({ error: 'Scrim no encontrado' }, { status: 404 });

  const [{ data: fromTeam }, { data: toTeam }] = await Promise.all([
    supabase.from('teams').select('id, name, captain_id').eq('id', scrim.from_team).single(),
    supabase.from('teams').select('id, name, captain_id').eq('id', scrim.to_team).single(),
  ]);
  if (!fromTeam || !toTeam) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });

  const isFromCaptain = fromTeam.captain_id === user.id;
  const isToCaptain   = toTeam.captain_id === user.id;

  let allowed = false;
  if (status === 'accepted' || status === 'declined') {
    allowed = isToCaptain && scrim.status === 'pending';
  } else if (status === 'cancelled') {
    allowed = (scrim.status === 'pending' && isFromCaptain)
           || (scrim.status === 'accepted' && (isFromCaptain || isToCaptain));
  }
  if (!allowed) return NextResponse.json({ error: 'No puedes hacer ese cambio en este scrim' }, { status: 403 });

  const { error } = await supabase.from('scrims').update({ status }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Avisar al capitán del otro equipo
  const actorTeam = isToCaptain ? toTeam : fromTeam;
  const otherTeam = isToCaptain ? fromTeam : toTeam;
  await notify(supabase, {
    user_id: otherTeam.captain_id,
    ...MESSAGES[status](actorTeam.name),
    body:    'Revisa los scrims en la página de tu equipo.',
    data:    { scrim_id: scrim.id, team_id: otherTeam.id },
  });

  return NextResponse.json({ ok: true, status });
}
