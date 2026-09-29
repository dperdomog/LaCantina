// Anuncios automáticos en el canal de Discord vía webhook (DISCORD_WEBHOOK_URL).
// Si no está configurado no hace nada; nunca lanza errores ni bloquea más de 3 s.
const SITE = 'https://lacantina.club';

export const COLORS = { yellow: 0xffd400, green: 0x00d97e, cyan: 0x00c8f0, orange: 0xff7043, red: 0xff2d2d };

export async function announce({ title, description, path, color = COLORS.yellow }) {
  const hook = process.env.DISCORD_WEBHOOK_URL;
  if (!hook) return;

  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    await fetch(hook, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal:  ctrl.signal,
      body: JSON.stringify({
        username:   'La Cantina',
        avatar_url: `${SITE}/icon.png`,
        embeds: [{ title, description, color, url: path ? `${SITE}${path}` : undefined }],
      }),
    });
  } catch {
    // Discord caído o lento: el anuncio no es crítico
  } finally {
    clearTimeout(timer);
  }
}
