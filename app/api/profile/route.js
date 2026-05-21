import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const VALID_ROLES = ['Carry', 'Flex', 'Frontline', 'Support', 'Pick', 'Roamer'];

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { team_name, player_role, display_name } = await request.json();

  if (player_role && !VALID_ROLES.includes(player_role)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
  }

  if (display_name !== undefined && display_name !== null && display_name.length > 32) {
    return NextResponse.json({ error: 'El nombre no puede superar 32 caracteres' }, { status: 400 });
  }

  const updates = {
    team_name:   team_name?.trim() || null,
    player_role: player_role || null,
  };
  if (display_name !== undefined) updates.display_name = display_name;

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ team_name, player_role, display_name });
}
