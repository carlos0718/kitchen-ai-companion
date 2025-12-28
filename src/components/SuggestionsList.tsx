import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, AlertCircle, Eye, CheckCircle2, Calendar, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Suggestion {
  id: string;
  title: string;
  description: string;
  category: 'feature' | 'improvement' | 'ui_ux' | 'other';
  status: 'submitted' | 'under_review' | 'planned' | 'implemented' | 'rejected';
  votes: number;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG = {
  submitted: { label: 'Enviada', icon: AlertCircle, color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
  under_review: { label: 'En revisión', icon: Eye, color: 'bg-purple-500/10 text-purple-700 border-purple-500/20' },
  planned: { label: 'Planificada', icon: Calendar, color: 'bg-orange-500/10 text-orange-700 border-orange-500/20' },
  implemented: { label: 'Implementada', icon: CheckCircle2, color: 'bg-green-500/10 text-green-700 border-green-500/20' },
  rejected: { label: 'Rechazada', icon: XCircle, color: 'bg-red-500/10 text-red-700 border-red-500/20' },
};

const CATEGORY_CONFIG = {
  feature: { label: 'Nueva funcionalidad', color: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20' },
  improvement: { label: 'Mejora', color: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20' },
  ui_ux: { label: 'UI/UX', color: 'bg-pink-500/10 text-pink-700 border-pink-500/20' },
  other: { label: 'Otro', color: 'bg-slate-500/10 text-slate-700 border-slate-500/20' },
};

export function SuggestionsList() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('suggestions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching suggestions:', error);
        return;
      }

      setSuggestions(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();

    // Listen for new suggestion creation
    const handleSuggestionCreated = () => {
      fetchSuggestions();
    };

    window.addEventListener('suggestion-created', handleSuggestionCreated);

    return () => {
      window.removeEventListener('suggestion-created', handleSuggestionCreated);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No tienes sugerencias enviadas aún.</p>
        <p className="text-sm mt-1">Comparte tu primera idea usando el formulario de arriba.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {suggestions.map((suggestion) => {
        const StatusIcon = STATUS_CONFIG[suggestion.status].icon;

        return (
          <div
            key={suggestion.id}
            className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <h3 className="font-medium text-sm flex-1">{suggestion.title}</h3>
              <div className="flex gap-2">
                <Badge variant="outline" className={CATEGORY_CONFIG[suggestion.category].color}>
                  {CATEGORY_CONFIG[suggestion.category].label}
                </Badge>
                <Badge variant="outline" className={STATUS_CONFIG[suggestion.status].color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {STATUS_CONFIG[suggestion.status].label}
                </Badge>
              </div>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {suggestion.description}
            </p>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Creada {formatDistanceToNow(new Date(suggestion.created_at), { addSuffix: true, locale: es })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
