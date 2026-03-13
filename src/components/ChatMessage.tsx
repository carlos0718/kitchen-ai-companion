import { cn } from '@/lib/utils';
import { ChefHat, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
}

export function ChatMessage({ role, content, imageUrl }: ChatMessageProps) {
  const isAssistant = role === 'assistant';

  return (
    <div
      className={cn(
        'flex gap-3 p-4 rounded-lg',
        isAssistant ? 'bg-transparent border border-border/40' : 'bg-card'
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
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Imagen adjunta"
            className="max-h-48 w-auto rounded-lg border border-border object-contain"
          />
        )}
        {content && (
          <div className={cn(
            'max-w-none text-foreground',
            isAssistant ? 'font-serif' : ''
          )}>
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h2 className="text-xl font-bold mt-5 mb-1 text-foreground tracking-tight">
                    {children}
                  </h2>
                ),
                h2: ({ children }) => (
                  <h3 className="text-lg font-bold mt-4 mb-1 text-foreground tracking-tight">
                    {children}
                  </h3>
                ),
                h3: ({ children }) => (
                  <h4 className="text-base font-bold mt-3 mb-1 text-foreground uppercase tracking-wide">
                    {children}
                  </h4>
                ),
                strong: ({ children }) => (
                  <strong className="font-bold text-foreground">{children}</strong>
                ),
                ul: ({ children }) => (
                  <ul className="ml-4 space-y-1.5 my-2">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="ml-4 space-y-1.5 my-2 list-decimal list-outside">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="text-base leading-relaxed">{children}</li>
                ),
                p: ({ children }) => (
                  <p className="text-base leading-relaxed ml-4 mb-2 last:mb-0">{children}</p>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
