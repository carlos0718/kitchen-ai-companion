import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { useSubscription } from '@/hooks/useSubscription';
import { useUsage } from '@/hooks/useUsage';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ConversationSidebar } from './ConversationSidebar';
import { SubscriptionModal } from './SubscriptionModal';
import { UsageBadge } from './UsageBadge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ChefHat, LogOut, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatPlaygroundProps {
  userId: string;
}

const SUGGESTIONS = [
  '🥚 Tengo huevos, arroz y verduras',
  '🍗 Quiero hacer algo con pollo',
  '🥗 Una ensalada fácil y nutritiva',
  '🍝 Pasta rápida para la cena',
];

export function ChatPlayground({ userId }: ChatPlaygroundProps) {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showSubscription, setShowSubscription] = useState(false);
  const { messages, isLoading, error, sendMessage, loadMessages, clearMessages } = useChat({
    conversationId: currentConversationId || undefined,
  });
  const { plan, subscribed, createCheckout, openCustomerPortal, checkSubscription } = useSubscription();
  const { remaining, dailyLimit, canQuery, incrementUsage, checkUsage } = useUsage();
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

  const handleSelectConversation = async (id: string) => {
    setCurrentConversationId(id);
    await loadMessages(id);
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    clearMessages();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex h-screen bg-background">
      <ConversationSidebar
        userId={userId}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3 ml-12 md:ml-0">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-semibold">Chef AI</h1>
              <p className="text-xs text-muted-foreground">Tu asistente de cocina casera</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <UsageBadge
              remaining={remaining}
              dailyLimit={dailyLimit}
              isPremium={subscribed}
              onClick={() => setShowSubscription(true)}
            />
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="max-w-3xl mx-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mb-6">
                  <Sparkles className="h-10 w-10 text-accent-foreground" />
                </div>
                <h2 className="text-2xl font-serif font-semibold mb-2">
                  ¿Qué cocinamos hoy?
                </h2>
                <p className="text-muted-foreground mb-8 max-w-md">
                  Cuéntame qué ingredientes tienes en casa y te sugeriré recetas deliciosas
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
        </ScrollArea>

        {/* Input */}
        <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
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
