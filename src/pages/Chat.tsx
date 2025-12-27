import { useEffect, useState } from 'react';
import { ChatPlayground } from '@/components/ChatPlayground';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export function Chat() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
      setLoading(false);
    };

    getUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Error: Usuario no encontrado</p>
      </div>
    );
  }

  return <ChatPlayground userId={userId} />;
}

export default Chat;
