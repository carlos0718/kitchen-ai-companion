import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG = {
  open: { label: 'Abierto', icon: AlertCircle, color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
  in_progress: { label: 'En progreso', icon: Clock, color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' },
  resolved: { label: 'Resuelto', icon: CheckCircle2, color: 'bg-green-500/10 text-green-700 border-green-500/20' },
  closed: { label: 'Cerrado', icon: XCircle, color: 'bg-gray-500/10 text-gray-700 border-gray-500/20' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Baja', color: 'bg-slate-500/10 text-slate-700 border-slate-500/20' },
  medium: { label: 'Media', color: 'bg-orange-500/10 text-orange-700 border-orange-500/20' },
  high: { label: 'Alta', color: 'bg-red-500/10 text-red-700 border-red-500/20' },
};

export function SupportTicketsList() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching support tickets:', error);
        return;
      }

      setTickets(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    // Listen for new ticket creation
    const handleTicketCreated = () => {
      fetchTickets();
    };

    window.addEventListener('support-ticket-created', handleTicketCreated);

    return () => {
      window.removeEventListener('support-ticket-created', handleTicketCreated);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No tienes consultas de soporte aún.</p>
        <p className="text-sm mt-1">Envía tu primera consulta usando el formulario de arriba.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => {
        const StatusIcon = STATUS_CONFIG[ticket.status].icon;

        return (
          <div
            key={ticket.id}
            className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <h3 className="font-medium text-sm flex-1">{ticket.subject}</h3>
              <div className="flex gap-2">
                <Badge variant="outline" className={PRIORITY_CONFIG[ticket.priority].color}>
                  {PRIORITY_CONFIG[ticket.priority].label}
                </Badge>
                <Badge variant="outline" className={STATUS_CONFIG[ticket.status].color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {STATUS_CONFIG[ticket.status].label}
                </Badge>
              </div>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {ticket.description}
            </p>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Creado {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: es })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
