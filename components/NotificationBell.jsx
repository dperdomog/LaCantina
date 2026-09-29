'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

const TYPE_ICON = {
  team_apply:           '📩',
  team_invite:          '📨',
  team_accepted:        '✅',
  team_declined:        '❌',
  tournament_open:      '🏆',
  tournament_live:      '🔴',
  tournament_closed:    '🏁',
  tournament_registered:'✅',
  registration_removed: '⚠️',
  tournament_champion:  '🥇',
  team_captain:         '👑',
  scrim_request:        '🤝',
  scrim_accepted:       '✅',
  scrim_declined:       '❌',
  scrim_cancelled:      '🚫',
  report_new:           '🚩',
  account_banned:       '⛔',
  account_unbanned:     '✅',
  default:              '🔔',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'ahora';
  if (m < 60)  return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen]   = useState(false);
  const panelRef          = useRef(null);
  const supabaseRef       = useRef(null);

  // Cargar notificaciones + suscribir Realtime
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    supabaseRef.current = supabase;

    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setNotifications(data ?? []));

    const channel = supabase
      .channel(`notif-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => setNotifications(prev => [payload.new, ...prev]),
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  // Cerrar al clickear afuera
  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    // Marcar todas como leídas al abrir
    if (next && unread > 0 && supabaseRef.current) {
      supabaseRef.current
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)
        .then(() => setNotifications(prev => prev.map(n => ({ ...n, read: true }))));
    }
  }

  if (!userId) return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        aria-label="Notificaciones"
        className="relative flex items-center justify-center w-10 h-10 rounded-full border-[3px] border-line bg-surface shadow-sticker-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all text-[17px]"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] bg-red text-white border-2 border-line font-bold text-[10px] rounded-full flex items-center justify-center px-0.5 leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="sticker absolute right-0 top-[calc(100%+12px)] w-[min(340px,calc(100vw-40px))] max-h-[420px] overflow-y-auto z-[200]">

          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b-[3px] border-line">
            <span className="font-display text-[17px]">Notificaciones</span>
            {notifications.length > 0 && (
              <button
                onClick={() => {
                  supabaseRef.current
                    ?.from('notifications')
                    .update({ read: true })
                    .eq('user_id', userId)
                    .then(() => setNotifications(prev => prev.map(n => ({ ...n, read: true }))));
                }}
                className="text-[12px] font-bold text-ink-dim hover:text-ink underline underline-offset-2"
              >
                Marcar todo leído
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-ink-dim text-[13px]">Sin notificaciones por ahora.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-ink/[0.05]">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                    !n.read ? 'bg-yellow/[0.18]' : ''
                  }`}
                >
                  <span className="text-[20px] shrink-0 mt-0.5">
                    {TYPE_ICON[n.type] ?? TYPE_ICON.default}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] leading-snug ${!n.read ? 'text-ink font-semibold' : 'text-ink-dim'}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-[11px] text-ink-dim mt-0.5 leading-snug">{n.body}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-ink-dim shrink-0 mt-0.5 whitespace-nowrap">{timeAgo(n.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
