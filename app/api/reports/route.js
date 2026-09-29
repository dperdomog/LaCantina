import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyMany } from '@/lib/notify';
import { bannedResponse, REPORT_REASONS } from '@/lib/moderation';
import { NextResponse } from 'next/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAILY_LIMIT = 10;

// POST /api/reports — reportar una publicación del tablón o un perfil
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const banned = await bannedResponse(supabase, user.id);
  if (banned) return banned;

  const { target_type, target_id, reason, details } = await request.json();

  if (!['post', 'profile'].includes(target_type) || !UUID_RE.test(target_id ?? ''))
    return NextResponse.json({ error: 'Reporte inválido' }, { status: 400 });
  if (!REPORT_REASONS[reason])
    return NextResponse.json({ error: 'Elige un motivo' }, { status: 400 });
  const cleanDetails = typeof details === 'string' ? details.trim().slice(0, 300) : '';

  // Construir la copia de lo reportado (y validar que existe)
  let snapshot;
  if (target_type === 'post') {
    const { data: post } = await supabase
      .from('lfg_posts')
      .select('id, message, kind, author_id, author:profiles!lfg_posts_author_id_fkey(display_name, discord_username)')
      .eq('id', target_id)
      .maybeSingle();
    if (!post) return NextResponse.json({ error: 'La publicación ya no existe' }, { status: 404 });
    if (post.author_id === user.id)
      return NextResponse.json({ error: 'No puedes reportar tu propia publicación' }, { status: 400 });
    snapshot = {
      message:     post.message,
      kind:        post.kind,
      author_id:   post.author_id,
      author_name: post.author?.display_name ?? post.author?.discord_username ?? null,
    };
  } else {
    if (target_id === user.id)
      return NextResponse.json({ error: 'No puedes reportarte a ti mismo' }, { status: 400 });
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name, discord_username, avatar_url, custom_banner_url, banner_url')
      .eq('id', target_id)
      .maybeSingle();
    if (!profile) return NextResponse.json({ error: 'El jugador no existe' }, { status: 404 });
    snapshot = {
      display_name:     profile.display_name,
      discord_username: profile.discord_username,
      avatar_url:       profile.avatar_url,
      banner:           profile.custom_banner_url ?? profile.banner_url ?? null,
    };
  }

  // Límite diario por persona
  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const { count } = await supabase
    .from('reports').select('id', { count: 'exact', head: true })
    .eq('reporter_id', user.id).gte('created_at', since);
  if ((count ?? 0) >= DAILY_LIMIT)
    return NextResponse.json({ error: 'Llegaste al límite de reportes por hoy. Intenta mañana.' }, { status: 429 });

  const { data: report, error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_type,
    target_id,
    reason,
    details:     cleanDetails || null,
    snapshot,
  }).select('id').single();

  if (error?.code === '23505') return NextResponse.json({ error: 'Ya reportaste esto.' }, { status: 400 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Avisar a los admins (nunca al canal público de Discord)
  const admin = createAdminClient();
  const { data: admins } = await admin.from('profiles').select('id').eq('is_admin', true);
  await notifyMany(supabase, (admins ?? []).map(a => a.id), {
    type:  'report_new',
    title: '🚩 Nuevo reporte',
    body:  `${REPORT_REASONS[reason]} — ${target_type === 'post' ? 'publicación del tablón' : 'perfil de jugador'}. Revísalo en Admin → Reportes.`,
    data:  { report_id: report.id },
  });

  return NextResponse.json({ ok: true });
}
