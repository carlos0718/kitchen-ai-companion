import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, HelpCircle } from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  display_order: number;
}

const categoryLabels: Record<string, string> = {
  general: 'General',
  features: 'Funcionalidades',
  subscription: 'Suscripciones',
  meal_planning: 'Planificación',
};

export function FAQSection() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;

      setFaqs(data || []);
    } catch (err: any) {
      console.error('Error loading FAQs:', err);
      setError('No se pudieron cargar las preguntas frecuentes');
    } finally {
      setLoading(false);
    }
  };

  const getFAQsByCategory = (category: string) => {
    return faqs.filter((faq) => faq.category === category);
  };

  const categories = Object.keys(categoryLabels);

  return (
    <section id="faqs" className="py-24 px-4 bg-accent/5">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground">
            Preguntas Frecuentes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Todo lo que necesitas saber sobre Chef AI
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* FAQs Content */}
        {!loading && !error && faqs.length > 0 && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-8">
              {categories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="text-sm"
                >
                  {categoryLabels[category]}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((category) => {
              const categoryFAQs = getFAQsByCategory(category);

              return (
                <TabsContent key={category} value={category} className="mt-0">
                  {categoryFAQs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No hay preguntas en esta categoría
                    </div>
                  ) : (
                    <Accordion type="single" collapsible className="w-full space-y-4">
                      {categoryFAQs.map((faq) => (
                        <AccordionItem
                          key={faq.id}
                          value={faq.id}
                          className="border border-border bg-card rounded-lg px-6 shadow-sm"
                        >
                          <AccordionTrigger className="text-left hover:no-underline py-6">
                            <span className="font-semibold text-foreground pr-4">
                              {faq.question}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        )}

        {/* Empty State */}
        {!loading && !error && faqs.length === 0 && (
          <div className="text-center py-12">
            <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Las preguntas frecuentes estarán disponibles próximamente
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
