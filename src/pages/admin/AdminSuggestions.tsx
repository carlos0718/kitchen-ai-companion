import { useEffect, useState } from 'react';
import { adminSupabase as supabase } from '@/integrations/supabase/admin-client';
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
import { Loader2, Search, Lightbulb, ThumbsUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Suggestion {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: 'feature' | 'improvement' | 'ui_ux' | 'other';
  votes: number;
  status: 'submitted' | 'under_review' | 'planned' | 'implemented' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  user_name?: string;
}

const STATUS_CONFIG: Record<Suggestion['status'], { label: string; color: string }> = {
  submitted: { label: 'Nueva', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
  under_review: { label: 'En revisión', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' },
  planned: { label: 'Planificada', color: 'bg-purple-500/10 text-purple-700 border-purple-500/20' },
  implemented: { label: 'Implementada', color: 'bg-green-500/10 text-green-700 border-green-500/20' },
  rejected: { label: 'Rechazada', color: 'bg-red-500/10 text-red-700 border-red-500/20' },
};

const CATEGORY_LABELS: Record<Suggestion['category'], string> = {
  feature: 'Nueva función',
  improvement: 'Mejora',
  ui_ux: 'UI/UX',
  other: 'Otro',
};

export default function AdminSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [editStatus, setEditStatus] = useState<string>('submitted');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSuggestions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('suggestions')
      .select('*')
      .order('votes', { ascending: false });

    if (!data) { setLoading(false); return; }

    const userIds = [...new Set(data.map((s) => s.user_id))];
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, name, last_name')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

    setSuggestions(
      data.map((s) => {
        const profile = profileMap.get(s.user_id);
        return {
          ...s,
          user_name: profile
            ? `${profile.name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Sin nombre'
            : 'Desconocido',
        };
      })
    );
    setLoading(false);
  };

  useEffect(() => { fetchSuggestions(); }, []);

  const openSuggestion = (s: Suggestion) => {
    setSelected(s);
    setEditStatus(s.status);
    setAdminNotes(s.admin_notes ?? '');
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    try {
      await supabase
        .from('suggestions')
        .update({
          status: editStatus,
          admin_notes: adminNotes || null,
          admin_id: user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selected.id);

      toast({ title: 'Sugerencia actualizada' });
      setSelected(null);
      fetchSuggestions();
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filtered = suggestions.filter((s) => {
    const matchSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.user_name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchCategory = categoryFilter === 'all' || s.category === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Sugerencias y mejoras</h1>
        <p className="text-muted-foreground">Solicitudes de nuevas funciones e ideas de los usuarios.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título o usuario..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="submitted">Nueva</SelectItem>
            <SelectItem value="under_review">En revisión</SelectItem>
            <SelectItem value="planned">Planificada</SelectItem>
            <SelectItem value="implemented">Implementada</SelectItem>
            <SelectItem value="rejected">Rechazada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="feature">Nueva función</SelectItem>
            <SelectItem value="improvement">Mejora</SelectItem>
            <SelectItem value="ui_ux">UI/UX</SelectItem>
            <SelectItem value="other">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
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
                <TableHead>Usuario</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Votos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Sin sugerencias.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-sm max-w-48 truncate">{s.title}</TableCell>
                    <TableCell className="text-sm">{s.user_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{CATEGORY_LABELS[s.category]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <ThumbsUp className="h-3.5 w-3.5 text-muted-foreground" />
                        {s.votes}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_CONFIG[s.status].color}>
                        {STATUS_CONFIG[s.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(s.created_at), { addSuffix: true, locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openSuggestion(s)}>
                        <Lightbulb className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sugerencia</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 py-1">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm">{selected.title}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                    <ThumbsUp className="h-3 w-3" />
                    {selected.votes} votos
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selected.user_name} · {CATEGORY_LABELS[selected.category]}
                </p>
                <p className="text-sm">{selected.description}</p>
              </div>

              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Nueva</SelectItem>
                    <SelectItem value="under_review">En revisión</SelectItem>
                    <SelectItem value="planned">Planificada</SelectItem>
                    <SelectItem value="implemented">Implementada</SelectItem>
                    <SelectItem value="rejected">Rechazada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Notas internas</Label>
                <Textarea
                  placeholder="Notas de revisión, motivo de rechazo, etc..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
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
