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
import { ChefHat, Sparkles, UtensilsCrossed, Activity, ShoppingCart, CalendarDays } from 'lucide-react';
import type { AgentType } from '@/hooks/useChat';
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
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(() => {
    // Recuperar conversationId de localStorage al montar
    return localStorage.getItem(`chat_conversation_${userId}`) || null;
  });
  const [showSubscription, setShowSubscription] = useState(false);
  const { messages, isLoading, error, currentAgentType, sendMessage, loadMessages, clearMessages } = useChat({
    conversationId: currentConversationId || undefined,
    userId: userId,
  });

  const AGENT_BADGE: Record<AgentType, { label: string; color: string; icon: React.ElementType }> = {
    chef:          { label: 'Chef',          color: 'bg-orange-100 text-orange-700 border-orange-200', icon: UtensilsCrossed },
    nutricionista: { label: 'Nutricionista', color: 'bg-green-100 text-green-700 border-green-200',   icon: Activity },
    compras:       { label: 'Compras',       color: 'bg-blue-100 text-blue-700 border-blue-200',      icon: ShoppingCart },
    planificador:  { label: 'Planificador',  color: 'bg-purple-100 text-purple-700 border-purple-200', icon: CalendarDays },
  };
  const { plan, subscribed, createCheckout, openCustomerPortal, checkSubscription } = useSubscription();
  const { remaining, weeklyLimit, canQuery, incrementUsage, checkUsage } = useUsage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Cargar la última conversación del usuario al montar
  useEffect(() => {
    const loadLastConversation = async () => {
      // Si ya hay una conversación guardada, cargar sus mensajes
      if (currentConversationId) {
        await loadMessages(currentConversationId);
        return;
      }

      // Si no, buscar la última conversación del usuario
      const { data: lastConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (lastConversation) {
        setCurrentConversationId(lastConversation.id);
        localStorage.setItem(`chat_conversation_${userId}`, lastConversation.id);
        await loadMessages(lastConversation.id);
      }
    };

    loadLastConversation();
  }, [userId]);

  // Guardar conversationId en localStorage cuando cambie
  useEffect(() => {
    if (currentConversationId) {
      localStorage.setItem(`chat_conversation_${userId}`, currentConversationId);
    }
  }, [currentConversationId, userId]);

  // Check for success/canceled URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast({
        title: '¡Suscripción exitosa!',
        description: 'Ahora tienes acceso a consultas ilimitadas',
        variant: 'success',
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

  const handleSendMessage = async (input: string, images?: { base64: string; mimeType: string; preview: string }[]) => {
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
      const title = (input || 'Imagen').slice(0, 50) + ((input || 'Imagen').length > 50 ? '...' : '');
      await supabase
        .from('conversations')
        .update({ title })
        .eq('id', convId);
    }

    // Increment usage for free users
    if (!subscribed) {
      await incrementUsage();
    }

    sendMessage(input, images);
  };

  return (
    <div className="chat-playground-container">
      <div className="chat-content-area">
        {/* Header */}
        <header className="chat-header flex items-center justify-between p-4 border-b border-border/50 bg-card/90 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-xl font-semibold">Chef AI</h1>
                {currentAgentType && AGENT_BADGE[currentAgentType] && (() => {
                  const badge = AGENT_BADGE[currentAgentType];
                  const Icon = badge.icon;
                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${badge.color}`}>
                      <Icon className="h-3 w-3" />
                      {badge.label}
                    </span>
                  );
                })()}
              </div>
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
          <div className="max-w-5xl mx-auto p-4 space-y-4 pb-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 bg-primary/10 ring-1 ring-primary/20 rounded-full flex items-center justify-center mb-6">
                  <Sparkles className="h-10 w-10 text-primary" />
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
                      className="text-sm border-primary/30 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-colors"
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
                  imageUrls={message.imageUrls}
                />
              ))
            )}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-3 p-4 rounded-lg bg-card border border-border/40">
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
          <ChatInput onSend={(msg, imgs) => handleSendMessage(msg, imgs)} isLoading={isLoading} />
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
