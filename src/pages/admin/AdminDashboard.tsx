import { useEffect, useState } from 'react';
import { adminSupabase as supabase } from '@/integrations/supabase/admin-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  TicketCheck,
  Lightbulb,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface Stats {
  totalUsers: number;
  newUsersThisWeek: number;
  freeUsers: number;
  weeklyUsers: number;
  monthlyUsers: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  pendingSuggestions: number;
  plannedSuggestions: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const [
          { count: totalUsers },
          { count: newUsersThisWeek },
          { data: subscriptions },
          { data: tickets },
          { data: suggestions },
        ] = await Promise.all([
          supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
          supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', weekAgo.toISOString()),
          supabase.from('user_subscriptions').select('plan, status'),
          supabase.from('support_tickets').select('status'),
          supabase.from('suggestions').select('status'),
        ]);

        const activeSubs = subscriptions?.filter((s) => s.status === 'active') ?? [];

        setStats({
          totalUsers: totalUsers ?? 0,
          newUsersThisWeek: newUsersThisWeek ?? 0,
          freeUsers:
            (totalUsers ?? 0) -
            activeSubs.filter((s) => s.plan !== 'free').length,
          weeklyUsers: activeSubs.filter((s) => s.plan === 'weekly').length,
          monthlyUsers: activeSubs.filter((s) => s.plan === 'monthly').length,
          openTickets: tickets?.filter((t) => t.status === 'open').length ?? 0,
          inProgressTickets:
            tickets?.filter((t) => t.status === 'in_progress').length ?? 0,
          resolvedTickets:
            tickets?.filter((t) => t.status === 'resolved').length ?? 0,
          pendingSuggestions:
            suggestions?.filter((s) => s.status === 'submitted').length ?? 0,
          plannedSuggestions:
            suggestions?.filter((s) => s.status === 'planned').length ?? 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Resumen general de la plataforma.</p>
      </div>

      {/* Users */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Usuarios
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total usuarios"
            value={stats.totalUsers}
            iconClass="text-blue-500"
          />
          <StatCard
            icon={TrendingUp}
            label="Nuevos esta semana"
            value={stats.newUsersThisWeek}
            iconClass="text-green-500"
          />
          <StatCard
            icon={CreditCard}
            label="Plan semanal"
            value={stats.weeklyUsers}
            iconClass="text-orange-500"
          />
          <StatCard
            icon={CreditCard}
            label="Plan mensual"
            value={stats.monthlyUsers}
            iconClass="text-purple-500"
          />
        </div>
      </section>

      {/* Support Tickets */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Tickets de soporte
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={AlertCircle}
            label="Abiertos"
            value={stats.openTickets}
            iconClass="text-blue-500"
          />
          <StatCard
            icon={Clock}
            label="En progreso"
            value={stats.inProgressTickets}
            iconClass="text-yellow-500"
          />
          <StatCard
            icon={CheckCircle2}
            label="Resueltos"
            value={stats.resolvedTickets}
            iconClass="text-green-500"
          />
        </div>
      </section>

      {/* Suggestions */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Sugerencias y mejoras
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            icon={Lightbulb}
            label="Nuevas (sin revisar)"
            value={stats.pendingSuggestions}
            iconClass="text-yellow-500"
          />
          <StatCard
            icon={TicketCheck}
            label="Planificadas"
            value={stats.plannedSuggestions}
            iconClass="text-green-500"
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  iconClass,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  iconClass?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className={`h-4 w-4 ${iconClass ?? 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
