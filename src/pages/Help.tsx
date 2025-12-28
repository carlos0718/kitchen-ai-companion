import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SupportForm } from '@/components/SupportForm';
import { SuggestionsForm } from '@/components/SuggestionsForm';
import { SupportTicketsList } from '@/components/SupportTicketsList';
import { SuggestionsList } from '@/components/SuggestionsList';
import { FAQSection } from '@/components/landing/FAQSection';
import { HelpCircle, Lightbulb, MessageCircle } from 'lucide-react';

export function Help() {
  const [activeTab, setActiveTab] = useState('faqs');

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold mb-2">Centro de Ayuda</h1>
          <p className="text-muted-foreground">
            ¿Tienes alguna pregunta o sugerencia? Estamos aquí para ayudarte.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="faqs" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              FAQs
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              Soporte
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              Sugerencias
            </TabsTrigger>
          </TabsList>

          {/* FAQs Tab */}
          <TabsContent value="faqs">
            <FAQSection />
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>¿Necesitas ayuda?</CardTitle>
                <CardDescription>
                  Describe tu problema o consulta y te responderemos lo antes posible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SupportForm />
              </CardContent>
            </Card>

            {/* Previous Support Tickets */}
            <Card>
              <CardHeader>
                <CardTitle>Mis consultas anteriores</CardTitle>
                <CardDescription>
                  Revisa el estado de tus consultas de soporte.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SupportTicketsList />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Comparte tus ideas</CardTitle>
                <CardDescription>
                  ¿Tienes alguna sugerencia para mejorar Kitchen AI? Nos encantaría escucharla.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SuggestionsForm />
              </CardContent>
            </Card>

            {/* Previous Suggestions */}
            <Card>
              <CardHeader>
                <CardTitle>Mis sugerencias anteriores</CardTitle>
                <CardDescription>
                  Revisa el estado de tus sugerencias enviadas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SuggestionsList />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default Help;
