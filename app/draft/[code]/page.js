import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DraftRoom from '@/components/DraftRoom';
import { getHeroPool } from '@/lib/heroPool';

const normalize = code => String(code ?? '').toUpperCase();
const validCode = code => /^[A-Z0-9]{6}$/.test(code);

export async function generateMetadata({ params }) {
  const code = normalize((await params).code);
  if (!validCode(code)) return { title: 'Draft — La Cantina' };
  const supabase = await createClient();
  const { data: d } = await supabase.from('drafts').select('name_a, name_b, format').eq('id', code).maybeSingle();
  if (!d) return { title: 'Draft — La Cantina' };
  const title       = `Draft ${d.name_a} vs ${d.name_b} — La Cantina`;
  const description = `Draft de picks y bans ${d.format} en vivo. Sala ${code}.`;
  return { title, description, openGraph: { title, description, images: ['/og.png'] } };
}

export default async function DraftRoomPage({ params }) {
  const code = normalize((await params).code);
  if (!validCode(code)) notFound();

  const supabase = await createClient();
  const [{ data: draft }, { data: { user } }] = await Promise.all([
    supabase.from('drafts').select('*').eq('id', code).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (!draft) notFound();

  const ids = [draft.captain_a, draft.captain_b].filter(Boolean);
  const [{ data: profiles }, { data: me }, pool] = await Promise.all([
    ids.length
      ? supabase.from('profiles').select('id, display_name, discord_username, avatar_url').in('id', ids)
      : Promise.resolve({ data: [] }),
    user
      ? supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    getHeroPool(supabase),
  ]);

  return (
    <main className="max-w-[1180px] mx-auto px-5 py-10 md:py-14">
      <DraftRoom
        initialDraft={draft}
        initialProfiles={profiles ?? []}
        viewerId={user?.id ?? null}
        isAdmin={!!me?.is_admin}
        pool={pool}
      />
    </main>
  );
}
