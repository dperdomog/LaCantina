import { createClient } from '@/lib/supabase/server';
import { loadHomeData } from '@/lib/home';
import Landing from '@/components/home/Landing';

export default async function Home() {
  const supabase = await createClient();
  const data = await loadHomeData(supabase);
  return <Landing data={data} />;
}
