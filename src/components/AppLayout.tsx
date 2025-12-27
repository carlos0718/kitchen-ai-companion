import { Navigation } from './Navigation';
import { MobileSidebar } from './MobileSidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <MobileSidebar />
      <main>
        {children}
      </main>
    </div>
  );
}
