import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Search, MessageSquare, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
}

const STATUS_CONFIG = {
  open: { label: 'Abierto', icon: AlertCircle, color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
  in_progress: { label: 'En progreso', icon: Clock, color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' },
  resolved: { label: 'Resuelto', icon: CheckCircle2, color: 'bg-green-500/10 text-green-700 border-green-500/20' },
  closed: { label: 'Cerrado', icon: XCircle, color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Baja', color: 'bg-slate-500/10 text-slate-700 border-slate-500/20' },
  medium: { label: 'Media', color: 'bg-orange-500/10 text-orange-700 border-orange-500/20' },
  high: { label: 'Alta', color: 'bg-red-500/10 text-red-700 border-red-500/20' },
};

export default function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [editStatus, setEditStatus] = useState<string>('open');
  const [editPriority, setEditPriority] = useState<string>('medium');
  const [adminResponse, setAdminResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchTickets = async () => {
    setLoading(true);
    const { data: ticketsData } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (!ticketsData) { setLoading(false); return; }

    // Fetch user names
    const userIds = [...new Set(ticketsData.map((t) => t.user_id))];
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, name, last_name')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

    setTickets(
      ticketsData.map((t) => {
        const profile = profileMap.get(t.user_id);
        return {
          ...t,
          status: t.status as Ticket['status'],
          priority: t.priority as Ticket['priority'],
          user_name: profile
            ? `${profile.name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Sin nombre'
            : 'Desconocido',
        };
      })
    );
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, []);

  const openTicket = (ticket: Ticket) => {
    setSelected(ticket);
    setEditStatus(ticket.status);
    setEditPriority(ticket.priority);
    setAdminResponse(ticket.admin_response ?? '');
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    try {
      await supabase
        .from('support_tickets')
        .update({
          status: editStatus,
          priority: editPriority,
          admin_response: adminResponse || null,
          admin_id: user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selected.id);

      toast({ title: 'Ticket actualizado' });
      setSelected(null);
      fetchTickets();
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filtered = tickets.filter((t) => {
    const matchSearch =
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      (t.user_name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Tickets de soporte</h1>
        <p className="text-muted-foreground">Gestión de consultas y solicitudes de ayuda.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por asunto o usuario..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Abiertos</SelectItem>
            <SelectItem value="in_progress">En progreso</SelectItem>
            <SelectItem value="resolved">Resueltos</SelectItem>
            <SelectItem value="closed">Cerrados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="low">Baja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Asunto</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Resp. admin</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Sin tickets.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ticket) => {
                  const StatusIcon = STATUS_CONFIG[ticket.status].icon;
                  return (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium text-sm">{ticket.user_name}</TableCell>
                      <TableCell className="max-w-48 truncate text-sm">{ticket.subject}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={PRIORITY_CONFIG[ticket.priority].color}>
                          {PRIORITY_CONFIG[ticket.priority].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_CONFIG[ticket.status].color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {STATUS_CONFIG[ticket.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: es })}
                      </TableCell>
                      <TableCell>
                        {ticket.admin_response ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openTicket(ticket)}>
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ticket de soporte</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 py-1">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="font-semibold text-sm">{selected.subject}</p>
                <p className="text-sm text-muted-foreground">{selected.user_name}</p>
                <p className="text-sm mt-2">{selected.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Abierto</SelectItem>
                      <SelectItem value="in_progress">En progreso</SelectItem>
                      <SelectItem value="resolved">Resuelto</SelectItem>
                      <SelectItem value="closed">Cerrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Prioridad</Label>
                  <Select value={editPriority} onValueChange={setEditPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="low">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Respuesta del administrador</Label>
                <Textarea
                  placeholder="Escribí una respuesta interna o para el usuario..."
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
