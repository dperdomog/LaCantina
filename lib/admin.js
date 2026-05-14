import { NextResponse } from 'next/server';

/**
 * Verifica que el usuario autenticado sea admin.
 * Usar en API routes:
 *   const { user, error } = await requireAdmin(supabase);
 *   if (error) return error;
 */
export async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }),
    };
  }

  return { user, error: null };
}

/**
 * Genera un slug URL-friendly a partir de un nombre.
 * Ej: "Street Brawl — S1" → "street-brawl-s1"
 */
export function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // quitar tildes
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
