import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MapBoard from '@/components/MapBoard';

const normalize = code => String(code ?? '').toUpperCase();
const validCode = code => /^[A-Z0-9]{6}$/.test(code);

export async function generateMetadata({ params }) {
  const code = normalize((await params).code);
  if (!validCode(code)) return { title: 'Mapa de coaching — La Cantina' };
  const supabase = await createClient();
  const { data: b } = await supabase.from('boards').select('title').eq('id', code).maybeSingle();
  if (!b) return { title: 'Mapa de coaching — La Cantina' };
  const title       = `${b.title} — Mapa de coaching — La Cantina`;
  const description = 'Plan de juego dibujado sobre el mapa de Deadlock.';
  return { title, description, openGraph: { title, description, images: ['/og.png'] } };
}

export default async function MapaBoardPage({ params }) {
  const code = normalize((await params).code);
  if (!validCode(code)) notFound();

  const supabase = await createClient();
  const [{ data: board }, { data: { user } }] = await Promise.all([
    supabase.from('boards').select('*').eq('id', code).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (!board) notFound();

  const { data: owner } = await supabase
    .from('profiles').select('id, display_name, discord_username, avatar_url').eq('id', board.created_by).maybeSingle();

  return (
    <main className="max-w-[1180px] mx-auto px-5 py-10 md:py-14">
      <MapBoard initialBoard={board} viewerId={user?.id ?? null} owner={owner ?? null} />
    </main>
  );
}
