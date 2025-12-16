import { Badge } from '@/components/ui/badge';
import { Zap, Crown } from 'lucide-react';

interface UsageBadgeProps {
  remaining: number;
  dailyLimit: number;
  isPremium: boolean;
  onClick?: () => void;
}

export function UsageBadge({ remaining, dailyLimit, isPremium, onClick }: UsageBadgeProps) {
  if (isPremium) {
    return (
      <Badge 
        variant="default" 
        className="cursor-pointer flex items-center gap-1"
        onClick={onClick}
      >
        <Crown className="h-3 w-3" />
        Premium
      </Badge>
    );
  }

  const isLow = remaining <= 3;
  const isEmpty = remaining === 0;

  return (
    <Badge 
      variant={isEmpty ? 'destructive' : isLow ? 'secondary' : 'outline'}
      className="cursor-pointer flex items-center gap-1"
      onClick={onClick}
    >
      <Zap className="h-3 w-3" />
      {remaining}/{dailyLimit} consultas
    </Badge>
  );
}
