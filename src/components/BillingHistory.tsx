import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, FileText, AlertCircle, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';

interface Invoice {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  status: string;
  created: number;
  period_start: number;
  period_end: number;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  payment_method: {
    type: string;
    last4: string | null;
    brand: string | null;
  } | null;
  description: string;
}

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-500/10 text-green-700 border-green-500/20',
  open: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  void: 'bg-gray-500/10 text-gray-700 border-gray-500/20',
  uncollectible: 'bg-red-500/10 text-red-700 border-red-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  paid: 'Pagada',
  open: 'Pendiente',
  void: 'Anulada',
  uncollectible: 'No cobrable',
};

export function BillingHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { paymentGateway } = useSubscription();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);

      // Ensure there's an active session before calling the function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setInvoices([]);
        return;
      }

      // Let the Supabase client handle authorization automatically
      const { data, error: invoiceError } = await supabase.functions.invoke('get-invoices');

      if (invoiceError) throw invoiceError;

      setInvoices(data.invoices || []);
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
      setError('No se pudieron cargar las facturas');
      toast.error('Error al cargar facturas', {
        description: 'No se pudieron obtener las facturas. Intenta nuevamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const handleViewOnline = (url: string | null) => {
    if (!url) {
      toast.error('Vista en línea no disponible');
      return;
    }
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de Facturación</CardTitle>
          <CardDescription>Tus facturas recientes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de Facturación</CardTitle>
          <CardDescription>Tus facturas recientes</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchInvoices} variant="outline" className="mt-4">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de Facturación</CardTitle>
          <CardDescription>Tus facturas recientes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No tienes facturas aún</p>
            <p className="text-sm text-muted-foreground mt-2">
              Las facturas aparecerán aquí una vez que realices tu primera compra
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Facturación</CardTitle>
        <CardDescription>
          Últimas {invoices.length} {invoices.length === 1 ? 'factura' : 'facturas'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors gap-4"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="font-semibold">
                    {invoice.number || `Factura ${invoice.id.slice(-8)}`}
                  </p>
                  <Badge
                    variant="outline"
                    className={STATUS_COLORS[invoice.status] || 'bg-gray-500/10'}
                  >
                    {STATUS_LABELS[invoice.status] || invoice.status}
                  </Badge>
                  {paymentGateway && (
                    <Badge variant="secondary" className="gap-1.5">
                      <CreditCard className="h-3 w-3" />
                      {paymentGateway === 'mercadopago' ? 'Mercado Pago' : 'Stripe'}
                    </Badge>
                  )}
                  <p className="text-lg font-bold text-primary">
                    {formatAmount(invoice.amount, invoice.currency)}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Fecha: {formatDate(invoice.created)}</p>
                  <p>Período: {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}</p>
                  <p>{invoice.description}</p>
                  {invoice.payment_method && (
                    <p className="capitalize">
                      Pagado con {invoice.payment_method.brand || invoice.payment_method.type}
                      {invoice.payment_method.last4 && ` ****${invoice.payment_method.last4}`}
                    </p>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewOnline(invoice.hosted_invoice_url)}
                disabled={!invoice.hosted_invoice_url}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Ver en línea
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
