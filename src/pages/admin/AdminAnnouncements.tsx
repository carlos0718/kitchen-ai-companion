import { useEffect, useState } from 'react';
import { adminSupabase as supabase } from '@/integrations/supabase/admin-client';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Pencil, Megaphone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Announcement {
  id: string;
  title: string;
  message: string;
  action_url: string | null;
  severity: string;
  is_active: boolean;
  published_at: string;
  expires_at: string | null;
  created_at: string;
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  info:    { label: 'Info',    color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
  success: { label: 'Éxito',  color: 'bg-green-500/10 text-green-700 border-green-500/20' },
  warning: { label: 'Aviso',  color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' },
  error:   { label: 'Error',  color: 'bg-red-500/10 text-red-700 border-red-500/20' },
};

const EMPTY: Omit<Announcement, 'id' | 'created_at'> = {
  title: '',
  message: '',
  action_url: null,
  severity: 'info',
  is_active: true,
  published_at: new Date().toISOString().slice(0, 16),
  expires_at: null,
};

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [severity, setSeverity] = useState('info');
  const [isActive, setIsActive] = useState(true);
  const [publishedAt, setPublishedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('system_announcements')
      .select('*')
      .order('created_at', { ascending: false });
    setAnnouncements(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setMessage('');
    setActionUrl('');
    setSeverity('info');
    setIsActive(true);
    setPublishedAt(new Date().toISOString().slice(0, 16));
    setExpiresAt('');
    setDialogOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setTitle(a.title);
    setMessage(a.message);
    setActionUrl(a.action_url ?? '');
    setSeverity(a.severity);
    setIsActive(a.is_active);
    setPublishedAt(a.published_at.slice(0, 16));
    setExpiresAt(a.expires_at ? a.expires_at.slice(0, 16) : '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: 'Campos requeridos', description: 'Título y mensaje son obligatorios.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        action_url: actionUrl.trim() || null,
        severity,
        is_active: isActive,
        published_at: publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString(),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      if (editing) {
        await supabase.from('system_announcements').update(payload).eq('id', editing.id);
      } else {
        await supabase.from('system_announcements').insert(payload);
      }

      toast({ title: editing ? 'Anuncio actualizado' : 'Anuncio creado', description: 'Los cambios se guardaron correctamente.' });
      setDialogOpen(false);
      fetchAnnouncements();
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar el anuncio.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Anuncios</h1>
          <p className="text-muted-foreground">Notificaciones globales para todos los usuarios (nuevas funcionalidades, avisos, etc.).</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo anuncio
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
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Publicado</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Sin anuncios creados.
                  </TableCell>
                </TableRow>
              ) : (
                announcements.map((a) => {
                  const sev = SEVERITY_CONFIG[a.severity] ?? SEVERITY_CONFIG.info;
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Megaphone className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{a.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{a.message}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={sev.color}>{sev.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {a.is_active ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">Activo</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">Inactivo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(a.published_at), { addSuffix: true, locale: es })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.expires_at
                          ? formatDistanceToNow(new Date(a.expires_at), { addSuffix: true, locale: es })
                          : <span className="italic">Sin expiración</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar anuncio' : 'Nuevo anuncio'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input placeholder="Ej: Nueva funcionalidad disponible" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Mensaje</Label>
              <Textarea
                placeholder="Descripción del anuncio para los usuarios..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>URL de acción <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input placeholder="/chat o /planner" value={actionUrl} onChange={(e) => setActionUrl(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info (azul)</SelectItem>
                    <SelectItem value="success">Éxito (verde)</SelectItem>
                    <SelectItem value="warning">Aviso (amarillo)</SelectItem>
                    <SelectItem value="error">Error (rojo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Publicación</Label>
                <Input type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de expiración <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            <div className="flex items-center justify-between border rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-medium">Activo</p>
                <p className="text-xs text-muted-foreground">Los usuarios verán este anuncio en sus notificaciones</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Actualizar' : 'Crear anuncio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
