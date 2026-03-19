import { ChefHat, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState, useEffect } from 'react';

export function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80; // Navbar height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-primary shadow-lg'
          : 'bg-primary/95 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => scrollToSection('hero')}
            className="flex items-center gap-2 text-primary-foreground hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-primary-foreground/10 rounded-lg flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-serif font-bold text-lg hidden sm:block">Chef AI</span>
          </button>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            <Button
              variant="ghost"
              onClick={() => scrollToSection('hero')}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              Inicio
            </Button>
            <Button
              variant="ghost"
              onClick={() => scrollToSection('features')}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              Características
            </Button>
            <Button
              variant="ghost"
              onClick={() => scrollToSection('faq')}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              FAQ
            </Button>
            <Button
              variant="ghost"
              onClick={() => scrollToSection('pricing')}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              Precios
            </Button>
          </div>

          {/* Mobile hamburger */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-primary-foreground hover:bg-primary-foreground/10"
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 pt-12">
              <nav className="flex flex-col gap-1">
                {[
                  { label: 'Inicio', id: 'hero' },
                  { label: 'Características', id: 'features' },
                  { label: 'FAQ', id: 'faq' },
                  { label: 'Precios', id: 'pricing' },
                ].map(({ label, id }) => (
                  <Button
                    key={id}
                    variant="ghost"
                    className="justify-start text-base h-11"
                    onClick={() => scrollToSection(id)}
                  >
                    {label}
                  </Button>
                ))}
                <div className="mt-4 pt-4 border-t">
                  <Button
                    className="w-full"
                    onClick={() => scrollToSection('auth')}
                  >
                    Comenzar Gratis
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>

          {/* CTA Button — desktop only */}
          <Button
            onClick={() => scrollToSection('auth')}
            variant="secondary"
            className="hidden md:flex shadow-md hover:shadow-lg transition-shadow"
          >
            Comenzar Gratis
          </Button>
        </div>
      </div>
    </nav>
  );
}
