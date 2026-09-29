import { createClient } from '@/lib/supabase/server';
import DraftCreate from '@/components/DraftCreate';

const description = 'Draft de picks y bans en tiempo real para scrims y torneos de Deadlock: 6v6, 4v4 o 2v2, con bans y tiempo por turno.';
export const metadata = {
  title: 'Draft de picks y bans — La Cantina',
  description,
  openGraph: { title: 'Draft de picks y bans — La Cantina', description, images: ['/og.png'] },
};

export default async function DraftPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Drafts donde el usuario creó la sala o es capitán
  let recent = [];
  if (user) {
    const { data } = await supabase
      .from('drafts')
      .select('id, name_a, name_b, format, status, created_at')
      .or(`created_by.eq.${user.id},captain_a.eq.${user.id},captain_b.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(10);
    recent = data ?? [];
  }

  return (
    <main className="max-w-[1180px] mx-auto px-5 py-14 md:py-20">
      <DraftCreate isLoggedIn={!!user} recent={recent} />
    </main>
  );
}
