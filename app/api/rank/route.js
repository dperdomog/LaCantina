import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function normalizeStatlockerUrl(raw) {
  const url = new URL(raw);
  if (!url.hostname.includes('statlocker.gg')) return null;
  const match = url.pathname.match(/\/profile\/(\d+)/);
  if (!match) return null;
  return `https://statlocker.gg/profile/${match[1]}`;
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { statlocker_url: raw } = await request.json();

  let statlocker_url;
  try {
    statlocker_url = normalizeStatlockerUrl(raw);
  } catch { statlocker_url = null; }

  if (!statlocker_url) {
    return NextResponse.json(
      { error: 'URL inválida. Debe ser del tipo https://statlocker.gg/profile/{steam_id}' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('profiles')
    .update({ statlocker_url })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ statlocker_url });
}
