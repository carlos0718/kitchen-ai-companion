import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { useSubscription } from '@/hooks/useSubscription';
import { useUsage } from '@/hooks/useUsage';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { SubscriptionModal } from './SubscriptionModal';
import { UsageBadge } from './UsageBadge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ChefHat, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import './ChatPlayground.css';

interface ChatPlaygroundProps {
  userId: string;
}

const SUGGESTIONS = [
  '💪 Quiero ganar masa muscular',
  '🥗 Busco recetas vegetarianas saludables',
  '⚖️ Necesito bajar de peso',
  '🏃 Dieta alta en proteínas',
  '🍝 Solo quiero algo rápido hoy',
];

export function ChatPlayground({ userId }: ChatPlaygroundProps) {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showSubscription, setShowSubscription] = useState(false);
  const { messages, isLoading, error, sendMessage, loadMessages, clearMessages } = useChat({
    conversationId: currentConversationId || undefined,
    userId: userId,
  });
  const { plan, subscribed, createCheckout, openCustomerPortal, checkSubscription } = useSubscription();
  const { remaining, weeklyLimit, canQuery, incrementUsage, checkUsage } = useUsage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Check for success/canceled URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast({
        title: '¡Suscripción exitosa!',
        description: 'Ahora tienes acceso a consultas ilimitadas',
      });
      checkSubscription();
      window.history.replaceState({}, '', '/');
    }
    if (params.get('canceled') === 'true') {
      toast({
        title: 'Suscripción cancelada',
        description: 'Puedes intentarlo de nuevo cuando quieras',
        variant: 'destructive',
      });
      window.history.replaceState({}, '', '/');
    }
  }, [toast, checkSubscription]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  const createNewConversation = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: userId })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return null;
    }

    return data.id;
  };

  const handleSendMessage = async (input: string) => {
    // Check usage limit for free users
    if (!subscribed && !canQuery) {
      toast({
        title: 'Límite alcanzado',
        description: 'Has alcanzado el límite de consultas diarias. Suscríbete para consultas ilimitadas.',
        variant: 'destructive',
      });
      setShowSubscription(true);
      return;
    }

    let convId = currentConversationId;
    
    if (!convId) {
      convId = await createNewConversation();
      if (!convId) return;
      setCurrentConversationId(convId);
    }

    // Update conversation title with first message
    if (messages.length === 0) {
      const title = input.slice(0, 50) + (input.length > 50 ? '...' : '');
      await supabase
        .from('conversations')
        .update({ title })
        .eq('id', convId);
    }

    // Increment usage for free users
    if (!subscribed) {
      await incrementUsage();
    }

    sendMessage(input);
  };

  return (
    <div className="chat-playground-container">
      <div className="chat-content-area">
        {/* Header */}
        <header className="chat-header flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-semibold">Chef AI</h1>
              <p className="text-xs text-muted-foreground">Tu asistente de cocina casera</p>
            </div>
          </div>
          <UsageBadge
            remaining={remaining}
            weeklyLimit={weeklyLimit}
            isPremium={subscribed}
            onClick={() => setShowSubscription(true)}
          />
        </header>

        {/* Messages */}
        <div className="chat-messages-area" ref={scrollRef}>
          <div className="max-w-3xl mx-auto p-4 space-y-4 pb-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mb-6">
                  <Sparkles className="h-10 w-10 text-accent-foreground" />
                </div>
                <h2 className="text-2xl font-serif font-semibold mb-2">
                  ¡Bienvenido a Chef AI!
                </h2>
                <p className="text-muted-foreground mb-8 max-w-md">
                  Cuéntame tu objetivo: ¿quieres seguir una dieta específica, ganar músculo, bajar de peso, o simplemente preparar algo rico?
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      onClick={() => handleSendMessage(suggestion)}
                      className="text-sm"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                />
              ))
            )}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-3 p-4 rounded-lg bg-accent/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <ChefHat className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="chat-input-area">
          <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
        </div>
      </div>

      <SubscriptionModal
        open={showSubscription}
        onOpenChange={setShowSubscription}
        currentPlan={plan}
        onSubscribe={createCheckout}
        onManage={openCustomerPortal}
      />
    </div>
  );
}
