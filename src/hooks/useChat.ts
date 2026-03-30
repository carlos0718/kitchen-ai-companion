import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AgentType = 'chef' | 'nutricionista' | 'compras' | 'planificador';
export type ImageData = { base64: string; mimeType: string };

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrls?: string[];
  agentType?: AgentType;
}

interface UseChatOptions {
  conversationId?: string;
  userId?: string;
  onMessageSaved?: () => void;
}

export function useChat({ conversationId, userId, onMessageSaved }: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAgentType, setCurrentAgentType] = useState<AgentType | null>(null);

  const uploadImage = useCallback(async (base64: string, mimeType: string): Promise<string | null> => {
    if (!userId) return null;
    const ext = mimeType.split('/')[1] || 'jpg';
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const byteString = atob(base64);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType });

    const { error } = await supabase.storage.from('chat-images').upload(path, blob, { contentType: mimeType });
    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }
    const { data } = supabase.storage.from('chat-images').getPublicUrl(path);
    return data.publicUrl;
  }, [userId]);

  const saveMessage = useCallback(async (role: 'user' | 'assistant', content: string, imageUrls?: string[], agentType?: AgentType | null) => {
    if (!conversationId) return;
    try {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role,
        content,
        ...(imageUrls?.length ? { image_url: JSON.stringify(imageUrls) } : {}),
        ...(agentType ? { agent_type: agentType } : {}),
      });
      onMessageSaved?.();
    } catch (err) {
      console.error('Error saving message:', err);
    }
  }, [conversationId, onMessageSaved]);

  const sendMessage = useCallback(async (input: string, images?: ImageData[]) => {
    if (!input.trim() && (!images || images.length === 0)) return;

    // Reset agent type for new message
    setCurrentAgentType(null);

    // Upload all images in parallel
    const imageUrls: string[] = [];
    if (images?.length) {
      const results = await Promise.all(images.map(img => uploadImage(img.base64, img.mimeType)));
      results.forEach(url => { if (url) imageUrls.push(url); });
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    await saveMessage('user', input, imageUrls.length > 0 ? imageUrls : undefined);

    let assistantContent = '';
    let detectedAgentType: AgentType | null = null;

    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) =>
            i === prev.length - 1
              ? { ...m, content: assistantContent, agentType: detectedAgentType ?? undefined }
              : m
          );
        }
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: assistantContent,
            agentType: detectedAgentType ?? undefined,
          },
        ];
      });
    };

    try {
      // Use agent-coordinator as primary endpoint
      const COORDINATOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-coordinator`;

      const resp = await fetch(COORDINATOR_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: input,
            ...(images?.length ? { images: images.map(({ base64, mimeType }) => ({ base64, mimeType })) } : {}),
          }],
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
          user_id: userId,
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || 'Error en la solicitud');
      }

      // Read agent type from response header (available immediately)
      const headerAgentType = resp.headers.get('X-Agent-Type') as AgentType | null;
      if (headerAgentType) {
        detectedAgentType = headerAgentType;
        setCurrentAgentType(headerAgentType);
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);

            // First event may be agent metadata
            if (parsed.agent_type && !detectedAgentType) {
              detectedAgentType = parsed.agent_type as AgentType;
              setCurrentAgentType(detectedAgentType);
              continue;
            }

            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      if (assistantContent) {
        await saveMessage('assistant', assistantContent, undefined, detectedAgentType);
      }

    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [messages, userId, saveMessage, uploadImage]);

  const loadMessages = useCallback(async (convId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data.map(m => {
      let imageUrls: string[] | undefined;
      if (m.image_url) {
        try {
          const parsed = JSON.parse(m.image_url);
          imageUrls = Array.isArray(parsed) ? parsed : [m.image_url];
        } catch {
          imageUrls = [m.image_url];
        }
      }
      return {
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        imageUrls,
        agentType: m.agent_type as AgentType | undefined,
      };
    }));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    error,
    currentAgentType,
    sendMessage,
    loadMessages,
    clearMessages,
    setMessages,
  };
}
