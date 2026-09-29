import { createClient } from '@/lib/supabase/server';
import CalendarioView from '@/components/CalendarioView';

const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE ?? '#discord';

const title       = 'Calendario — La Cantina';
const description = 'Torneos y eventos de la comunidad de Deadlock en LATAM, en tu hora local.';

export const metadata = {
  title,
  description,
  openGraph: { title, description, images: ['/og.png'] },
};

const DAY = 24 * 3600e3;

export default async function CalendarioPage() {
  const supabase = await createClient();
  const now      = new Date();
  const since    = new Date(now.getTime() - 30 * DAY).toISOString();

  const [{ data: torneos }, { data: eventos }] = await Promise.all([
    supabase.from('tournaments')
      .select('id, name, description, starts_at, status, format, region')
      .not('starts_at', 'is', null)
      .gte('starts_at', since)
      .order('starts_at', { ascending: true }),
    supabase.from('events')
      .select('id, title, description, starts_at, url')
      .gte('starts_at', since)
      .order('starts_at', { ascending: true }),
  ]);

  const items = [
    ...(torneos ?? []).map(t => ({
      kind:        'torneo',
      id:          t.id,
      title:       t.name,
      description: t.description,
      starts_at:   t.starts_at,
      meta:        [t.format, t.region].filter(Boolean).join(' · '),
      href:        `/torneos/${t.id}`,
      external:    false,
      closed:      t.status === 'closed',
    })),
    ...(eventos ?? []).map(e => ({
      kind:        'evento',
      id:          e.id,
      title:       e.title,
      description: e.description,
      starts_at:   e.starts_at,
      meta:        null,
      href:        e.url || null,
      external:    !!e.url,
      closed:      false,
    })),
  ].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

  // Próximos: desde ahora (sin torneos cerrados). Pasados: últimos 30 días, del más reciente al más viejo.
  const upcoming = items.filter(i => new Date(i.starts_at) >= now && !i.closed);
  const past     = items.filter(i => new Date(i.starts_at) < now).reverse();

  return (
    <main className="max-w-[960px] mx-auto px-5 py-14 md:py-20">
      <div className="mb-12">
        <span className="mono-label">📅 Calendario</span>
        <h1 className="font-display text-[clamp(40px,6vw,68px)] leading-[1] tracking-[-0.02em] mt-2 text-ink">
          Lo que se viene en la{' '}
          <mark className="bg-yellow text-on-color px-3 rounded-2xl border-[3px] border-line inline-block -rotate-2">cantina</mark>
        </h1>
        <p className="text-[18px] text-ink-dim mt-4 max-w-[560px]">
          Torneos y eventos de la comunidad. Las horas se muestran en tu zona horaria.
        </p>
      </div>

      {upcoming.length === 0 && (
        <div className="sticker p-10 md:p-14 text-center mb-12">
          <span className="text-[48px] block">🗓️</span>
          <p className="font-display text-[clamp(26px,4vw,34px)] leading-tight text-ink mt-3">
            Todavía no hay nada agendado.
          </p>
          <p className="text-[16px] text-ink-dim mt-3 max-w-[440px] mx-auto">
            Los torneos y eventos se anuncian primero en Discord. Entra para enterarte apenas se agenden.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-7">
            <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="btn btn-discord">Entrar al Discord ↗</a>
            <a href="/torneos" className="btn btn-secondary">Ver torneos</a>
          </div>
        </div>
      )}

      <CalendarioView upcoming={upcoming} past={past} />
    </main>
  );
}
