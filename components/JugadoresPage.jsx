'use client';

import { useState, useMemo } from 'react';

const ROLE_COLORS = {
  Carry:     'text-yellow  border-yellow/40  bg-yellow/10',
  Flex:      'text-green   border-green/40   bg-green/10',
  Frontline: 'text-[#f97316] border-[#f97316]/40 bg-[#f97316]/10',
  Support:   'text-cyan    border-cyan/40    bg-cyan/10',
  Pick:      'text-[#a78bfa] border-[#a78bfa]/40 bg-[#a78bfa]/10',
  Roamer:    'text-pink    border-pink/40    bg-pink/10',
};

const ROLES = ['Carry', 'Flex', 'Frontline', 'Support', 'Pick', 'Roamer'];

function PlayerCard({ player, currentUserId, viewerTeamId }) {
  const teamName = player.team?.name ?? null;
  const isOwnProfile = player.id === currentUserId;

  return (
    <a
      href={`/jugador/${player.id}`}
      className="block bg-[#0d0f15] border border-[rgba(241,237,229,0.08)] rounded-[16px] p-5 no-underline hover:-translate-y-0.5 hover:border-[rgba(255,214,10,0.25)] transition-all duration-[200ms] group"
    >
      {/* Avatar + nombre */}
      <div className="flex items-center gap-3 mb-4">
        {player.avatar_url ? (
          <img
            src={player.avatar_url}
            alt={player.display_name ?? ''}
            className="w-11 h-11 rounded-full border border-[rgba(241,237,229,0.15)] group-hover:border-yellow/40 transition-colors shrink-0"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-yellow flex items-center justify-center font-display text-[18px] text-[#0a0a0a] shrink-0">
            {(player.display_name ?? player.discord_username ?? '?')[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-ink text-[14px] font-semibold leading-tight truncate group-hover:text-yellow transition-colors">
            {player.display_name ?? player.discord_username ?? 'Jugador'}
          </p>
          {player.discord_username && (
            <p className="mono-label text-[10px] truncate">@{player.discord_username}</p>
          )}
        </div>
        {isOwnProfile && (
          <span className="ml-auto mono-label text-[9px] text-yellow/60 shrink-0">TÚ</span>
        )}
      </div>

      {/* Team + rol */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {teamName ? (
          <span className="flex items-center gap-1.5 text-[12px] text-ink-dim font-medium">
            <span className="text-[14px]">🛡️</span>
            <span className="truncate max-w-[120px]">{teamName}</span>
          </span>
        ) : (
          <span className="pill border border-cyan/30 text-cyan bg-cyan/10 text-[10px] font-bold tracking-wide">
            F/A
          </span>
        )}

        {player.player_role && (
          <span className={`pill border text-[10px] font-semibold ${ROLE_COLORS[player.player_role] ?? 'text-ink-dim border-ink-dim/20'}`}>
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

  const filtered = useMemo(() => {
    return players.filter(p => {
      const name = `${p.display_name ?? ''} ${p.discord_username ?? ''}`.toLowerCase();
      if (search && !name.includes(search.toLowerCase())) return false;

      const hasTeam = !!p.team?.name;
      if (filterTeam === 'fa' && hasTeam) return false;
      if (filterTeam === 'team' && !hasTeam) return false;

      if (filterRole && p.player_role !== filterRole) return false;

      return true;
    });
  }, [players, search, filterRole, filterTeam]);

  const faCount   = players.filter(p => !p.team).length;
  const teamCount = players.filter(p => !!p.team).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <span className="mono-label text-yellow">// DIRECTORIO</span>
        <h1 className="font-display text-[clamp(48px,6vw,80px)] leading-[0.9] mt-3 text-ink">
          JUGADORES <span className="gradient-text">LATAM.</span>
        </h1>
        <p className="text-ink-dim text-[15px] mt-4 max-w-[520px]">
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
          className="bg-[#0d0f15] border border-[rgba(241,237,229,0.10)] rounded-full px-4 py-2 text-[13px] text-ink placeholder:text-ink-dim focus:outline-none focus:border-yellow/40 transition-colors w-full sm:w-[240px]"
        />

        {/* Status filter */}
        <div className="flex gap-1.5">
          {[
            ['all',  'Todos'],
            ['fa',   `Free Agents (${faCount})`],
            ['team', 'Con equipo'],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterTeam(val)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                filterTeam === val
                  ? 'bg-yellow text-[#0a0a0a]'
                  : 'border border-[rgba(241,237,229,0.10)] text-ink-dim hover:border-yellow/30 hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Rol filter */}
        <div className="flex gap-1.5 flex-wrap">
          {ROLES.map(role => {
            const active = filterRole === role;
            const color  = ROLE_COLORS[role] ?? '';
            return (
              <button
                key={role}
                onClick={() => setFilterRole(active ? '' : role)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                  active ? color : 'border-[rgba(241,237,229,0.08)] text-ink-dim hover:border-[rgba(241,237,229,0.20)]'
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
        <div className="text-center py-16">
          <p className="font-display text-[24px] text-ink-dim">Sin resultados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
