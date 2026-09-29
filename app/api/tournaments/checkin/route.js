import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// POST /api/tournaments/checkin — el capitán confirma asistencia { registration_id }
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { registration_id } = await request.json();
  const admin = createAdminClient();

  const { data: reg } = await admin
    .from('registrations').select('id, user_id, tournament_id, checked_in_at').eq('id', registration_id).single();
  if (!reg) return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 });
  if (reg.user_id !== user.id)
    return NextResponse.json({ error: 'Solo quien inscribió puede hacer el check-in' }, { status: 403 });
  if (reg.checked_in_at) return NextResponse.json({ ok: true, checked_in_at: reg.checked_in_at });

  const { data: torneo } = await admin
    .from('tournaments').select('starts_at, checkin_minutes').eq('id', reg.tournament_id).single();
  if (!torneo?.starts_at)
    return NextResponse.json({ error: 'Este torneo no tiene horario de check-in' }, { status: 400 });

  const { count } = await admin
    .from('matches').select('id', { count: 'exact', head: true }).eq('tournament_id', reg.tournament_id);
  if (count > 0) return NextResponse.json({ error: 'La llave ya se generó; el check-in cerró' }, { status: 400 });

  const start = new Date(torneo.starts_at).getTime();
  const opens = start - (torneo.checkin_minutes ?? 60) * 60000;
  const now   = Date.now();
  if (now < opens) return NextResponse.json({ error: 'El check-in todavía no abrió' }, { status: 400 });
  if (now > start) return NextResponse.json({ error: 'El check-in ya cerró' }, { status: 400 });

  const checked_in_at = new Date().toISOString();
  const { error } = await admin.from('registrations').update({ checked_in_at }).eq('id', reg.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, checked_in_at });
}
