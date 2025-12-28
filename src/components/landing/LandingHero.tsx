import { ChefHat, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LandingHeroProps {
  onGetStarted: () => void;
  onViewFeatures: () => void;
}

export function LandingHero({ onGetStarted, onViewFeatures }: LandingHeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-accent/10 px-4 py-20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto text-center space-y-8">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl shadow-lg mb-4">
          <ChefHat className="h-10 w-10 text-primary-foreground" />
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-serif font-bold text-foreground tracking-tight">
          Tu Asistente Culinario{' '}
          <span className="text-primary inline-flex items-center gap-2">
            con IA
            <Sparkles className="h-10 w-10 md:h-14 md:w-14 text-primary animate-pulse" />
          </span>
        </h1>

        {/* Description */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Planifica tus comidas, genera recetas personalizadas y mantén una dieta equilibrada según tus objetivos.
          Chef AI utiliza inteligencia artificial avanzada para adaptarse a tus necesidades nutricionales.
        </p>

        {/* Free Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/20 border border-accent rounded-full text-sm font-medium text-accent-foreground">
          <Sparkles className="h-4 w-4" />
          15 consultas gratis por semana
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button
            size="lg"
            onClick={onGetStarted}
            className="w-full sm:w-auto text-base px-8 py-6 shadow-lg hover:shadow-xl transition-all"
          >
            Comenzar Gratis
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={onViewFeatures}
            className="w-full sm:w-auto text-base px-8 py-6"
          >
            Ver Características
          </Button>
        </div>

        {/* Trust Badge */}
        <p className="text-sm text-muted-foreground pt-8">
          ✓ Sin tarjeta de crédito requerida · ✓ Cancela cuando quieras
        </p>
      </div>
    </section>
  );
}
