import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notify } from '@/lib/notify';
import { NextResponse } from 'next/server';
import { bannedResponse } from '@/lib/moderation';

// POST /api/teams/transfer — el capitán pasa la capitanía a otro miembro
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const banned = await bannedResponse(supabase, user.id);
  if (banned) return banned;

  const { team_id, new_captain_id } = await request.json();
  if (!team_id || !new_captain_id)
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  if (new_captain_id === user.id)
    return NextResponse.json({ error: 'Ya eres el capitán' }, { status: 400 });

  const { data: team } = await supabase
    .from('teams').select('name, slug, captain_id').eq('id', team_id).single();
  if (!team) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
  if (team.captain_id !== user.id)
    return NextResponse.json({ error: 'Solo el capitán puede pasar la capitanía' }, { status: 403 });

  const { data: member } = await supabase
    .from('team_members').select('user_id')
    .eq('team_id', team_id).eq('user_id', new_captain_id).maybeSingle();
  if (!member) return NextResponse.json({ error: 'El nuevo capitán tiene que ser miembro del equipo' }, { status: 400 });

  // Admin client: la policy de RLS del capitán no permite cambiar captain_id a otra persona
  const admin = createAdminClient();
  const { error } = await admin.from('teams')
    .update({ captain_id: new_captain_id })
    .eq('id', team_id).eq('captain_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await notify(supabase, {
    user_id: new_captain_id,
    type:    'team_captain',
    title:   `⚡ Ahora eres el capitán de ${team.name}`,
    body:    'El capitán anterior te pasó la capitanía. Ya puedes gestionar el equipo.',
    data:    { team_id },
  });

  return NextResponse.json({ ok: true });
}
