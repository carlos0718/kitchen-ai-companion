-- Create FAQs table
CREATE TABLE public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('general', 'features', 'subscription', 'meal_planning')),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (read-only for all users, including anonymous)
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active FAQs (including anonymous users)
CREATE POLICY "Anyone can view active FAQs"
  ON public.faqs FOR SELECT
  USING (is_active = true);

-- Create indexes for faster queries
CREATE INDEX idx_faqs_category_order ON public.faqs(category, display_order);
CREATE INDEX idx_faqs_active ON public.faqs(is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial FAQs data
INSERT INTO public.faqs (question, answer, category, display_order) VALUES
  -- General Usage FAQs
  (
    '¿Qué es Chef AI?',
    'Chef AI es tu asistente culinario personal que te ayuda a planificar comidas, generar recetas personalizadas y mantener una dieta equilibrada según tus objetivos y preferencias. Utiliza inteligencia artificial avanzada para crear planes de comidas adaptados a tus necesidades nutricionales.',
    'general',
    1
  ),
  (
    '¿Necesito crear una cuenta?',
    'Sí, necesitas crear una cuenta gratuita para guardar tus preferencias, historial de conversaciones y planes de comidas. El registro es rápido y solo requiere un email y contraseña.',
    'general',
    2
  ),
  (
    '¿Cómo funciona el chat?',
    'Nuestro chat utiliza inteligencia artificial avanzada para responder preguntas sobre cocina, sugerir recetas y ayudarte con tu nutrición. Simplemente escribe tu consulta y el asistente responderá de forma personalizada basándose en tus preferencias y objetivos.',
    'general',
    3
  ),
  (
    '¿Puedo usar Chef AI en mi teléfono móvil?',
    'Sí, Chef AI es totalmente responsive y funciona perfectamente en dispositivos móviles, tablets y computadoras. Puedes acceder desde cualquier navegador web moderno.',
    'general',
    4
  ),

  -- Features FAQs
  (
    '¿Qué es el planificador de comidas?',
    'El planificador de comidas te permite generar planes semanales completos con IA, adaptados a tus objetivos nutricionales, preferencias dietéticas y restricciones. Puedes generar semanas completas o días individuales según tus necesidades.',
    'features',
    1
  ),
  (
    '¿Puedo personalizar las recetas?',
    'Sí, puedes reemplazar cualquier comida con preferencias específicas. Solo haz clic en el botón de reemplazar y especifica qué tipo de comida prefieres (por ejemplo, "algo más ligero", "con más proteína", "sin gluten", etc.).',
    'features',
    2
  ),
  (
    '¿Las recetas consideran mis alergias?',
    'Absolutamente. Durante el proceso de onboarding, configuras tus alergias, restricciones dietéticas y preferencias. Todas las recetas generadas respetan estas configuraciones automáticamente para garantizar tu seguridad y bienestar.',
    'features',
    3
  ),
  (
    '¿Puedo ajustar las porciones?',
    'Sí, puedes configurar el tamaño de tu hogar durante el onboarding, y todas las recetas se ajustarán automáticamente al número de personas. Esto asegura que siempre tengas las cantidades correctas de ingredientes.',
    'features',
    4
  ),
  (
    '¿Qué información nutricional incluyen las recetas?',
    'Cada receta incluye información nutricional completa: calorías, proteínas, carbohidratos, grasas y fibra. También se muestra el tiempo de preparación, dificultad y número de porciones.',
    'features',
    5
  ),

  -- Meal Planning FAQs
  (
    '¿Puedo generar planes de comidas sin suscripción?',
    'No. El planificador de comidas requiere al menos una suscripción semanal para funcionar. Los usuarios con plan gratuito tienen acceso ilimitado al chat con 15 consultas por semana, pero necesitan suscribirse para usar el planificador.',
    'meal_planning',
    1
  ),
  (
    '¿Cuántas veces puedo generar planes semanales?',
    'Los usuarios con suscripción semanal pueden generar planes para los próximos 7 días desde el inicio de su período de suscripción. Los usuarios con suscripción mensual pueden planificar hasta 30 días adelante. Puedes regenerar y reemplazar comidas ilimitadamente dentro de este rango.',
    'meal_planning',
    2
  ),
  (
    '¿Qué pasa si mi suscripción expira?',
    'Si tu suscripción expira, conservarás acceso de solo lectura a tus planes existentes, pero no podrás generar nuevos planes ni reemplazar comidas hasta que renueves tu suscripción. Tus datos y preferencias se mantienen guardados.',
    'meal_planning',
    3
  ),
  (
    '¿Puedo generar solo un día en lugar de una semana completa?',
    'Sí, además de generar semanas completas, puedes generar planes para un solo día usando el botón "Generar Hoy". Esto es útil cuando solo necesitas planificar un día específico o completar días faltantes en tu semana.',
    'meal_planning',
    4
  ),
  (
    '¿Cómo funciona el modo flexible de dieta?',
    'El modo flexible permite al algoritmo ser más creativo con ingredientes similares y sustituciones, ofreciendo mayor variedad. El modo estricto sigue exactamente tus restricciones sin excepciones. Puedes cambiar entre modos en tu perfil según tus necesidades.',
    'meal_planning',
    5
  ),

  -- Subscription FAQs
  (
    '¿Cuáles son los planes disponibles?',
    'Ofrecemos tres planes: Plan Gratis ($0 - 15 consultas de chat por semana, sin planificador), Plan Semanal ($4.99/semana - consultas ilimitadas + planificador para 7 días), y Plan Mensual ($14.99/mes - consultas ilimitadas + planificador para 30 días, ahorra 25%).',
    'subscription',
    1
  ),
  (
    '¿Puedo cancelar mi suscripción?',
    'Sí, puedes cancelar en cualquier momento desde el portal de cliente accediendo a "Gestionar suscripción" en tu perfil. Mantendrás acceso completo hasta el final de tu período de facturación actual.',
    'subscription',
    2
  ),
  (
    '¿Cómo actualizo mi método de pago?',
    'Puedes gestionar tu método de pago desde el portal de cliente de Stripe, accesible haciendo clic en "Gestionar" en la sección de suscripción de tu perfil. Allí también puedes ver tu historial de facturas.',
    'subscription',
    3
  ),
  (
    '¿Hay un período de prueba?',
    'Actualmente no ofrecemos período de prueba formal, pero el plan gratuito te permite probar el chat con 15 consultas semanales para conocer la calidad de nuestro asistente antes de suscribirte.',
    'subscription',
    4
  ),
  (
    '¿Puedo cambiar de plan mensual a semanal?',
    'Sí, puedes cambiar entre planes en cualquier momento desde el portal de cliente. Los cambios se aplican al inicio de tu próximo período de facturación. Si tienes dudas, contacta nuestro soporte.',
    'subscription',
    5
  ),
  (
    '¿Aceptan métodos de pago internacionales?',
    'Sí, aceptamos tarjetas de crédito y débito de todo el mundo a través de Stripe, nuestro procesador de pagos seguro. Stripe soporta la mayoría de las tarjetas Visa, Mastercard, American Express y más.',
    'subscription',
    6
  );

-- Add comment for documentation
COMMENT ON TABLE public.faqs IS 'Stores frequently asked questions displayed on the landing page';
