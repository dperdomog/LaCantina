import { createClient } from '@/lib/supabase/server';
import { notify } from '@/lib/notify';
import { NextResponse } from 'next/server';

// POST /api/teams/respond — aceptar o rechazar invitación o solicitud
// body: { type: 'invitation'|'application', id: uuid, accept: bool }
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { type, id, accept } = await request.json();
  const status = accept ? 'accepted' : 'declined';

  if (type === 'invitation') {
    // El invitado responde su propia invitación
    const { data: inv, error: fetchErr } = await supabase
      .from('team_invitations').select('team_id, invitee_id').eq('id', id).single();
    if (fetchErr || inv.invitee_id !== user.id)
      return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });

    await supabase.from('team_invitations').update({ status }).eq('id', id);

    if (accept) {
      // Verificar que siga sin equipo
      const { data: existing } = await supabase
        .from('team_members').select('id').eq('user_id', user.id).single();
      if (existing) return NextResponse.json({ error: 'Ya estás en un equipo' }, { status: 400 });

      await supabase.from('team_members').insert({ team_id: inv.team_id, user_id: user.id });
    }

    // Notificar al capitán del resultado
    const { data: team } = await supabase
      .from('teams').select('captain_id, name').eq('id', inv.team_id).single();
    const { data: inviteeProfile } = await supabase
      .from('profiles').select('display_name, discord_username').eq('id', user.id).single();
    const inviteeName = inviteeProfile?.display_name ?? inviteeProfile?.discord_username ?? 'Un jugador';

    if (team?.captain_id) {
      await notify(supabase, {
        user_id: team.captain_id,
        type:    accept ? 'team_accepted' : 'team_declined',
        title:   accept
          ? `${inviteeName} aceptó unirse a ${team.name} 🎉`
          : `${inviteeName} rechazó la invitación`,
        data:    { team_id: inv.team_id },
      });
    }

    return NextResponse.json({ ok: true });
  }

  if (type === 'application') {
    // El capitán responde una solicitud
    const { data: app, error: fetchErr } = await supabase
      .from('team_applications').select('team_id, applicant_id').eq('id', id).single();
    if (fetchErr) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });

    // Verificar que sea el capitán
    const { data: team } = await supabase
      .from('teams').select('captain_id, name').eq('id', app.team_id).single();
    if (team?.captain_id !== user.id)
      return NextResponse.json({ error: 'No sos el capitán' }, { status: 403 });

    await supabase.from('team_applications').update({ status }).eq('id', id);

    if (accept) {
      await supabase.from('team_members').insert({ team_id: app.team_id, user_id: app.applicant_id });
    }

    // Notificar al solicitante
    await notify(supabase, {
      user_id: app.applicant_id,
      type:    accept ? 'team_accepted' : 'team_declined',
      title:   accept
        ? `Tu solicitud para unirte a ${team.name} fue aceptada 🎉`
        : `Tu solicitud para unirte a ${team.name} fue rechazada`,
      data:    { team_id: app.team_id },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
}
