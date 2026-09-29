import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { generateBracket, hasResults } from '@/lib/bracket';
import { NextResponse } from 'next/server';

// POST /api/admin/tournaments/[id]/bracket — generar la llave con los inscritos
// (solo los que hicieron check-in, si alguno lo hizo)
export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { data: torneo } = await supabase
    .from('tournaments').select('id, bracket_type').eq('id', id).single();
  if (!torneo) return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });

  const { data: existing } = await supabase
    .from('matches').select('id, score_a, score_b').eq('tournament_id', id);
  if (hasResults(existing ?? []))
    return NextResponse.json({ error: 'La llave ya tiene resultados; no se puede regenerar.' }, { status: 409 });

  const { data: regs } = await supabase
    .from('registrations').select('id, seed, created_at, checked_in_at').eq('tournament_id', id);
  const all = regs ?? [];
  const pool = all.some(r => r.checked_in_at) ? all.filter(r => r.checked_in_at) : all;
  if (pool.length < 2)
    return NextResponse.json({ error: 'Se necesitan al menos 2 inscritos (con check-in, si hubo check-in).' }, { status: 400 });

  pool.sort((a, b) =>
    (a.seed ?? Infinity) - (b.seed ?? Infinity) || new Date(a.created_at) - new Date(b.created_at));

  let rows;
  try {
    rows = generateBracket(pool.map(r => r.id), torneo.bracket_type ?? 'single', () => crypto.randomUUID());
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  if (existing?.length) {
    const { error: delErr } = await supabase.from('matches').delete().eq('tournament_id', id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  const { error: insErr } = await supabase
    .from('matches')
    .insert(rows.map(r => ({ ...r, tournament_id: id })));
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  await supabase.from('tournaments').update({ status: 'live', winner_registration_id: null }).eq('id', id);

  return NextResponse.json({ ok: true, matches: rows.length });
}

// DELETE /api/admin/tournaments/[id]/bracket — borrar la llave (solo sin resultados)
export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { data: existing } = await supabase
    .from('matches').select('id, score_a, score_b').eq('tournament_id', id);
  if (hasResults(existing ?? []))
    return NextResponse.json({ error: 'La llave ya tiene resultados; no se puede borrar.' }, { status: 409 });

  const { error } = await supabase.from('matches').delete().eq('tournament_id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
