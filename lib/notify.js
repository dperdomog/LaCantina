import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Inserta una notificación para un usuario específico (server-side, bypass RLS).
 * @param {any} _supabase — ignorado, se usa admin client internamente
 * @param {{ user_id: string, type: string, title: string, body?: string, data?: object }} opts
 */
export async function notify(_supabase, { user_id, type, title, body, data }) {
  const admin = createAdminClient();
  await admin.from('notifications').insert({
    user_id,
    type,
    title,
    body:  body  ?? null,
    data:  data  ?? {},
  });
}

/**
 * Inserta notificaciones para múltiples usuarios de una vez (bypass RLS).
 */
export async function notifyMany(_supabase, user_ids, { type, title, body, data }) {
  if (!user_ids.length) return;
  const admin = createAdminClient();
  const rows = user_ids.map(uid => ({
    user_id: uid,
    type,
    title,
    body:  body ?? null,
    data:  data ?? {},
  }));
  await admin.from('notifications').insert(rows);
}
