import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Bell, CheckCheck, TicketCheck, Lightbulb, Info, Megaphone, CreditCard, ChefHat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  success: 'text-green-600 bg-green-50',
  info: 'text-blue-600 bg-blue-50',
  warning: 'text-yellow-600 bg-yellow-50',
  error: 'text-red-600 bg-red-50',
};

const SEVERITY_BADGE: Record<string, string> = {
  success: 'bg-green-100 text-green-700 border-green-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  error: 'bg-red-100 text-red-700 border-red-200',
};

const SEVERITY_LABEL: Record<string, string> = {
  success: 'Éxito',
  info: 'Información',
  warning: 'Aviso',
  error: 'Error',
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  support_update: TicketCheck,
  suggestion_update: Lightbulb,
  subscription_update: CreditCard,
  promo_applied: CreditCard,
  announcement: Megaphone,
  welcome: ChefHat,
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'unread' | 'read'>('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchAll = async (uid: string) => {
    const { data: userNotifs } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    const { data: reads } = await db
      .from('user_announcement_reads')
      .select('announcement_id')
      .eq('user_id', uid);

    const readIds = new Set((reads ?? []).map((r: { announcement_id: string }) => r.announcement_id));

    const { data: announcements } = await db
      .from('system_announcements')
      .select('*')
      .eq('is_active', true)
      .lte('published_at', new Date().toISOString())
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('published_at', { ascending: false });

    const mappedAnnouncements: SystemAnnouncement[] = (announcements ?? []).map(
      (a: { id: string; title: string; message: string; severity: string; action_url: string | null; published_at: string }) => ({
        id: a.id,
        type: 'announcement' as const,
        title: a.title,
        message: a.message,
        severity: a.severity,
        read: readIds.has(a.id),
        action_url: a.action_url,
        created_at: a.published_at,
        source: 'announcement' as const,
      })
    );

    const mappedUserNotifs: UserNotification[] = (userNotifs ?? []).map(
      (n: { id: string; type: string; title: string; message: string; severity: string; read: boolean; action_url: string | null; created_at: string }) => ({
        ...n,
        source: 'notification' as const,
      })
    );

    const merged = [...mappedAnnouncements, ...mappedUserNotifs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setNotifications(merged);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      fetchAll(user.id);

      const channel = supabase
        .channel('notifications-page')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` },
          () => fetchAll(user.id)
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` },
          () => fetchAll(user.id)
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    });
  }, []);

  const markAsRead = async (item: NotificationItem) => {
    if (item.read) return;

    if (item.source === 'announcement') {
      if (userId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('user_announcement_reads').insert({ user_id: userId, announcement_id: item.id }).select();
        setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      }
    } else {
      await supabase.from('user_notifications').update({ read: true }).eq('id', item.id);
      setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    }
  };

  const markAllAsRead = async () => {
    if (!userId || unreadCount === 0) return;

    await supabase.from('user_notifications').update({ read: true }).eq('user_id', userId).eq('read', false);

    const unreadAnnouncements = notifications.filter((n) => n.source === 'announcement' && !n.read);
    if (unreadAnnouncements.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('user_announcement_reads').insert(
        unreadAnnouncements.map((a) => ({ user_id: userId, announcement_id: a.id }))
      );
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const filtered = notifications.filter((n) => {
    if (tab === 'unread') return !n.read;
    if (tab === 'read') return n.read;
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-serif font-semibold">Notificaciones</h1>
          {unreadCount > 0 && (
            <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5">
              {unreadCount} sin leer
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-2">
            <CheckCheck className="h-4 w-4" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-6">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">Todas</TabsTrigger>
          <TabsTrigger value="unread" className="flex-1">
            No leídas
            {unreadCount > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="read" className="flex-1">Leídas</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Bell className="h-12 w-12 opacity-20" />
          <p className="text-base font-medium">
            {tab === 'unread' ? 'No tenés notificaciones sin leer' : 'No hay notificaciones'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const iconType = n.source === 'announcement' ? 'announcement' : n.type;
            const Icon = TYPE_ICONS[iconType] ?? Info;
            const severityStyle = SEVERITY_COLORS[n.severity] ?? 'text-muted-foreground bg-muted';

            return (
              <button
                type="button"
                key={`${n.source}-${n.id}`}
                onClick={() => markAsRead(n)}
                className={cn(
                  'w-full text-left rounded-xl border p-4 flex gap-4 transition-colors hover:bg-accent/40',
                  !n.read ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'
                )}
              >
                {/* Icon */}
                <div className={cn('shrink-0 w-10 h-10 rounded-full flex items-center justify-center', severityStyle)}>
                  <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-semibold leading-tight truncate">{n.title}</p>
                      {!n.read && <span className="shrink-0 w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] shrink-0 px-1.5 py-0', SEVERITY_BADGE[n.severity])}
                    >
                      {SEVERITY_LABEL[n.severity] ?? n.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
