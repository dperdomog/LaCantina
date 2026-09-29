import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isCountry } from '@/lib/countries';
import { bannedResponse } from '@/lib/moderation';

const VALID_ROLES = ['Carry', 'Flex', 'Frontline', 'Support', 'Pick', 'Roamer'];

// POST/PATCH /api/profile — actualizar campos del propio perfil
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const banned = await bannedResponse(supabase, user.id);
  if (banned) return banned;

  const { team_name, player_role, display_name, country, custom_banner_url } = await request.json();

  if (player_role && !VALID_ROLES.includes(player_role)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
  }

  if (display_name !== undefined && display_name !== null && display_name.length > 32) {
    return NextResponse.json({ error: 'El nombre no puede superar 32 caracteres' }, { status: 400 });
  }

  if (country && !isCountry(country)) {
    return NextResponse.json({ error: 'País inválido' }, { status: 400 });
  }

  // Solo imágenes subidas a nuestro Storage (carpeta banners/)
  const bannerPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/banners/`;
  if (custom_banner_url && (typeof custom_banner_url !== 'string' || !custom_banner_url.startsWith(bannerPrefix))) {
    return NextResponse.json({ error: 'URL de banner inválida' }, { status: 400 });
  }

  // Solo actualizar los campos que vienen explícitamente en el body
  const updates = {};
  if (team_name         !== undefined) updates.team_name         = team_name?.trim()  || null;
  if (player_role       !== undefined) updates.player_role       = player_role        || null;
  if (display_name      !== undefined) updates.display_name      = display_name       || null;
  if (country           !== undefined) updates.country           = country            || null;
  if (custom_banner_url !== undefined) updates.custom_banner_url = custom_banner_url  || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(updates);
}

export { POST as PATCH };
