/**
 * Inserta una notificación para un usuario específico (server-side).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ user_id: string, type: string, title: string, body?: string, data?: object }} opts
 */
export async function notify(supabase, { user_id, type, title, body, data }) {
  await supabase.from('notifications').insert({
    user_id,
    type,
    title,
    body:  body  ?? null,
    data:  data  ?? {},
  });
}

/**
 * Inserta notificaciones para múltiples usuarios de una vez.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string[]} user_ids
 * @param {{ type: string, title: string, body?: string, data?: object }} opts
 */
export async function notifyMany(supabase, user_ids, { type, title, body, data }) {
  if (!user_ids.length) return;
  const rows = user_ids.map(uid => ({
    user_id: uid,
    type,
    title,
    body:  body ?? null,
    data:  data ?? {},
  }));
  await supabase.from('notifications').insert(rows);
}
