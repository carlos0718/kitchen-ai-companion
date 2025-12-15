import { cn } from '@/lib/utils';
import { ChefHat, User } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isAssistant = role === 'assistant';

  return (
    <div
      className={cn(
        'flex gap-3 p-4 rounded-lg',
        isAssistant ? 'bg-accent/50' : 'bg-card'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isAssistant ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
        )}
      >
        {isAssistant ? <ChefHat className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-sm font-medium">
          {isAssistant ? 'Chef AI' : 'Tú'}
        </p>
        <div className="prose prose-sm max-w-none text-foreground">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    </div>
  );
}
