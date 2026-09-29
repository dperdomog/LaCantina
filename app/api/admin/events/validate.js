// Valida los campos de un evento. Con partial=true solo revisa los presentes (PATCH).
// Devuelve { values } listo para guardar, o { error } con el mensaje.
export function validateEvent(body, { partial = false } = {}) {
  const values = {};

  if (!partial || body.title !== undefined) {
    const title = String(body.title ?? '').trim();
    if (!title) return { error: 'El título es requerido' };
    if (title.length > 120) return { error: 'El título no puede tener más de 120 caracteres' };
    values.title = title;
  }

  if (!partial || body.starts_at !== undefined) {
    const d = new Date(body.starts_at);
    if (!body.starts_at || Number.isNaN(d.getTime())) return { error: 'La fecha y hora no son válidas' };
    values.starts_at = d.toISOString();
  }

  if (body.description !== undefined) {
    const description = String(body.description ?? '').trim();
    if (description.length > 1000) return { error: 'La descripción no puede tener más de 1000 caracteres' };
    values.description = description || null;
  }

  if (body.url !== undefined) {
    const url = String(body.url ?? '').trim();
    if (url) {
      let parsed;
      try { parsed = new URL(url); } catch { return { error: 'El enlace no es una URL válida' }; }
      if (!['http:', 'https:'].includes(parsed.protocol)) return { error: 'El enlace debe empezar con http:// o https://' };
    }
    values.url = url || null;
  }

  return { values };
}
