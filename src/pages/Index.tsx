import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AuthForm } from '@/components/AuthForm';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { LandingHero } from '@/components/landing/LandingHero';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
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
        {/* Landing Page */}
        <LandingHero onGetStarted={scrollToAuth} onViewFeatures={scrollToFeatures} />
        <FeaturesSection />
        <FAQSection />

        {/* Auth Section */}
        <section id="auth" className="py-24 px-4 bg-background">
          <div className="max-w-md mx-auto">
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
