import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { applyResult, revertResult, getChampion } from '@/lib/bracket';
import { notifyMany } from '@/lib/notify';
import { announce, COLORS } from '@/lib/discord';
import { NextResponse } from 'next/server';

const FIELDS = ['reg_a', 'reg_b', 'bye_a', 'bye_b', 'score_a', 'score_b', 'winner_id', 'status'];

// PATCH /api/admin/matches/[id] — cargar resultado { score_a, score_b } o corregir { revert: true }
export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const body = await request.json();

  const { data: match } = await supabase.from('matches').select('tournament_id').eq('id', id).single();
  if (!match) return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 });

  const { data: all } = await supabase.from('matches').select('*').eq('tournament_id', match.tournament_id);

  let result;
  try {
    result = body.revert
      ? revertResult(all ?? [], id)
      : applyResult(all ?? [], id, Number(body.score_a), Number(body.score_b));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  // Guardar solo las partidas que cambiaron
  for (const m of result.matches.filter(m => result.changed.has(m.id))) {
    const update = Object.fromEntries(FIELDS.map(f => [f, m[f]]));
    const { error } = await supabase.from('matches').update(update).eq('id', m.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Campeón: cerrar el torneo y anunciarlo (o reabrirlo si se corrigió la final)
  const champion = getChampion(result.matches);
  const { data: torneo } = await supabase
    .from('tournaments').select('id, name, winner_registration_id').eq('id', match.tournament_id).single();

  if (champion && torneo.winner_registration_id !== champion) {
    await supabase.from('tournaments')
      .update({ winner_registration_id: champion, status: 'closed' }).eq('id', torneo.id);

    const { data: reg } = await supabase
      .from('registrations').select('team_name, captain_nick, player_ids').eq('id', champion).single();
    const name = reg?.team_name ?? reg?.captain_nick ?? 'El campeón';

    await announce({
      title:       `🏆 ¡${name} es campeón de ${torneo.name}!`,
      description: 'Mira la llave completa y los resultados en La Cantina.',
      path:        `/torneos/${torneo.id}`,
      color:       COLORS.yellow,
    });
    await notifyMany(supabase, reg?.player_ids ?? [], {
      type:  'tournament_champion',
      title: `🏆 ¡Ganaron ${torneo.name}!`,
      body:  `${name} es campeón. ¡Felicitaciones!`,
      data:  { tournament_id: torneo.id },
    });
  } else if (!champion && torneo.winner_registration_id) {
    await supabase.from('tournaments')
      .update({ winner_registration_id: null, status: 'live' }).eq('id', torneo.id);
  }

  return NextResponse.json({ ok: true, champion });
}
