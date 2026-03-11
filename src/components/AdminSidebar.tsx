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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Usuarios', icon: Users },
  { to: '/admin/tickets', label: 'Soporte', icon: TicketCheck },
  { to: '/admin/suggestions', label: 'Sugerencias', icon: Lightbulb },
];

export function AdminSidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    clearAdminSession();
    await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r flex flex-col z-40">
      {/* Header */}
      <div className="p-5 border-b">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            <ChefHat className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm leading-none">Kitchen AI</p>
            <p className="text-xs text-muted-foreground mt-0.5">Panel Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
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
  );
}
