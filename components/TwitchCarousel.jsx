'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

function formatViewers(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

export default function TwitchCarousel() {
  const [streamers, setStreamers] = useState([]);
  const [current,   setCurrent]   = useState(0);
  const [loading,   setLoading]   = useState(true);
  const hostname    = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const intervalRef = useRef(null);

  useEffect(() => {
    fetch('/api/streams')
      .then(r => r.json())
      .then(data => setStreamers(data.streamers ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamers.length <= 1) return;
    intervalRef.current = setInterval(
      () => setCurrent(c => (c + 1) % streamers.length),
      12000,
    );
  }, [streamers.length]);

  useEffect(() => {
    startInterval();
    return () => clearInterval(intervalRef.current);
  }, [startInterval]);

  function goTo(i) {
    setCurrent(i);
    startInterval();
  }

  const s = streamers[current];
  const liveCount = streamers.filter(x => x.live).length;

  return (
    <div className="animate-fade-up-2 flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#9147ff">
            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
          </svg>
          <span className="mono-label text-[11px]">STREAMERS LATAM</span>
        </div>
        {liveCount > 0 && (
          <span className="flex items-center gap-1.5 text-[#e91916] mono-label text-[10px] font-bold">
            <span className="w-1.5 h-1.5 bg-[#e91916] rounded-full animate-pulse" />
            {liveCount} EN VIVO
          </span>
        )}
      </div>

      {/* Player principal */}
      <div className="rounded-[12px] overflow-hidden aspect-video w-full bg-[#18181b] relative">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#9147ff]/30 border-t-[#9147ff] rounded-full animate-spin" />
          </div>
        ) : !s ? null : (
          /* ── Siempre embed de Twitch — maneja en vivo y offline solo ── */
          <iframe
            key={s.username}
            src={`https://player.twitch.tv/?channel=${s.username}&parent=${hostname}&autoplay=true`}
            className="w-full h-full border-0"
            allowFullScreen
            allow="autoplay; fullscreen"
          />
        )}
      </div>

      {/* Info del streamer activo (solo cuando live) */}
      {s?.live && (
        <div className="flex items-center gap-2.5 px-1">
          {s.avatar && (
            <img src={s.avatar} alt={s.username} className="w-8 h-8 rounded-full border border-[rgba(145,71,255,0.4)] shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-[13px] truncate">{s.username}</p>
            <p className="text-white/50 text-[11px] truncate">{s.title || 'Deadlock'}{s.game ? ` · ${s.game}` : ''}</p>
          </div>
          <span className="mono-label text-green text-[10px] shrink-0">{formatViewers(s.viewers)} viewers</span>
        </div>
      )}

      {/* Miniaturas para cambiar de streamer */}
      {streamers.length > 1 && (
        <div className="flex gap-2">
          {streamers.map((st, i) => (
            <button
              key={st.username}
              onClick={() => goTo(i)}
              title={st.username}
              className={`relative rounded-[6px] overflow-hidden flex-1 aspect-video cursor-pointer border-0 p-0 transition-all duration-200 ${
                i === current
                  ? 'ring-2 ring-[#9147ff]'
                  : 'opacity-50 hover:opacity-80'
              }`}
            >
              {/* Thumbnail o imagen offline o avatar */}
              {st.thumbnail ? (
                <img src={`${st.thumbnail}?t=${Math.floor(Date.now() / 30000)}`} alt={st.username} className="w-full h-full object-cover" />
              ) : st.offline_image ? (
                <img src={st.offline_image} alt={st.username} className="w-full h-full object-cover opacity-50" />
              ) : st.avatar ? (
                <div className="w-full h-full bg-[#18181b] flex items-center justify-center">
                  <img src={st.avatar} alt={st.username} className="w-6 h-6 rounded-full opacity-60" />
                </div>
              ) : (
                <div className="w-full h-full bg-[#18181b] flex items-center justify-center">
                  <span className="text-white/30 text-[9px] font-bold">{st.username[0].toUpperCase()}</span>
                </div>
              )}

              {/* Dot live */}
              {st.live && (
                <span className="absolute top-1 left-1 w-1.5 h-1.5 bg-[#e91916] rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
