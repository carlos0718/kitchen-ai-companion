import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, Calendar, User, LogOut, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const navItems = [
  { path: '/chat', label: 'Chat', icon: MessageSquare },
  { path: '/planner', label: 'Planificador', icon: Calendar },
  { path: '/diet-guide', label: 'Guía de Dietas', icon: BookOpen },
  { path: '/profile', label: 'Perfil', icon: User },
];

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error al cerrar sesión');
    } else {
      navigate('/');
      toast.success('Sesión cerrada');
    }
  };

  return (
    <>
      {/* Desktop Navigation - Horizontal Tabs */}
      <nav className="hidden md:block border-b bg-background sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">🍳</span>
              </div>
              <span className="font-serif font-bold text-xl">Kitchen AI</span>
            </div>

            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>

            <Button variant="ghost" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          </div>
        </div>
      </nav>

    </>
  );
}
