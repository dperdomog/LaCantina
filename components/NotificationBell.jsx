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
        className="relative flex items-center justify-center w-9 h-9 rounded-full border border-[rgba(241,237,229,0.08)] hover:border-yellow/30 transition-colors text-[18px]"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-yellow text-[#0a0a0a] font-bold text-[10px] rounded-full flex items-center justify-center px-0.5 leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[340px] max-h-[420px] overflow-y-auto bg-[#0d0f15] border border-[rgba(241,237,229,0.10)] rounded-[16px] shadow-[0_16px_48px_rgba(0,0,0,.6)] z-[200]">

          <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-[rgba(241,237,229,0.06)]">
            <span className="mono-label text-yellow">// NOTIFICACIONES</span>
            {notifications.length > 0 && (
              <button
                onClick={() => {
                  supabaseRef.current
                    ?.from('notifications')
                    .update({ read: true })
                    .eq('user_id', userId)
                    .then(() => setNotifications(prev => prev.map(n => ({ ...n, read: true }))));
                }}
                className="mono-label text-[9px] text-ink-dim hover:text-yellow transition-colors"
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
            <div className="flex flex-col divide-y divide-[rgba(241,237,229,0.05)]">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                    !n.read ? 'bg-yellow/[0.03]' : ''
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
                  <span className="mono-label text-[9px] shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
