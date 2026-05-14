import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

  // Crear el equipo
  const { data: team, error: teamErr } = await supabase
    .from('teams')
    .insert({
      name:        name.trim(),
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

  return NextResponse.json({ team });
}
