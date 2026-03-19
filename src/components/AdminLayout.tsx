import { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { Menu } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-card border-b h-14 flex items-center px-4 gap-3">
        <button
          type="button"
          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-semibold text-sm">Panel Admin</span>
      </div>

      <main className="md:ml-64 min-h-screen">
        {/* Extra top padding on mobile for the fixed top bar */}
        <div className="pt-14 md:pt-0 p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
