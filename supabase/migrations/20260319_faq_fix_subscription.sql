-- Fix subscription FAQs: remove Stripe references, correct prices (ARS), Argentina-only, promo codes
-- Uses UPDATE by question text to avoid duplicates

-- 1. Correct pricing: was USD ($4.99/$14.99), real prices are ARS $7.500/$25.000 via MercadoPago (Argentina only)
UPDATE public.faqs
SET
  answer = 'Ofrecemos tres planes: Plan Gratis ($0 - 15 consultas de chat por semana, sin planificador), Plan Semanal ($7.500 ARS/semana - consultas ilimitadas + planificador) y Plan Mensual ($25.000 ARS/mes - consultas ilimitadas + planificador, ahorrás un 17% vs pagar semanalmente). Los pagos se procesan a través de MercadoPago y por ahora están disponibles solo para cuentas de Argentina.',
  updated_at = now()
WHERE question = '¿Cuáles son los planes disponibles?';

-- 2. Remove Stripe reference from payment update FAQ — with MercadoPago you manage from your MP account
UPDATE public.faqs
SET
  answer = 'Para actualizar tu método de pago, ingresá a tu cuenta de MercadoPago y gestioná el medio de pago asociado a tu suscripción activa. Si tenés problemas, podés cancelar la suscripción actual y crear una nueva con el método de pago actualizado. Para ayuda adicional, contactá nuestro soporte.',
  updated_at = now()
WHERE question = '¿Cómo actualizo mi método de pago?';

-- 3. Fix "international payments" FAQ — Stripe is NOT enabled, only Argentina via MercadoPago
UPDATE public.faqs
SET
  question = '¿En qué países está disponible la suscripción?',
  answer = 'Por ahora los pagos están disponibles solo en Argentina, a través de MercadoPago. Si estás en otro país, podés usar el plan gratuito con 15 consultas semanales. Estamos trabajando para expandirnos a más países pronto. ¡Seguinos para enterarte cuando lleguemos a tu región!',
  updated_at = now()
WHERE question = '¿Aceptan métodos de pago internacionales?';

-- 4. Update free trial FAQ — promo codes with free days now exist
UPDATE public.faqs
SET
  answer = 'Sí. Si tenés un código de cupón, podés ingresarlo en la pantalla de planes para activar días gratis de Premium sin necesidad de ingresar datos de pago. Si no tenés un cupón, el plan gratuito te permite probar el chat con 15 consultas semanales para conocer la calidad de nuestro asistente antes de suscribirte.',
  updated_at = now()
WHERE question = '¿Hay un período de prueba?';

-- 5. Fix cancellation FAQ — with MercadoPago you cancel from your MP account, not a "portal de cliente"
UPDATE public.faqs
SET
  answer = 'Sí, podés cancelar en cualquier momento desde tu cuenta de MercadoPago, en la sección de suscripciones activas. También podés escribirnos al soporte y lo gestionamos por vos. Mantendrás acceso completo hasta el final de tu período de facturación actual.',
  updated_at = now()
WHERE question = '¿Puedo cancelar mi suscripción?';

-- 6. Fix "cambiar de plan" FAQ — MercadoPago doesn't have a self-service plan change portal
UPDATE public.faqs
SET
  answer = 'Para cambiar de plan, cancelá tu suscripción actual desde tu cuenta de MercadoPago y luego suscribite al nuevo plan desde Chef AI. Si necesitás ayuda con el proceso, contactá nuestro soporte y te asistimos sin costo adicional.',
  updated_at = now()
WHERE question = '¿Puedo cambiar de plan mensual a semanal?';
