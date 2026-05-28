import { createClient } from '@/lib/supabase/server';
import { notify, notifyMany } from '@/lib/notify';
import { NextResponse } from 'next/server';

// POST /api/tournaments/register — inscribir equipo a un torneo
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { tournament_id, team_name, region, members } = await request.json();
  if (!tournament_id) return NextResponse.json({ error: 'Falta tournament_id' }, { status: 400 });

  // Verificar que el torneo esté abierto
  const { data: torneo } = await supabase
    .from('tournaments').select('id, name, status').eq('id', tournament_id).single();
  if (!torneo || torneo.status !== 'open')
    return NextResponse.json({ error: 'El torneo no está abierto' }, { status: 400 });

  // Insertar inscripción
  const { data: reg, error: regErr } = await supabase.from('registrations').insert({
    tournament_id,
    user_id:         user.id,
    captain_nick:    user.user_metadata?.full_name ?? user.email,
    captain_discord: user.user_metadata?.full_name ?? '',
    team_name,
    region:          region ?? 'LATAM',
    members,
  }).select().single();

  if (regErr) {
    if (regErr.code === '23505')
      return NextResponse.json({ error: 'Este equipo ya está inscrito en este torneo.' }, { status: 400 });
    return NextResponse.json({ error: regErr.message }, { status: 500 });
  }

  // Obtener equipo del capitán para notificar a todos los miembros
  const { data: membership } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('user_id', user.id)
    .single();

  if (membership) {
    // Buscar el team_id
    const { data: teamMembership } = await supabase
      .from('team_members')
      .select('team_id, teams(name)')
      .eq('user_id', user.id)
      .single();

    const teamId   = teamMembership?.team_id;
    const teamName = teamMembership?.teams?.name ?? team_name;

    if (teamId) {
      // Obtener todos los miembros del equipo
      const { data: allMembers } = await supabase
        .from('team_members').select('user_id').eq('team_id', teamId);

      const memberIds    = (allMembers ?? []).map(m => m.user_id);
      const otherMembers = memberIds.filter(id => id !== user.id);

      // Notificar al capitán con confirmación
      await notify(supabase, {
        user_id: user.id,
        type:    'tournament_registered',
        title:   `✅ ${teamName} inscrito en ${torneo.name}`,
        body:    'Tu equipo fue registrado exitosamente. Te contactaremos por Discord con los detalles.',
        data:    { tournament_id, registration_id: reg.id },
      });

      // Notificar al resto de miembros
      if (otherMembers.length > 0) {
        await notifyMany(supabase, otherMembers, {
          type:  'tournament_registered',
          title: `🏆 ${teamName} se inscribió en ${torneo.name}`,
          body:  'Tu equipo fue inscrito en el torneo por el capitán.',
          data:  { tournament_id, registration_id: reg.id },
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
