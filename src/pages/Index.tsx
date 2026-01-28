import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AuthForm } from '@/components/AuthForm';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { DietsSection } from '@/components/landing/DietsSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { ChefHat } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user) {
        setCheckingProfile(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .single();

        if (error && error.code === 'PGRST116') {
          // Profile doesn't exist
          setShowOnboarding(true);
        } else if (profile && !profile.onboarding_completed) {
          // Profile exists but onboarding not completed
          setShowOnboarding(true);
        } else {
          // Profile exists and onboarding completed - redirect to chat
          navigate('/chat');
        }
      } catch (error) {
        console.error('Error checking profile:', error);
      } finally {
        setCheckingProfile(false);
      }
    };

    checkUserProfile();
  }, [user, navigate]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    navigate('/chat');
  };

  if (loading || checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Scroll handlers
  const scrollToAuth = () => {
    const authElement = document.getElementById('auth');
    authElement?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToFeatures = () => {
    const featuresElement = document.getElementById('features');
    featuresElement?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        {/* Navbar */}
        <LandingNavbar />

        {/* Landing Page */}
        <section id="hero">
          <LandingHero onGetStarted={scrollToAuth} onViewFeatures={scrollToFeatures} />
        </section>

        <section id="features">
          <FeaturesSection />
        </section>

        <section id="diets">
          <DietsSection />
        </section>

        <section id="faq">
          <FAQSection />
        </section>

        <section id="pricing" className="py-24 px-4 bg-background">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Planes y Precios</h2>
            <p className="text-muted-foreground mb-12">Elige el plan que mejor se adapte a tus necesidades</p>
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Free Plan */}
              <div className="p-8 border border-border rounded-lg bg-card">
                <h3 className="text-2xl font-bold mb-2">Plan Gratuito</h3>
                <p className="text-4xl font-bold text-primary mb-4">$0<span className="text-lg text-muted-foreground">/semana</span></p>
                <ul className="text-left space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>15 consultas gratis por semana</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Recetas personalizadas básicas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Seguimiento nutricional</span>
                  </li>
                </ul>
              </div>

              {/* Weekly Plan */}
              <div className="p-8 border-2 border-primary rounded-lg bg-card shadow-lg relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  Más Popular
                </div>
                <h3 className="text-2xl font-bold mb-2">Plan Semanal</h3>
                <p className="text-4xl font-bold text-primary mb-4">$4.99<span className="text-lg text-muted-foreground">/semana</span></p>
                <ul className="text-left space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span><strong>Consultas ilimitadas</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Planificación de comidas avanzada</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Recetas premium personalizadas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Soporte prioritario</span>
                  </li>
                </ul>
              </div>

              {/* Monthly Plan */}
              <div className="p-8 border border-border rounded-lg bg-card">
                <div className="inline-block bg-accent/20 text-accent-foreground px-3 py-1 rounded-full text-xs font-medium mb-2">
                  Mejor Valor
                </div>
                <h3 className="text-2xl font-bold mb-2">Plan Mensual</h3>
                <p className="text-4xl font-bold text-primary mb-4">$14.99<span className="text-lg text-muted-foreground">/mes</span></p>
                <ul className="text-left space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span><strong>Consultas ilimitadas</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Planificación de comidas avanzada</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Recetas premium personalizadas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Soporte prioritario</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span className="text-sm text-muted-foreground">Ahorra $5 al mes</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Auth Section */}
        <section id="auth" className="min-h-screen py-24 px-4 bg-background flex items-center justify-center">
          <div className="w-full max-w-md">
            <AuthForm />
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border bg-card py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Logo & Brand */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <ChefHat className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-serif font-bold text-lg text-foreground">Chef AI</p>
                  <p className="text-sm text-muted-foreground">Tu asistente culinario con IA</p>
                </div>
              </div>

              {/* Copyright */}
              <div className="text-center md:text-right text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} Chef AI. Todos los derechos reservados.</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-background">
        <OnboardingWizard user={user} onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  // If user has completed onboarding, they'll be redirected via useEffect
  return null;
};

export default Index;
