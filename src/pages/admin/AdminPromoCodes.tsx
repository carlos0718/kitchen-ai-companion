import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plus, Pencil, Ticket, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { DatePicker } from '@/components/ui/date-picker';

interface PromoCode {
  id: string;
  code: string;
  type: 'free_trial' | 'discount_percent';
  value: number;
  applicable_plan: string | null;
  max_uses: number;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  first_time_only: boolean;
  description: string | null;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  free_trial:      { label: 'Prueba gratis', color: 'bg-green-500/10 text-green-700 border-green-500/20' },
  discount_percent:{ label: 'Descuento %',  color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
};

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function AdminPromoCodes() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Form state
  const [code, setCode] = useState('');
  const [type, setType] = useState<'free_trial' | 'discount_percent'>('free_trial');
  const [value, setValue] = useState('7');
  const [applicablePlan, setApplicablePlan] = useState('any');
  const [maxUses, setMaxUses] = useState('100');
  const [expiresAt, setExpiresAt] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [firstTimeOnly, setFirstTimeOnly] = useState(false);

  const fetchCodes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });
    setCodes(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchCodes(); }, []);

  const openCreate = () => {
    setEditing(null);
    setCode(generateCode());
    setType('free_trial');
    setValue('7');
    setApplicablePlan('any');
    setMaxUses('100');
    setExpiresAt('');
    setDescription('');
    setIsActive(true);
    setFirstTimeOnly(false);
    setDialogOpen(true);
  };

  const openEdit = (c: PromoCode) => {
    setEditing(c);
    setCode(c.code);
    setType(c.type);
    setValue(String(c.value));
    setApplicablePlan(c.applicable_plan ?? 'any');
    setMaxUses(String(c.max_uses));
    setExpiresAt(c.expires_at ? c.expires_at.slice(0, 10) : '');
    setDescription(c.description ?? '');
    setIsActive(c.is_active);
    setFirstTimeOnly(c.first_time_only);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!code.trim()) {
      toast({ title: 'Código requerido', variant: 'destructive' });
      return;
    }
    const numValue = parseInt(value, 10);
    const numMaxUses = parseInt(maxUses, 10);
    if (isNaN(numValue) || numValue <= 0 || isNaN(numMaxUses) || numMaxUses <= 0) {
      toast({ title: 'Valor y usos máximos deben ser números positivos', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        type,
        value: numValue,
        applicable_plan: applicablePlan === 'any' ? null : applicablePlan,
        max_uses: numMaxUses,
        expires_at: expiresAt ? new Date(expiresAt + 'T23:59:59').toISOString() : null,
        description: description.trim() || null,
        is_active: isActive,
        first_time_only: firstTimeOnly,
      };

      if (editing) {
        await supabase.from('promo_codes').update(payload).eq('id', editing.id);
      } else {
        const { data: inserted } = await supabase
          .from('promo_codes')
          .insert(payload)
          .select('id')
          .single();

        // Notify users without subscription history when first_time_only is active
        if (inserted && firstTimeOnly && isActive) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await supabase.functions.invoke('notify-promo-to-users', {
              body: { promo_code_id: inserted.id },
            });
          }
        }
      }

      toast({ title: editing ? 'Cupón actualizado' : 'Cupón creado' });
      setDialogOpen(false);
      fetchCodes();
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cupones</h1>
          <p className="text-muted-foreground">Códigos de descuento y pruebas gratis para nuevos usuarios.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo cupón
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    Sin cupones creados.
                  </TableCell>
                </TableRow>
              ) : (
                codes.map((c) => {
                  const typeCfg = TYPE_CONFIG[c.type] ?? TYPE_CONFIG.free_trial;
                  const usagePct = c.max_uses > 0 ? Math.round((c.current_uses / c.max_uses) * 100) : 0;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Ticket className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-mono font-bold text-sm">{c.code}</span>
                        </div>
                        {c.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 ml-6">{c.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={typeCfg.color}>{typeCfg.label}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {c.type === 'free_trial' ? `${c.value} días` : `${c.value}%`}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.applicable_plan
                          ? c.applicable_plan === 'weekly' ? 'Semanal' : 'Mensual'
                          : <span className="italic">Cualquiera</span>}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className={usagePct >= 90 ? 'text-red-600 font-medium' : ''}>
                            {c.current_uses}/{c.max_uses}
                          </span>
                          <div className="w-16 h-1.5 bg-muted rounded-full mt-1">
                            <div
                              className={`h-full rounded-full ${usagePct >= 90 ? 'bg-red-500' : usagePct >= 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(usagePct, 100)}%` }} /* eslint-disable-line */
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.expires_at
                          ? formatDistanceToNow(new Date(c.expires_at), { addSuffix: true, locale: es })
                          : <span className="italic">Sin expiración</span>}
                      </TableCell>
                      <TableCell>
                        {c.is_active ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">Activo</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">Inactivo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4 mr-1" />
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar cupón' : 'Nuevo cupón'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Código</Label>
              <div className="flex gap-2">
                <Input
                  className="font-mono uppercase tracking-wider"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="BIENVENIDO7"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setCode(generateCode())} title="Generar código aleatorio">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v as 'free_trial' | 'discount_percent')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free_trial">Prueba gratis (días)</SelectItem>
                    <SelectItem value="discount_percent">Descuento (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{type === 'free_trial' ? 'Días gratis' : 'Descuento (%)'}</Label>
                <Input
                  type="number"
                  min={1}
                  max={type === 'discount_percent' ? 100 : 365}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={type === 'free_trial' ? '7' : '50'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Plan aplicable</Label>
                <Select value={applicablePlan} onValueChange={setApplicablePlan}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Cualquiera</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Usos máximos</Label>
                <Input
                  type="number"
                  min={1}
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="100"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Fecha de expiración <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <DatePicker value={expiresAt} onChange={setExpiresAt} placeholder="Sin expiración" />
            </div>

            <div className="space-y-1.5">
              <Label>Nota interna <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Campaña redes sociales marzo 2026" />
            </div>

            {type === 'free_trial' && (
              <div className="flex items-center justify-between border rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Solo usuarios nuevos</p>
                  <p className="text-xs text-muted-foreground">Válido únicamente para quienes nunca tuvieron suscripción</p>
                </div>
                <Switch checked={firstTimeOnly} onCheckedChange={setFirstTimeOnly} />
              </div>
            )}

            <div className="flex items-center justify-between border rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-medium">Activo</p>
                <p className="text-xs text-muted-foreground">Los usuarios podrán canjear este cupón</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Actualizar' : 'Crear cupón'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
