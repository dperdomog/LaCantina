import { createClient } from '@/lib/supabase/server';
import EventosAdmin from '@/components/admin/EventosAdmin';

export const metadata = { title: 'Eventos — Admin' };

export default async function AdminEventosPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from('events')
    .select('id, title, description, starts_at, url')
    .order('starts_at', { ascending: false });

  return <EventosAdmin events={events ?? []} />;
}
