import { createClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/admin';
import { NextResponse } from 'next/server';
import { announce, COLORS } from '@/lib/discord';

// POST /api/teams — crear equipo
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Verificar que no esté ya en un equipo
  const { data: existing } = await supabase
    .from('team_members').select('id').eq('user_id', user.id).single();
  if (existing) return NextResponse.json({ error: 'Ya estás en un equipo' }, { status: 400 });

  const { name, region, logo_url, description, commitment } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });

  // Generar slug único
  const baseSlug = slugify(name.trim());
  const { count } = await supabase
    .from('teams').select('id', { count: 'exact', head: true }).like('slug', `${baseSlug}%`);
  const slug = count > 0 ? `${baseSlug}-${count + 1}` : baseSlug;

  // Crear el equipo
  const { data: team, error: teamErr } = await supabase
    .from('teams')
    .insert({
      name:        name.trim(),
      slug,
      captain_id:  user.id,
      region:      region      || null,
      logo_url:    logo_url    || null,
      description: description?.trim() || null,
      commitment:  commitment  || null,
    })
    .select().single();
  if (teamErr) return NextResponse.json({ error: teamErr.message }, { status: 500 });

  // Agregar al capitán como miembro
  await supabase.from('team_members').insert({ team_id: team.id, user_id: user.id });

  await announce({
    title:       `🛡️ Nuevo equipo: ${team.name}`,
    description: `${team.region ?? 'LATAM'}${team.commitment ? ` · ${team.commitment}` : ''} — ¿buscas equipo? Postula en la página.`,
    path:        `/equipos/${team.slug ?? team.id}`,
    color:       COLORS.cyan,
  });

  return NextResponse.json({ team });
}

const COMMITMENTS = ['Serio', 'Por diversión'];

// PATCH /api/teams — el capitán edita logo, descripción, región o compromiso.
// Solo se validan y actualizan los campos presentes en el body.
export async function PATCH(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const { team_id } = body;
  const updates = {};

  if ('logo_url' in body) {
    // Solo imágenes subidas a nuestro Storage
    const allowedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/team-logos/`;
    if (typeof body.logo_url !== 'string' || !body.logo_url.startsWith(allowedPrefix))
      return NextResponse.json({ error: 'URL de logo inválida' }, { status: 400 });
    updates.logo_url = body.logo_url;
  }

  if ('description' in body) {
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (description.length > 300)
      return NextResponse.json({ error: 'La descripción no puede superar los 300 caracteres' }, { status: 400 });
    updates.description = description || null;
  }

  if ('region' in body) {
    const region = typeof body.region === 'string' ? body.region.trim() : '';
    if (region.length > 40)
      return NextResponse.json({ error: 'Región inválida' }, { status: 400 });
    updates.region = region || null;
  }

  if ('commitment' in body) {
    if (body.commitment !== null && !COMMITMENTS.includes(body.commitment))
      return NextResponse.json({ error: 'Compromiso inválido' }, { status: 400 });
    updates.commitment = body.commitment;
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'No hay cambios para guardar' }, { status: 400 });

  const { data: team } = await supabase
    .from('teams').select('captain_id').eq('id', team_id).single();
  if (!team) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
  if (team.captain_id !== user.id)
    return NextResponse.json({ error: 'Solo el capitán puede editar el equipo' }, { status: 403 });

  const { error } = await supabase.from('teams').update(updates).eq('id', team_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, ...updates });
}
