import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X, Calendar, BookOpen, User, LogOut, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

const navItems = [
  { path: '/chat', label: 'Chat', icon: MessageSquare },
  { path: '/planner', label: 'Planificador', icon: Calendar },
  { path: '/diet-guide', label: 'Guía de Dietas', icon: BookOpen },
];

const profileSubItems = [
  { path: '/profile/personal', label: 'Información Personal' },
  { path: '/profile/diet', label: 'Dieta' },
  { path: '/profile/nutrition', label: 'Objetivos' },
  { path: '/profile/preferences', label: 'Preferencias' },
];

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error al cerrar sesión');
    } else {
      navigate('/');
      toast.success('Sesión cerrada');
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile toggle - Only show when closed */}
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden"
          onClick={() => setIsOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-72 bg-card border-r border-border transform transition-transform md:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header with close button */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">🍳</span>
              </div>
              <div>
                <h2 className="font-serif text-lg font-semibold">Kitchen AI</h2>
                <p className="text-xs text-muted-foreground">Menú de navegación</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation items */}
          <div className="flex-1 p-3">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? 'default' : 'ghost'}
                    className="w-full justify-start gap-3"
                    onClick={() => handleNavigate(item.path)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}

              {/* Profile with submenu */}
              <div>
                <Button
                  variant={location.pathname.startsWith('/profile') ? 'default' : 'ghost'}
                  className="w-full justify-start gap-3"
                  onClick={() => setProfileExpanded(!profileExpanded)}
                >
                  <User className="h-4 w-4" />
                  Mi Perfil
                  {profileExpanded ? (
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  ) : (
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  )}
                </Button>
                {profileExpanded && (
                  <div className="ml-7 mt-1 space-y-1">
                    {profileSubItems.map((subItem) => {
                      const isActive = location.pathname === subItem.path;
                      return (
                        <Button
                          key={subItem.path}
                          variant={isActive ? 'secondary' : 'ghost'}
                          className="w-full justify-start text-sm"
                          onClick={() => handleNavigate(subItem.path)}
                        >
                          {subItem.label}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer with logout */}
          <div className="border-t border-border p-3">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
