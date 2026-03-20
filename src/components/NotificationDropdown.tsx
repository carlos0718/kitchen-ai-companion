import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Bell, CheckCheck, TicketCheck, Lightbulb, Info, Megaphone, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  read: boolean;
  action_url: string | null;
  created_at: string;
  source: 'notification';
}

interface SystemAnnouncement {
  id: string;
  type: 'announcement';
  title: string;
  message: string;
  severity: string;
  read: boolean;
  action_url: string | null;
  created_at: string;
  source: 'announcement';
}

type NotificationItem = UserNotification | SystemAnnouncement;

const SEVERITY_COLORS: Record<string, string> = {
  success: 'text-green-600',
  info: 'text-blue-600',
  warning: 'text-yellow-600',
  error: 'text-red-600',
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  support_update: TicketCheck,
  suggestion_update: Lightbulb,
  subscription_update: CreditCard,
  promo_applied: CreditCard,
  announcement: Megaphone,
};

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchAll = async (uid: string) => {
    // Fetch user notifications
    const { data: userNotifs } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch unread system announcements (not dismissed by this user)
    const { data: reads } = await supabase
      .from('user_announcement_reads')
      .select('announcement_id')
      .eq('user_id', uid);

    const readIds = new Set((reads ?? []).map((r: { announcement_id: string }) => r.announcement_id));

    const { data: announcements } = await supabase
      .from('system_announcements')
      .select('*')
      .eq('is_active', true)
      .lte('published_at', new Date().toISOString())
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('published_at', { ascending: false });

    const unreadAnnouncements: SystemAnnouncement[] = (announcements ?? [])
      .filter((a: { id: string }) => !readIds.has(a.id))
      .map((a: { id: string; title: string; message: string; severity: string; action_url: string | null; published_at: string }) => ({
        id: a.id,
        type: 'announcement' as const,
        title: a.title,
        message: a.message,
        severity: a.severity,
        read: false,
        action_url: a.action_url,
        created_at: a.published_at,
        source: 'announcement' as const,
      }));

    const userNotifsMapped: UserNotification[] = (userNotifs ?? []).map((n: { id: string; type: string; title: string; message: string; severity: string; read: boolean; action_url: string | null; created_at: string }) => ({
      ...n,
      source: 'notification' as const,
    }));

    // Merge and sort by date, limit to 10
    const merged = [...unreadAnnouncements, ...userNotifsMapped]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    setNotifications(merged);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      fetchAll(user.id);

      // Real-time on user_notifications inserts
      const channel = supabase
        .channel('user-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => fetchAll(user.id)
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'system_announcements' },
          () => fetchAll(user.id)
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAsRead = async (item: NotificationItem) => {
    if (item.source === 'announcement') {
      if (!item.read && userId) {
        await supabase.from('user_announcement_reads').insert({
          user_id: userId,
          announcement_id: item.id,
        }).select();
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
        );
      }
    } else {
      if (!item.read) {
        await supabase
          .from('user_notifications')
          .update({ read: true })
          .eq('id', item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
        );
      }
    }
    if (item.action_url) {
      navigate(item.action_url);
    }
    setOpen(false);
  };

  const markAllAsRead = async () => {
    if (!userId || unreadCount === 0) return;

    // Mark all user notifications
    await supabase
      .from('user_notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    // Mark all unread announcements
    const unreadAnnouncements = notifications.filter(
      (n) => n.source === 'announcement' && !n.read
    );
    if (unreadAnnouncements.length > 0) {
      await supabase.from('user_announcement_reads').insert(
        unreadAnnouncements.map((a) => ({ user_id: userId, announcement_id: a.id }))
      );
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-accent transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-popover border rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm font-semibold">Notificaciones</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                <Bell className="h-8 w-8 opacity-30" />
                <p className="text-sm">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map((n) => {
                const iconType = n.source === 'announcement' ? 'announcement' : n.type;
                const Icon = TYPE_ICONS[iconType] ?? Info;
                return (
                  <button
                    type="button"
                    key={`${n.source}-${n.id}`}
                    onClick={() => markAsRead(n)}
                    className={cn(
                      'w-full text-left px-4 py-3 flex gap-3 hover:bg-accent/50 transition-colors border-b last:border-0',
                      !n.read && 'bg-primary/5'
                    )}
                  >
                    <div className={cn('mt-0.5 shrink-0', SEVERITY_COLORS[n.severity] ?? 'text-muted-foreground')}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-tight truncate">{n.title}</p>
                        {!n.read && (
                          <span className="shrink-0 w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-2.5">
            <button
              type="button"
              onClick={() => { navigate('/notifications'); setOpen(false); }}
              className="w-full text-center text-xs text-primary hover:underline font-medium"
            >
              Ver todas las notificaciones
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
