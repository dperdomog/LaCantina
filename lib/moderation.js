import { NextResponse } from 'next/server';

export const BANNED_MESSAGE = 'Tu cuenta está bloqueada. Si crees que es un error, escríbenos por Discord.';

// Devuelve una respuesta 403 si el usuario está bloqueado; null si puede seguir.
// Si la consulta falla (p. ej. antes de la migración) no bloquea a nadie.
export async function bannedResponse(supabase, userId) {
  if (!userId) return null;
  const { data } = await supabase
    .from('profiles').select('banned_at').eq('id', userId).maybeSingle();
  if (data?.banned_at) return NextResponse.json({ error: BANNED_MESSAGE }, { status: 403 });
  return null;
}

export const REPORT_REASONS = {
  spam:         'Spam',
  ofensivo:     'Contenido ofensivo',
  suplantacion: 'Suplantación',
  trampas:      'Trampas',
  otro:         'Otro',
};
