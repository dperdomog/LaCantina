import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { bannedResponse } from '@/lib/moderation';
import { notifyMany } from '@/lib/notify';
import { FORMATS, TIMERS, MAX_BANS, roomCode } from '@/lib/draft';

const DAILY_LIMIT = 20;
const cleanName = (s, fallback) => (typeof s === 'string' && s.trim() ? s.trim().slice(0, 40) : fallback);

// Equipos y capitanes de un scrim aceptado
async function fromScrim(admin, scrimId, userId) {
  const { data: scrim } = await admin.from('scrims')
    .select('id, status, from_team, to_team').eq('id', scrimId).maybeSingle();
  if (!scrim) return { error: 'Scrim no encontrado' };
  if (scrim.status !== 'accepted') return { error: 'El scrim todavía no fue aceptado' };
  const { data: teams } = await admin.from('teams')
    .select('id, name, captain_id').in('id', [scrim.from_team, scrim.to_team]);
  const a = teams?.find(t => t.id === scrim.from_team);
  const b = teams?.find(t => t.id === scrim.to_team);
  if (!a || !b) return { error: 'Equipo no encontrado' };
  if (userId !== a.captain_id && userId !== b.captain_id) return { error: 'Solo los capitanes del scrim pueden crear el draft', status: 403 };
  return { a, b, link: { scrim_id: scrim.id } };
}

// Equipos y capitanes de una partida de torneo con los dos lados definidos
async function fromMatch(admin, matchId, userId, isAdmin) {
  const { data: match } = await admin.from('matches')
    .select('id, reg_a, reg_b, status').eq('id', matchId).maybeSingle();
  if (!match) return { error: 'Partida no encontrada' };
  if (!match.reg_a || !match.reg_b) return { error: 'La partida todavía no tiene los dos equipos' };
  if (match.status === 'done') return { error: 'La partida ya terminó' };
  const { data: regs } = await admin.from('registrations')
    .select('id, team_id, team_name, captain_nick, user_id').in('id', [match.reg_a, match.reg_b]);
  const teamIds = (regs ?? []).map(r => r.team_id).filter(Boolean);
  const { data: teams } = teamIds.length
    ? await admin.from('teams').select('id, name, captain_id').in('id', teamIds)
    : { data: [] };
  const side = regId => {
    const r = regs?.find(x => x.id === regId);
    const t = teams?.find(x => x.id === r?.team_id);
    return { id: t?.id ?? null, name: t?.name ?? r?.team_name ?? r?.captain_nick ?? 'Equipo', captain_id: t?.captain_id ?? r?.user_id ?? null };
  };
  const a = side(match.reg_a);
  const b = side(match.reg_b);
  if (!isAdmin && userId !== a.captain_id && userId !== b.captain_id)
    return { error: 'Solo los capitanes de la partida pueden crear el draft', status: 403 };
  return { a, b, link: { match_id: match.id } };
}

// POST /api/drafts — crea una sala de draft
// body: { format, bans_per_team, timer_s, name_a?, name_b?, side?, scrim_id?, match_id? }
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Inicia sesión para crear un draft' }, { status: 401 });
  const banned = await bannedResponse(supabase, user.id);
  if (banned) return banned;

  const body = await request.json().catch(() => ({}));
  const format = body.format;
  const bans   = Number(body.bans_per_team ?? 0);
  const timer  = Number(body.timer_s ?? 0);
  if (!FORMATS[format]) return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
  if (!Number.isInteger(bans) || bans < 0 || bans > MAX_BANS) return NextResponse.json({ error: 'Cantidad de bans inválida' }, { status: 400 });
  if (!TIMERS.includes(timer)) return NextResponse.json({ error: 'Tiempo por turno inválido' }, { status: 400 });

  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const { count } = await admin.from('drafts')
    .select('id', { count: 'exact', head: true }).eq('created_by', user.id).gte('created_at', since);
  if ((count ?? 0) >= DAILY_LIMIT)
    return NextResponse.json({ error: `Puedes crear hasta ${DAILY_LIMIT} drafts por día` }, { status: 429 });

  const row = {
    created_by: user.id, format, bans_per_team: bans, timer_s: timer,
    name_a: cleanName(body.name_a, 'Equipo A'), name_b: cleanName(body.name_b, 'Equipo B'),
  };

  // Draft vinculado a un scrim o a una partida: equipos y capitanes fijos
  let linked = null;
  if (body.scrim_id || body.match_id) {
    const { data: me } = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    linked = body.scrim_id
      ? await fromScrim(admin, body.scrim_id, user.id)
      : await fromMatch(admin, body.match_id, user.id, !!me?.is_admin);
    if (linked.error) return NextResponse.json({ error: linked.error }, { status: linked.status ?? 400 });

    // Si ya hay un draft activo para ese scrim o partida, usar ese
    const [col, val] = Object.entries(linked.link)[0];
    const { data: existing } = await admin.from('drafts')
      .select('*').eq(col, val).in('status', ['lobby', 'drafting'])
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (existing) return NextResponse.json({ draft: existing, existing: true });

    Object.assign(row, linked.link, {
      name_a: linked.a.name.slice(0, 40), name_b: linked.b.name.slice(0, 40),
      team_a: linked.a.id, team_b: linked.b.id,
      captain_a: linked.a.captain_id, captain_b: linked.b.captain_id,
    });
    if (row.captain_a && row.captain_a === row.captain_b) row.captain_b = null;
  } else if (body.side === 'A' || body.side === 'B') {
    row[body.side === 'A' ? 'captain_a' : 'captain_b'] = user.id;
  }

  // Código único (reintenta si ya existe)
  let draft = null;
  for (let i = 0; i < 5 && !draft; i++) {
    const { data, error } = await admin.from('drafts').insert({ ...row, id: roomCode() }).select().single();
    if (!error) draft = data;
    else if (error.code !== '23505') return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!draft) return NextResponse.json({ error: 'No se pudo crear la sala, intenta de nuevo' }, { status: 500 });

  // Avisar a los capitanes (menos a quien lo creó) si el draft está vinculado
  if (linked) {
    const others = [draft.captain_a, draft.captain_b].filter(id => id && id !== user.id);
    await notifyMany(null, others, {
      type:  'draft_invite',
      title: `🎯 Draft listo: ${draft.name_a} vs ${draft.name_b}`,
      body:  `Entra a la sala ${draft.id} para hacer los picks y bans.`,
      data:  { draft_id: draft.id },
    });
  }

  return NextResponse.json({ draft });
}
