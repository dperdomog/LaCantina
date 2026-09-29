import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { bannedResponse } from '@/lib/moderation';
import { LIMITS, sanitizeBoard } from '@/lib/board';
import { insertBoard } from '@/lib/boardServer';

const fail = (error, status = 400) => NextResponse.json({ error }, { status });

async function load(params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: fail('Inicia sesión', 401) };
  const banned = await bannedResponse(supabase, user.id);
  if (banned) return { error: banned };
  const admin = createAdminClient();
  const { data: board } = await admin.from('boards').select('*').eq('id', String(id).toUpperCase()).maybeSingle();
  if (!board) return { error: fail('Mapa no encontrado', 404) };
  return { user, admin, board };
}

// PATCH /api/boards/[id] — el dueño guarda título y/o dibujo. body: { title?, data? }
export async function PATCH(request, { params }) {
  const ctx = await load(params);
  if (ctx.error) return ctx.error;
  const { user, admin, board } = ctx;
  if (board.created_by !== user.id) return fail('Solo quien creó el mapa puede editarlo', 403);

  const body = await request.json().catch(() => ({}));
  const patch = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, LIMITS.title) : '';
    if (!title) return fail('El título no puede estar vacío');
    patch.title = title;
  }
  if (body.data !== undefined) {
    try { patch.data = sanitizeBoard(body.data); }
    catch (e) { return fail(e.message); }
  }

  const { data, error } = await admin.from('boards').update(patch).eq('id', board.id).select().single();
  if (error) return fail(error.message, 500);
  return NextResponse.json({ board: data });
}

// DELETE /api/boards/[id] — el dueño (o un admin) borra el mapa
export async function DELETE(_request, { params }) {
  const ctx = await load(params);
  if (ctx.error) return ctx.error;
  const { user, admin, board } = ctx;
  if (board.created_by !== user.id) {
    const { data: me } = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!me?.is_admin) return fail('Solo quien creó el mapa puede borrarlo', 403);
  }
  const { error } = await admin.from('boards').delete().eq('id', board.id);
  if (error) return fail(error.message, 500);
  return NextResponse.json({ ok: true });
}

// POST /api/boards/[id] — duplica el mapa para quien lo pide (para editar uno ajeno)
export async function POST(_request, { params }) {
  const ctx = await load(params);
  if (ctx.error) return ctx.error;
  const { user, admin, board } = ctx;
  let data;
  try { data = sanitizeBoard(board.data); }
  catch (e) { return fail(e.message); }
  const res = await insertBoard(admin, {
    created_by: user.id, title: `Copia de ${board.title}`.slice(0, LIMITS.title), draft_id: board.draft_id, data,
  });
  if (res.error) return fail(res.error, 500);
  return NextResponse.json({ board: res.board });
}
