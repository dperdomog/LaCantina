import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';
import { validateEvent } from './validate';

// POST /api/admin/events — crear evento del calendario
export async function POST(request) {
  const supabase = await createClient();
  const { error: authError } = await requireAdmin(supabase);
  if (authError) return authError;

  const { values, error } = validateEvent(await request.json());
  if (error) return NextResponse.json({ error }, { status: 400 });

  const { data: event, error: dbError } = await supabase
    .from('events').insert(values).select().single();
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ event }, { status: 201 });
}
