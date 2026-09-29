import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { bannedResponse } from '@/lib/moderation';
import { insertBoard } from '@/lib/boardServer';
import { DEFAULT_LAYERS, LIMITS, tokensFromDraft } from '@/lib/board';

const DAILY_LIMIT = 30;

// POST /api/boards — crea un mapa de coaching
// body: { title?, draft_id? } — con draft_id (terminado) arranca con los 12 picks como fichas
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Inicia sesión para crear un mapa' }, { status: 401 });
  const banned = await bannedResponse(supabase, user.id);
  if (banned) return banned;

  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();

  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const { count } = await admin.from('boards')
    .select('id', { count: 'exact', head: true }).eq('created_by', user.id).gte('created_at', since);
  if ((count ?? 0) >= DAILY_LIMIT)
    return NextResponse.json({ error: `Puedes crear hasta ${DAILY_LIMIT} mapas por día` }, { status: 429 });

  let title = typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, LIMITS.title) : 'Plan sin título';
  let elements = [];
  let draftId = null;

  if (body.draft_id) {
    const { data: draft } = await admin.from('drafts')
      .select('id, name_a, name_b, status, actions').eq('id', String(body.draft_id).toUpperCase()).maybeSingle();
    if (!draft) return NextResponse.json({ error: 'Draft no encontrado' }, { status: 404 });
    if (draft.status !== 'done') return NextResponse.json({ error: 'El draft todavía no terminó' }, { status: 400 });
    elements = tokensFromDraft(draft);
    title = `${draft.name_a} vs ${draft.name_b}`.slice(0, LIMITS.title);
    draftId = draft.id;
  }

  const res = await insertBoard(admin, {
    created_by: user.id, title, draft_id: draftId,
    data: { elements, layers: DEFAULT_LAYERS },
  });
  if (res.error) return NextResponse.json({ error: res.error }, { status: 500 });
  return NextResponse.json({ board: res.board });
}
