import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// DELETE /api/lfg/[id] — borrar una publicación propia (o cualquiera, si es admin)
export async function DELETE(_, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: post } = await supabase.from('lfg_posts').select('author_id').eq('id', id).maybeSingle();
  if (!post) return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });

  if (post.author_id !== user.id) {
    const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!me?.is_admin) return NextResponse.json({ error: 'Solo puedes borrar tus publicaciones' }, { status: 403 });
  }

  const { error } = await supabase.from('lfg_posts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
