'use client';

import { useEffect, useRef } from 'react';

function formatViewers(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

export default function TwitchPlayerModal({ streamer, onClose }) {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-sm flex flex-col"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#18181b] border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          {streamer.avatar && (
            <img src={streamer.avatar} alt={streamer.username} className="w-8 h-8 rounded-full border border-[rgba(145,71,255,0.5)]" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-[14px]">{streamer.username}</span>
              {streamer.live && (
                <span className="bg-[#e91916] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-[3px] flex items-center gap-1">
                  <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                  EN DIRECTO
                </span>
              )}
            </div>
            {streamer.live && (
              <p className="text-white/50 text-[11px] truncate max-w-[400px]">
                {streamer.game && <span className="text-[#a970ff]">{streamer.game}</span>}
                {streamer.game && streamer.viewers ? ' · ' : ''}
                {streamer.viewers ? `${formatViewers(streamer.viewers)} espectadores` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`https://twitch.tv/${streamer.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#a970ff] text-[12px] font-semibold no-underline hover:text-white transition-colors flex items-center gap-1"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
            </svg>
            Abrir en Twitch ↗
          </a>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white text-[18px] leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* Player + Chat */}
      <div className="flex flex-1 min-h-0">
        {/* Video player */}
        <div className="flex-1 min-w-0 bg-black">
          <iframe
            src={`https://player.twitch.tv/?channel=${streamer.username}&parent=${hostname}&autoplay=true&muted=false`}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; fullscreen"
          />
        </div>

        {/* Chat — solo en desktop */}
        <div className="hidden lg:block w-[340px] shrink-0 bg-[#18181b] border-l border-white/10">
          <iframe
            src={`https://www.twitch.tv/embed/${streamer.username}/chat?parent=${hostname}&darkpopout`}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}
