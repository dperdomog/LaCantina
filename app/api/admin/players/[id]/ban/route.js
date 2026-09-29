import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { notify } from '@/lib/notify';
import { NextResponse } from 'next/server';

// POST /api/admin/players/[id]/ban — bloquear jugador
// body: { reason?: string, delete_posts?: boolean }
export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  if (id === user.id) return NextResponse.json({ error: 'No puedes bloquearte a ti mismo' }, { status: 400 });

  const { data: target } = await supabase
    .from('profiles').select('id, is_admin').eq('id', id).maybeSingle();
  if (!target) return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 });
  if (target.is_admin) return NextResponse.json({ error: 'No se puede bloquear a un admin' }, { status: 400 });

  const { reason, delete_posts } = await request.json().catch(() => ({}));
  const cleanReason = typeof reason === 'string' ? reason.trim().slice(0, 200) : '';

  const { error } = await supabase
    .from('profiles')
    .update({ banned_at: new Date().toISOString(), ban_reason: cleanReason || null })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let deletedPosts = 0;
  if (delete_posts) {
    const { data: removed } = await supabase
      .from('lfg_posts').delete().eq('author_id', id).select('id');
    deletedPosts = removed?.length ?? 0;
  }

  await notify(supabase, {
    user_id: id,
    type:    'account_banned',
    title:   '🚫 Tu cuenta fue bloqueada',
    body:    `${cleanReason ? `Motivo: ${cleanReason}. ` : ''}Si crees que es un error, escríbenos por Discord.`,
    data:    {},
  });

  return NextResponse.json({ ok: true, deleted_posts: deletedPosts });
}

// DELETE /api/admin/players/[id]/ban — desbloquear jugador
export async function DELETE(_, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { error } = await supabase
    .from('profiles')
    .update({ banned_at: null, ban_reason: null })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await notify(supabase, {
    user_id: id,
    type:    'account_unbanned',
    title:   '✅ Tu cuenta fue desbloqueada',
    body:    'Ya puedes volver a publicar y participar en la comunidad.',
    data:    {},
  });

  return NextResponse.json({ ok: true });
}
