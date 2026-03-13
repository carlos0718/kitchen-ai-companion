import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
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

  const uploadImage = useCallback(async (base64: string, mimeType: string): Promise<string | null> => {
    if (!userId) return null;
    const ext = mimeType.split('/')[1] || 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;
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

  const saveMessage = useCallback(async (role: 'user' | 'assistant', content: string, imageUrl?: string) => {
    if (!conversationId) return;
    try {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role,
        content,
        ...(imageUrl ? { image_url: imageUrl } : {}),
      });
      onMessageSaved?.();
    } catch (err) {
      console.error('Error saving message:', err);
    }
  }, [conversationId, onMessageSaved]);

  const sendMessage = useCallback(async (input: string, imageData?: { base64: string; mimeType: string }) => {
    if (!input.trim() && !imageData) return;

    // Upload image first if present
    let imageUrl: string | undefined;
    if (imageData) {
      const url = await uploadImage(imageData.base64, imageData.mimeType);
      if (url) imageUrl = url;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      imageUrl,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    await saveMessage('user', input, imageUrl);

    let assistantContent = '';

    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { id: crypto.randomUUID(), role: 'assistant', content: assistantContent }];
      });
    };

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-cocina`;

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: input,
            ...(imageData ? { imageData } : {}),
          }],
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
          user_id: userId,
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || 'Error en la solicitud');
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
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      if (assistantContent) {
        await saveMessage('assistant', assistantContent);
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

    setMessages(data.map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      imageUrl: m.image_url ?? undefined,
    })));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    loadMessages,
    clearMessages,
    setMessages,
  };
}
