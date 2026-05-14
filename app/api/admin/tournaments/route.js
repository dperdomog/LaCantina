import { createClient } from '@/lib/supabase/server';
import { requireAdmin, slugify } from '@/lib/admin';
import { NextResponse } from 'next/server';

// POST /api/admin/tournaments — crear torneo
export async function POST(request) {
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const body = await request.json();
  const { name, format, date_display, time_display, status, max_slots, prize, region, featured, description, id } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
  }

  const slug = id?.trim() || slugify(name.trim());
  if (!slug) {
    return NextResponse.json({ error: 'No se pudo generar un ID válido' }, { status: 400 });
  }

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert({
      id:           slug,
      name:         name.trim(),
      format:       format       || '4v4',
      date_display: date_display || 'Por definir',
      time_display: time_display || 'Por definir',
      status:       status       || 'soon',
      max_slots:    max_slots    || 32,
      prize:        prize        || 'Por definir',
      region:       region       || 'LATAM',
      featured:     featured     ?? false,
      description:  description?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    const msg = error.code === '23505'
      ? 'Ya existe un torneo con ese ID. Cambiá el nombre o el ID.'
      : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ tournament }, { status: 201 });
}
