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
import { DatePicker } from '@/components/ui/date-picker';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2, Search, UserCog } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface UserRow {
  user_id: string;
  email: string;
  name: string | null;
  last_name: string | null;
  country: string | null;
  is_admin: boolean;
  created_at: string;
  subscription?: {
    plan: string;
    status: string;
    current_period_end: string | null;
    payment_gateway: string | null;
  } | null;
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Gratis',
  weekly: 'Semanal',
  monthly: 'Mensual',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active:             { label: 'Activo',     color: 'bg-green-500/10 text-green-700 border-green-500/20' },
  canceled:           { label: 'Cancelado',  color: 'bg-red-500/10 text-red-700 border-red-500/20' },
  past_due:           { label: 'Vencido',    color: 'bg-orange-500/10 text-orange-700 border-orange-500/20' },
  paused:             { label: 'Pausado',    color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' },
  trialing:           { label: 'Prueba',     color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
  unpaid:             { label: 'Sin pago',   color: 'bg-red-500/10 text-red-700 border-red-500/20' },
  incomplete:         { label: 'Incompleto', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
  incomplete_expired: { label: 'Expirado',  color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
  inactive:           { label: 'Inactivo',  color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Editable subscription fields
  const [editPlan, setEditPlan] = useState('free');
  const [editStatus, setEditStatus] = useState('inactive');
  const [editGateway, setEditGateway] = useState('manual');
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editPeriodEnd, setEditPeriodEnd] = useState('');

  const fetchUsers = async () => {
    setLoading(true);

    const [{ data: rpcUsers }, { data: subscriptions }, { data: adminRows }] = await Promise.all([
      supabase.rpc('get_admin_users'),
      supabase.from('user_subscriptions').select('user_id, plan, status, current_period_end, payment_gateway'),
      supabase.from('admin_users').select('user_id'),
    ]);

    const subMap = new Map(subscriptions?.map((s) => [s.user_id, s]) ?? []);
    const adminSet = new Set(adminRows?.map((a) => a.user_id) ?? []);

    setUsers(
      (rpcUsers ?? []).map((u: { user_id: string; email: string; name: string | null; last_name: string | null; country: string | null; created_at: string }) => ({
        ...u,
        is_admin: adminSet.has(u.user_id),
        subscription: subMap.get(u.user_id) ?? null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const openEdit = (user: UserRow) => {
    setEditingUser(user);
    setEditPlan(user.subscription?.plan ?? 'free');
    setEditStatus(user.subscription?.status ?? 'inactive');
    setEditGateway(user.subscription?.payment_gateway ?? 'manual');
    setEditIsAdmin(user.is_admin);
    const existingEnd = user.subscription?.current_period_end;
    const defaultEnd = new Date();
    defaultEnd.setMonth(defaultEnd.getMonth() + 1);
    setEditPeriodEnd(
      existingEnd
        ? existingEnd.slice(0, 10)
        : defaultEnd.toISOString().slice(0, 10)
    );
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      // Sync admin_users table (INSERT or DELETE)
      if (editIsAdmin && !editingUser.is_admin) {
        await supabase.from('admin_users').insert({ user_id: editingUser.user_id });
      } else if (!editIsAdmin && editingUser.is_admin) {
        await supabase.from('admin_users').delete().eq('user_id', editingUser.user_id);
      }

      // Upsert subscription
      await supabase.from('user_subscriptions').upsert(
        {
          user_id: editingUser.user_id,
          plan: editPlan,
          status: editStatus,
          payment_gateway: editGateway,
          subscribed: editStatus === 'active',
          current_period_end: editPeriodEnd ? new Date(editPeriodEnd).toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      toast({ title: 'Usuario actualizado', description: 'Los cambios se guardaron correctamente.' });
      setEditingUser(null);
      fetchUsers();
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter((u) => {
    const fullName = `${u.name ?? ''} ${u.last_name ?? ''}`.toLowerCase();
    const matchSearch =
      fullName.includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.user_id.includes(search);
    const matchPlan =
      planFilter === 'all' ||
      (u.subscription?.plan ?? 'free') === planFilter;
    return matchSearch && matchPlan;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-muted-foreground">Gestión de usuarios y suscripciones.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o ID..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los planes</SelectItem>
            <SelectItem value="free">Gratis</SelectItem>
            <SelectItem value="weekly">Semanal</SelectItem>
            <SelectItem value="monthly">Mensual</SelectItem>
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
                <TableHead>Nombre</TableHead>
                <TableHead>Apellido</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Suscripción</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    Sin resultados.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user) => {
                  const plan = user.subscription?.plan ?? 'free';
                  const status = user.subscription?.status ?? 'inactive';
                  const statusCfg = STATUS_CONFIG[status];
                  return (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">
                        {user.name ?? <span className="text-muted-foreground italic">—</span>}
                      </TableCell>
                      <TableCell>
                        {user.last_name ?? <span className="text-muted-foreground italic">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                      <TableCell>{user.country ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{PLAN_LABELS[plan] ?? plan}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusCfg?.color ?? ''}>
                          {statusCfg?.label ?? status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.is_admin ? (
                          <Badge className="bg-purple-500/10 text-purple-700 border-purple-500/20" variant="outline">
                            Admin
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(user)}>
                          <UserCog className="h-4 w-4 mr-1" />
                          Editar
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

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-5 py-1">

              {/* Read-only user info */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Información del usuario
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Nombre</Label>
                    <p className="text-sm font-medium">{editingUser.name ?? '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Apellido</Label>
                    <p className="text-sm font-medium">{editingUser.last_name ?? '—'}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="text-sm font-medium">{editingUser.email}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">País</Label>
                    <p className="text-sm font-medium">{editingUser.country ?? '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Registrado</Label>
                    <p className="text-sm font-medium">
                      {formatDistanceToNow(new Date(editingUser.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">ID</Label>
                  <p className="text-xs font-mono text-muted-foreground break-all">{editingUser.user_id}</p>
                </div>
              </div>

              <Separator />

              {/* Editable subscription fields */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Suscripción
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Plan</Label>
                    <Select value={editPlan} onValueChange={setEditPlan}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Gratis</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Estado</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="inactive">Inactivo</SelectItem>
                        <SelectItem value="canceled">Cancelado</SelectItem>
                        <SelectItem value="past_due">Vencido</SelectItem>
                        <SelectItem value="paused">Pausado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Método de pago</Label>
                  <Select value={editGateway} onValueChange={setEditGateway}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="mercadopago">MercadoPago</SelectItem>
                      <SelectItem value="stripe">Stripe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Fin del período</Label>
                  <DatePicker
                    value={editPeriodEnd}
                    onChange={setEditPeriodEnd}
                    placeholder="Sin fecha de vencimiento"
                    warning={!!(editPeriodEnd && new Date(editPeriodEnd) < new Date())}
                  />
                  {editPeriodEnd && new Date(editPeriodEnd) < new Date() && (
                    <p className="text-xs text-red-600">
                      ⚠️ Esta fecha ya venció — el sistema cancelará la suscripción automáticamente.
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Admin role */}
              <div className="flex items-center justify-between border rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Rol administrador</p>
                  <p className="text-xs text-muted-foreground">Da acceso al panel admin</p>
                </div>
                <Switch checked={editIsAdmin} onCheckedChange={setEditIsAdmin} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
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
