import { cn } from '@/lib/utils';
import { ChefHat, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  imageUrls?: string[];
}

export function ChatMessage({ role, content, imageUrls }: ChatMessageProps) {
  const isAssistant = role === 'assistant';

  return (
    <div className={cn('flex gap-3 animate-fade-in', isAssistant ? 'items-start' : 'items-start flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm',
          isAssistant
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground'
        )}
      >
        {isAssistant ? <ChefHat className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>

      {/* Bubble */}
      <div className={cn('flex flex-col gap-1.5 max-w-[82%]', isAssistant ? 'items-start' : 'items-end')}>
        <span className="text-xs font-medium text-muted-foreground px-1">
          {isAssistant ? 'Chef AI' : 'Tú'}
        </span>

        <div
          className={cn(
            'rounded-2xl px-4 py-3 shadow-xs',
            isAssistant
              ? 'bg-card border border-border/50 rounded-tl-sm'
              : 'bg-primary text-primary-foreground rounded-tr-sm'
          )}
        >
          {/* Images */}
          {imageUrls && imageUrls.length > 0 && (
            <div className={cn('flex flex-wrap gap-2', content ? 'mb-3' : '')}>
              {imageUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Imagen adjunta ${i + 1}`}
                  className="max-h-52 w-auto rounded-xl border border-border/30 object-contain"
                />
              ))}
            </div>
          )}

          {/* Text content */}
          {content && (
            isAssistant ? (
              <div className="text-foreground font-serif">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h2 className="text-xl font-bold mt-5 mb-2 text-foreground tracking-tight font-sans border-b border-border/40 pb-1">
                        {children}
                      </h2>
                    ),
                    h2: ({ children }) => (
                      <h3 className="text-lg font-bold mt-4 mb-2 text-foreground tracking-tight font-sans">
                        {children}
                      </h3>
                    ),
                    h3: ({ children }) => (
                      <h4 className="text-sm font-semibold mt-3 mb-1.5 text-primary uppercase tracking-wide font-sans">
                        {children}
                      </h4>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-bold text-foreground">{children}</strong>
                    ),
                    ul: ({ children }) => (
                      <ul className="ml-2 space-y-1.5 my-2">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="ml-5 space-y-1.5 my-2 list-decimal list-outside">{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-[15px] leading-relaxed pl-1">{children}</li>
                    ),
                    p: ({ children }) => (
                      <p className="text-[15px] leading-relaxed mb-2.5 last:mb-0">{children}</p>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-muted-foreground italic">
                        {children}
                      </blockquote>
                    ),
                    hr: () => (
                      <hr className="my-3 border-border/40" />
                    ),
                    table: ({ children }) => (
                      <div className="my-3 w-full overflow-x-auto rounded-lg border border-border/50">
                        <table className="w-full text-sm border-collapse">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-muted/60 font-sans">
                        {children}
                      </thead>
                    ),
                    tbody: ({ children }) => (
                      <tbody className="divide-y divide-border/30">
                        {children}
                      </tbody>
                    ),
                    tr: ({ children }) => (
                      <tr className="transition-colors hover:bg-muted/30">
                        {children}
                      </tr>
                    ),
                    th: ({ children }) => (
                      <th className="px-3 py-2 text-left font-semibold text-foreground font-sans text-xs uppercase tracking-wide">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-3 py-2 text-[14px] text-foreground/90 leading-snug">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-[15px] leading-relaxed">{content}</p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
