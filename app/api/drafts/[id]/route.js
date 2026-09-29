import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { bannedResponse } from '@/lib/moderation';
import { currentTurn, makeAction, autoAction, isDone } from '@/lib/draft';
import { getHeroPool } from '@/lib/heroPool';

const fail = (error, status = 400) => NextResponse.json({ error }, { status });

// Guarda cambios solo si nadie movió la sala desde que la leímos (bloqueo optimista)
async function commit(admin, draft, patch, extra = q => q) {
  const { data, error } = await extra(admin.from('drafts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', draft.id).eq('step', draft.step).eq('status', draft.status))
    .select().maybeSingle();
  if (error) return { error: fail(error.message, 500) };
  if (!data) return { error: fail('La sala cambió mientras tanto, intenta de nuevo', 409) };
  return { draft: data };
}

// Agrega una acción (pick/ban) y avanza el turno
function advance(draft, action) {
  const actions = [...draft.actions, { ...action, at: new Date().toISOString() }];
  const done = isDone({ ...draft, actions });
  return {
    actions,
    step: actions.length,
    status: done ? 'done' : 'drafting',
    turn_started_at: done ? null : new Date().toISOString(),
  };
}

// PATCH /api/drafts/[id]
// body: { op: 'join', side: 'A'|'B'|null } | { op: 'start' } | { op: 'pick', hero_id }
//     | { op: 'timeout' } | { op: 'cancel' }
export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();

  const { data: draft } = await admin.from('drafts').select('*').eq('id', String(id).toUpperCase()).maybeSingle();
  if (!draft) return fail('Sala no encontrada', 404);

  // El tiempo vencido lo puede reclamar cualquiera (hasta un espectador sin sesión):
  // solo se aplica si de verdad se acabó el tiempo del turno actual.
  if (body.op === 'timeout') {
    if (draft.status !== 'drafting' || !draft.timer_s || !draft.turn_started_at) return fail('No hay tiempo corriendo', 409);
    const deadline = new Date(draft.turn_started_at).getTime() + draft.timer_s * 1000;
    if (Date.now() < deadline) return fail('Todavía queda tiempo', 409);
    const pool = await getHeroPool(admin);
    const res = await commit(admin, draft, advance(draft, autoAction(draft, Math.random, pool)));
    return res.error ?? NextResponse.json({ draft: res.draft });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('Inicia sesión para participar', 401);
  const banned = await bannedResponse(supabase, user.id);
  if (banned) return banned;

  const { data: me } = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  const isAdmin   = !!me?.is_admin;
  const isCreator = draft.created_by === user.id;
  const mySide    = draft.captain_a === user.id ? 'A' : draft.captain_b === user.id ? 'B' : null;
  const linked    = !!(draft.scrim_id || draft.match_id);

  switch (body.op) {
    case 'join': {
      if (draft.status !== 'lobby') return fail('El draft ya empezó');
      if (linked) return fail('En este draft los capitanes ya están definidos');
      const side = body.side === 'A' || body.side === 'B' ? body.side : null;
      const patch = {};
      if (mySide) patch[mySide === 'A' ? 'captain_a' : 'captain_b'] = null;      // salir del lado actual
      if (side) {
        const taken = side === 'A' ? draft.captain_a : draft.captain_b;
        if (taken && taken !== user.id) return fail('Ese lado ya tiene capitán', 409);
        patch[side === 'A' ? 'captain_a' : 'captain_b'] = user.id;
      }
      // El lado tiene que seguir libre al guardar (dos personas pueden intentar a la vez)
      const col = side === 'A' ? 'captain_a' : 'captain_b';
      const res = await commit(admin, draft, patch, q => (side ? q.or(`${col}.is.null,${col}.eq.${user.id}`) : q));
      return res.error ?? NextResponse.json({ draft: res.draft });
    }

    case 'start': {
      if (draft.status !== 'lobby') return fail('El draft ya empezó');
      if (!isCreator && !isAdmin && !mySide) return fail('Solo quien creó la sala o un capitán puede empezar', 403);
      if (!draft.captain_a || !draft.captain_b) return fail('Faltan capitanes: cada lado necesita uno');
      const res = await commit(admin, draft, { status: 'drafting', turn_started_at: new Date().toISOString() });
      return res.error ?? NextResponse.json({ draft: res.draft });
    }

    case 'pick': {
      if (draft.status !== 'drafting') return fail('El draft no está en curso');
      const turn = currentTurn(draft);
      if (!turn) return fail('El draft ya terminó');
      if (mySide !== turn.side) return fail(mySide ? 'No es tu turno' : 'No eres capitán en esta sala', 403);
      let action;
      const pool = await getHeroPool(admin);
      try { action = makeAction(draft, mySide, body.hero_id, pool); }
      catch (e) { return fail(e.message); }
      const res = await commit(admin, draft, advance(draft, action));
      return res.error ?? NextResponse.json({ draft: res.draft });
    }

    case 'cancel': {
      if (draft.status === 'done' || draft.status === 'cancelled') return fail('La sala ya está cerrada');
      if (!isCreator && !isAdmin) return fail('Solo quien creó la sala puede cancelarla', 403);
      const res = await commit(admin, draft, { status: 'cancelled', turn_started_at: null });
      return res.error ?? NextResponse.json({ draft: res.draft });
    }

    default:
      return fail('Operación inválida');
  }
}
