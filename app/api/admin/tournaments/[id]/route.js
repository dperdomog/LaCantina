import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { notifyMany } from '@/lib/notify';
import { announce, COLORS } from '@/lib/discord';
import { NextResponse } from 'next/server';

// Campos nuevos de llave/check-in: valida y normaliza (null si viene vacío)
function bracketFields(body) {
  const out = {};
  if (body.starts_at !== undefined) {
    const d = body.starts_at ? new Date(body.starts_at) : null;
    if (d && isNaN(d)) return { error: 'Fecha de inicio inválida' };
    out.starts_at = d ? d.toISOString() : null;
  }
  if (body.checkin_minutes !== undefined) {
    const n = Number(body.checkin_minutes);
    if (!Number.isInteger(n) || n < 0 || n > 1440) return { error: 'Los minutos de check-in deben ser entre 0 y 1440' };
    out.checkin_minutes = n;
  }
  if (body.bracket_type !== undefined) {
    if (!['single', 'double'].includes(body.bracket_type)) return { error: 'Tipo de llave inválido' };
    out.bracket_type = body.bracket_type;
  }
  return { fields: out };
}

const STATUS_LABELS = {
  open:   'Las inscripciones ya están disponibles.',
  live:   'El torneo está en vivo. ¡Suerte a todos!',
  closed: 'El torneo ha finalizado.',
  soon:   null,
};

// PATCH /api/admin/tournaments/[id] — editar torneo
export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const body = await request.json();
  const allowed = ['name', 'format', 'date_display', 'time_display', 'status', 'max_slots', 'prize', 'region', 'featured', 'description'];
  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  const extra = bracketFields(body);
  if (extra.error) return NextResponse.json({ error: extra.error }, { status: 400 });
  Object.assign(updates, extra.fields);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  }

  // Leer estado anterior antes de actualizar (para detectar cambio de status)
  let prevStatus = null;
  if (updates.status) {
    const { data: prev } = await supabase
      .from('tournaments').select('status').eq('id', id).single();
    prevStatus = prev?.status ?? null;
  }

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!tournament) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });

  // Disparar notificaciones si el status cambió
  const newStatus = updates.status;
  if (newStatus && newStatus !== prevStatus && STATUS_LABELS[newStatus]) {
    const statusBody = STATUS_LABELS[newStatus];

    if (newStatus === 'open') {
      await announce({
        title:       `🏆 ${tournament.name} abrió inscripciones`,
        description: `${tournament.format} · ${tournament.region}${tournament.prize ? ` · Premio: ${tournament.prize}` : ''}`,
        path:        `/torneos/${id}`,
        color:       COLORS.green,
      });

      // Notificar a todos los usuarios registrados
      const { data: profiles } = await supabase.from('profiles').select('id');
      const ids = (profiles ?? []).map(p => p.id);
      await notifyMany(supabase, ids, {
        type:  'tournament_open',
        title: `🏆 ${tournament.name} abrió inscripciones`,
        body:  statusBody,
        data:  { tournament_id: id },
      });
    } else {
      // Notificar a capitanes inscritos: match por discord_username
      const { data: regs } = await supabase
        .from('registrations')
        .select('captain_discord')
        .eq('tournament_id', id);

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
          data:  { tournament_id: id },
        });
      }
    }
  }

  return NextResponse.json({ tournament });
}

// DELETE /api/admin/tournaments/[id] — eliminar torneo
export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
