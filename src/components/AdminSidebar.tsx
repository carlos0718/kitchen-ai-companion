import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { clearAdminSession } from '@/lib/adminAuth';
import {
  LayoutDashboard,
  Users,
  TicketCheck,
  Lightbulb,
  LogOut,
  ChefHat,
  ExternalLink,
  Megaphone,
  Ticket,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Usuarios', icon: Users },
  { to: '/admin/tickets', label: 'Soporte', icon: TicketCheck },
  { to: '/admin/suggestions', label: 'Sugerencias', icon: Lightbulb },
  { to: '/admin/announcements', label: 'Anuncios', icon: Megaphone },
  { to: '/admin/promo-codes', label: 'Cupones', icon: Ticket },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    clearAdminSession();
    await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-card border-r flex flex-col z-40 transition-transform duration-300',
          // On mobile: slide in/out; on md+ always visible
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <ChefHat className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-none">Kitchen AI</p>
              <p className="text-xs text-muted-foreground mt-0.5">Panel Admin</p>
            </div>
          </div>
          {/* Close button — only on mobile */}
          <button
            type="button"
            className="md:hidden p-1 rounded hover:bg-accent transition-colors"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t space-y-1">
          <a
            href="/chat"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Ir a la app
          </a>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>
    </>
  );
}
