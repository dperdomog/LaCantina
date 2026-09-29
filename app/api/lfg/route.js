import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { announce, COLORS } from '@/lib/discord';
import { rankInfo } from '@/lib/ranks';
import { isCountry, countryInfo } from '@/lib/countries';
import { bannedResponse } from '@/lib/moderation';

const VALID_ROLES = ['Carry', 'Flex', 'Frontline', 'Support', 'Pick', 'Roamer'];
const MAX_ACTIVE  = 3;          // publicaciones por persona en los últimos 14 días
const ACTIVE_MS   = 14 * 24 * 3600e3;

// POST /api/lfg — publicar en el tablón
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const banned = await bannedResponse(supabase, user.id);
  if (banned) return banned;

  const body     = await request.json();
  const kind     = body.kind;
  const roles    = Array.isArray(body.roles) ? [...new Set(body.roles)] : [];
  const country  = body.country || null;
  const schedule = body.schedule?.trim() || null;
  const message  = body.message?.trim() ?? '';
  const rankMin  = body.rank_min ? Number(body.rank_min) : null;

  if (!['player', 'team'].includes(kind))
    return NextResponse.json({ error: 'Tipo de publicación inválido' }, { status: 400 });
  if (roles.some(r => !VALID_ROLES.includes(r)))
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
  if (country && !isCountry(country))
    return NextResponse.json({ error: 'País inválido' }, { status: 400 });
  if (schedule && schedule.length > 120)
    return NextResponse.json({ error: 'El horario no puede superar 120 caracteres' }, { status: 400 });
  if (message.length < 1 || message.length > 500)
    return NextResponse.json({ error: 'El mensaje debe tener entre 1 y 500 caracteres' }, { status: 400 });
  if (rankMin !== null && !(Number.isInteger(rankMin) && rankMin >= 11 && rankMin <= 116))
    return NextResponse.json({ error: 'Rango inválido' }, { status: 400 });

  // Publicar como equipo: solo el capitán
  let team = null;
  if (kind === 'team') {
    const { data } = await supabase.from('teams').select('id, name').eq('captain_id', user.id).maybeSingle();
    if (!data) return NextResponse.json({ error: 'Solo los capitanes pueden publicar como equipo' }, { status: 403 });
    team = data;
  }

  // Límite anti-spam
  const since = new Date(Date.now() - ACTIVE_MS).toISOString();
  const { count } = await supabase
    .from('lfg_posts').select('id', { count: 'exact', head: true })
    .eq('author_id', user.id).gte('created_at', since);
  if ((count ?? 0) >= MAX_ACTIVE)
    return NextResponse.json({ error: `Ya tienes ${MAX_ACTIVE} publicaciones activas. Borra una para publicar otra.` }, { status: 429 });

  const { data: post, error } = await supabase.from('lfg_posts').insert({
    author_id: user.id,
    team_id:   team?.id ?? null,
    kind,
    roles,
    rank_min:  kind === 'team' ? rankMin : null,
    country,
    schedule,
    message,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Anuncio en Discord
  const { data: author } = await supabase
    .from('profiles').select('display_name, discord_username, rank_badge').eq('id', user.id).single();
  const who     = author?.display_name ?? author?.discord_username ?? 'Alguien';
  const place   = countryInfo(country);
  const details = [
    roles.length ? `Roles: ${roles.join(', ')}` : null,
    kind === 'team' && rankMin ? `Rango: ${rankInfo(rankMin).tierName}+` : null,
    kind === 'player' && author?.rank_badge > 0 ? `Rango: ${rankInfo(author.rank_badge).name}` : null,
    place ? `${place.flag} ${place.name}` : null,
    schedule ? `Horario: ${schedule}` : null,
  ].filter(Boolean).join(' · ');
  await announce({
    title:       kind === 'team' ? `🛡️ ${team.name} busca jugadores` : `🙋 ${who} busca equipo`,
    description: `${details ? `${details}\n` : ''}${message.length > 200 ? `${message.slice(0, 200)}…` : message}`,
    path:        '/tablon',
    color:       COLORS.orange,
  });

  return NextResponse.json({ post });
}
