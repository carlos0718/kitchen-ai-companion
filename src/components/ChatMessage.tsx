import { cn } from '@/lib/utils';
import { ChefHat, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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
        <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-strong:font-semibold">
          <ReactMarkdown
            components={{
              // Renderizar títulos con estilo
              h1: ({ children }) => <h2 className="text-lg font-bold mt-4 mb-2 text-foreground">{children}</h2>,
              h2: ({ children }) => <h3 className="text-base font-bold mt-3 mb-2 text-foreground">{children}</h3>,
              h3: ({ children }) => <h4 className="text-sm font-bold mt-2 mb-1 text-foreground uppercase">{children}</h4>,
              // Negritas
              strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
              // Listas
              ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
              li: ({ children }) => <li className="text-sm">{children}</li>,
              // Párrafos
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
