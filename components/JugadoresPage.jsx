'use client';

import { useState, useMemo } from 'react';
import RankBadge from '@/components/RankBadge';
import { RANK_OPTIONS } from '@/lib/ranks';
import { COUNTRIES, countryInfo } from '@/lib/countries';

const ROLE_COLORS = {
  Carry:     'bg-yellow',
  Flex:      'bg-green',
  Frontline: 'bg-[#f97316]',
  Support:   'bg-cyan',
  Pick:      'bg-[#a78bfa]',
  Roamer:    'bg-pink',
};

const ROLES = ['Carry', 'Flex', 'Frontline', 'Support', 'Pick', 'Roamer'];

function PlayerCard({ player, currentUserId, viewerTeamId }) {
  const teamName = player.team?.name ?? null;
  const isOwnProfile = player.id === currentUserId;
  const country = countryInfo(player.country);

  return (
    <a
      href={`/jugador/${player.id}`}
      className="sticker block p-5 no-underline text-ink hover:-translate-y-1 transition-transform duration-[200ms] group"
    >
      {/* Avatar + nombre */}
      <div className="flex items-center gap-3 mb-4">
        {player.avatar_url ? (
          <img
            src={player.avatar_url}
            alt={player.display_name ?? ''}
            className="w-12 h-12 rounded-full border-[3px] border-line object-cover shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full border-[3px] border-line bg-yellow flex items-center justify-center font-display text-[18px] text-on-color shrink-0">
            {(player.display_name ?? player.discord_username ?? '?')[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-display text-ink text-[18px] leading-tight truncate group-hover:underline">
            {player.display_name ?? player.discord_username ?? 'Jugador'}
          </p>
          {(player.discord_username || country) && (
            <p className="text-[13px] text-ink-dim truncate">
              {country && <span title={country.name}>{country.flag} </span>}
              {player.discord_username ? `@${player.discord_username}` : country.name}
            </p>
          )}
        </div>
        {isOwnProfile && (
          <span className="ml-auto pill bg-yellow text-on-color shrink-0">Tú</span>
        )}
      </div>

      {player.rank_badge > 0 && <div className="mb-3"><RankBadge badge={player.rank_badge} /></div>}

      {/* Team + rol */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {teamName ? (
          <span className="flex items-center gap-1.5 text-[13px] text-ink-dim font-bold">
            <span className="text-[14px]">🛡️</span>
            <span className="truncate max-w-[120px]">{teamName}</span>
          </span>
        ) : (
          <span className="pill bg-cyan text-on-color">
            Free agent
          </span>
        )}

        {player.player_role && (
          <span className={`pill text-on-color ${ROLE_COLORS[player.player_role] ?? 'bg-surface-2'}`}>
            {player.player_role}
          </span>
        )}
      </div>
    </a>
  );
}

export default function JugadoresPage({ players, currentUserId, viewerTeamId }) {
  const [search,     setSearch]     = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterTeam, setFilterTeam] = useState('all'); // all | fa | team
  const [minRank,    setMinRank]    = useState(0);
  const [country,    setCountry]    = useState('');

  const filtered = useMemo(() => {
    return players.filter(p => {
      const name = `${p.display_name ?? ''} ${p.discord_username ?? ''}`.toLowerCase();
      if (search && !name.includes(search.toLowerCase())) return false;

      const hasTeam = !!p.team?.name;
      if (filterTeam === 'fa' && hasTeam) return false;
      if (filterTeam === 'team' && !hasTeam) return false;

      if (filterRole && p.player_role !== filterRole) return false;
      if (minRank && !((p.rank_badge ?? 0) >= minRank)) return false;
      if (country && p.country !== country) return false;

      return true;
    });
  }, [players, search, filterRole, filterTeam, minRank, country]);

  const faCount   = players.filter(p => !p.team).length;
  const teamCount = players.filter(p => !!p.team).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <span className="mono-label">👋 Directorio</span>
        <h1 className="font-display text-[clamp(40px,6vw,68px)] leading-[1] tracking-[-0.02em] mt-2 text-ink">
          Jugadores{' '}
          <mark className="bg-yellow text-on-color px-3 rounded-2xl border-[3px] border-line inline-block -rotate-2">LATAM</mark>
        </h1>
        <p className="text-[18px] text-ink-dim mt-4 max-w-[560px]">
          {players.length} jugadores registrados · {faCount} Free Agent{faCount !== 1 ? 's' : ''} · {teamCount} en equipo
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-8 items-center">
        {/* Búsqueda */}
        <input
          type="text"
          placeholder="Buscar jugador…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="field !rounded-full !py-2.5 w-full sm:w-[260px]"
        />

        {/* Status filter */}
        <div className="flex gap-2 flex-wrap">
          {[
            ['all',  'Todos'],
            ['fa',   `Free Agents (${faCount})`],
            ['team', 'Con equipo'],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterTeam(val)}
              className={`pill !py-2 transition-transform hover:-translate-y-0.5 ${
                filterTeam === val ? 'bg-ink text-bg' : 'bg-surface text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Rango y país */}
        <div className="flex gap-2 flex-wrap">
          <select value={minRank} onChange={e => setMinRank(Number(e.target.value))}
            aria-label="Rango mínimo" className="field !rounded-full !py-2 !w-auto text-[14px]">
            <option value={0}>Cualquier rango</option>
            {RANK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={country} onChange={e => setCountry(e.target.value)}
            aria-label="País" className="field !rounded-full !py-2 !w-auto text-[14px]">
            <option value="">Todos los países</option>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
          </select>
        </div>

        {/* Rol filter */}
        <div className="flex gap-2 flex-wrap">
          {ROLES.map(role => {
            const active = filterRole === role;
            const color  = ROLE_COLORS[role] ?? '';
            return (
              <button
                key={role}
                onClick={() => setFilterRole(active ? '' : role)}
                className={`pill !py-2 transition-transform hover:-translate-y-0.5 ${
                  active ? `${color} text-on-color` : 'bg-surface text-ink-dim'
                }`}
              >
                {role}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="sticker p-10 text-center">
          <p className="font-display text-[26px]">Nadie por aquí con esos filtros.</p>
          <p className="text-ink-dim mt-2">Prueba con otro nombre o quita algún filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(p => (
            <PlayerCard
              key={p.id}
              player={p}
              currentUserId={currentUserId}
              viewerTeamId={viewerTeamId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
