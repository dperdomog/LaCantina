import { createClient } from '@/lib/supabase/server';
import MapList from '@/components/MapList';

const description = 'Dibuja jugadas sobre el mapa nuevo de Deadlock (líneas, flechas, héroes y notas) y compártelas con tu equipo en vivo.';
export const metadata = {
  title: 'Mapa de coaching — La Cantina',
  description,
  openGraph: { title: 'Mapa de coaching — La Cantina', description, images: ['/og.png'] },
};

export default async function MapaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let boards = [];
  if (user) {
    const { data } = await supabase
      .from('boards')
      .select('id, title, draft_id, updated_at')
      .eq('created_by', user.id)
      .order('updated_at', { ascending: false })
      .limit(30);
    boards = data ?? [];
  }

  return (
    <main className="max-w-[1180px] mx-auto px-5 py-14 md:py-20">
      <MapList isLoggedIn={!!user} boards={boards} />
    </main>
  );
}
