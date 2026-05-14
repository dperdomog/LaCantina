import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { notifyMany } from '@/lib/notify';
import { NextResponse } from 'next/server';

const STATUS_LABELS = {
  open:   'Las inscripciones ya están disponibles.',
  live:   'El torneo está en vivo. ¡Suerte a todos!',
  closed: 'El torneo ha finalizado.',
  soon:   null,
};

// PATCH /api/admin/tournaments/[id] — editar torneo
export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const body = await request.json();
  const allowed = ['name', 'format', 'date_display', 'time_display', 'status', 'max_slots', 'prize', 'region', 'featured', 'description'];
  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  }

  // Leer estado anterior antes de actualizar (para detectar cambio de status)
  let prevStatus = null;
  if (updates.status) {
    const { data: prev } = await supabase
      .from('tournaments').select('status').eq('id', params.id).single();
    prevStatus = prev?.status ?? null;
  }

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!tournament) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });

  // Disparar notificaciones si el status cambió
  const newStatus = updates.status;
  if (newStatus && newStatus !== prevStatus && STATUS_LABELS[newStatus]) {
    const statusBody = STATUS_LABELS[newStatus];

    if (newStatus === 'open') {
      // Notificar a todos los usuarios registrados
      const { data: profiles } = await supabase.from('profiles').select('id');
      const ids = (profiles ?? []).map(p => p.id);
      await notifyMany(supabase, ids, {
        type:  'tournament_open',
        title: `🏆 ${tournament.name} abrió inscripciones`,
        body:  statusBody,
        data:  { tournament_id: params.id },
      });
    } else {
      // Notificar a capitanes inscritos: match por discord_username
      const { data: regs } = await supabase
        .from('registrations')
        .select('captain_discord')
        .eq('tournament_id', params.id);

      const discordNames = [...new Set((regs ?? []).map(r => r.captain_discord).filter(Boolean))];

      if (discordNames.length > 0) {
        const { data: captainProfiles } = await supabase
          .from('profiles')
          .select('id')
          .in('discord_username', discordNames);

        const ids = (captainProfiles ?? []).map(p => p.id);
        const typeMap = { live: 'tournament_live', closed: 'tournament_closed' };

        await notifyMany(supabase, ids, {
          type:  typeMap[newStatus] ?? 'tournament_update',
          title: newStatus === 'live'
            ? `🔴 ${tournament.name} está en vivo`
            : `🏁 ${tournament.name} ha finalizado`,
          body:  statusBody,
          data:  { tournament_id: params.id },
        });
      }
    }
  }

  return NextResponse.json({ tournament });
}

// DELETE /api/admin/tournaments/[id] — eliminar torneo
export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
