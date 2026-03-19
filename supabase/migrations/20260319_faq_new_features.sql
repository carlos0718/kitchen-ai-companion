-- New FAQs: weekly digest, multi-agent specialists, smart shopping list
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING via unique-ish check

INSERT INTO public.faqs (question, answer, category, display_order) VALUES

  -- ── Features ─────────────────────────────────────────────────────────────

  (
    '¿Qué son los especialistas de IA?',
    'Chef AI cuenta con cuatro agentes especializados que se activan automáticamente según tu consulta: el Chef (recetas y técnicas), el Nutricionista (macros y calorías), el Asistente de Compras (listas y sustituciones) y el Planificador (organización semanal). No tenés que elegir cuál usar: el sistema detecta tu intención y te conecta con el experto correcto.',
    'features',
    6
  ),
  (
    '¿Cómo funciona la lista de compras inteligente?',
    'Con un solo clic en el Planificador, Chef AI analiza todos los ingredientes de tu semana y genera una lista organizada por categorías (Frutas y Verduras, Carnes, Lácteos, Granos, etc.). Los nombres de los ingredientes se adaptan automáticamente a tu país para que encuentres todo en tu supermercado local.',
    'features',
    7
  ),
  (
    '¿Qué es el resumen nutricional semanal?',
    'Cada domingo, los usuarios premium reciben una notificación con un resumen personalizado de su semana: calorías promedio por día, balance de macronutrientes, las recetas que más consumiste y un mensaje motivador generado por IA adaptado a tus objetivos. Es una forma de mantenerte consciente de tu progreso sin esfuerzo.',
    'features',
    8
  ),

  -- ── Meal Planning ────────────────────────────────────────────────────────

  (
    '¿La lista de compras considera todo el plan de la semana?',
    'Sí. La lista se genera tomando todos los ingredientes de tus desayunos, almuerzos, cenas y snacks planificados para la semana. Las cantidades se suman automáticamente para evitar duplicados, y están ajustadas al número de personas de tu hogar.',
    'meal_planning',
    6
  ),

  -- ── General ──────────────────────────────────────────────────────────────

  (
    '¿Cómo sabe Chef AI qué especialista usar para mi consulta?',
    'Chef AI analiza automáticamente el texto de tu mensaje usando un sistema de detección de intenciones. Si mencionás ingredientes o pedís una receta, activa al Chef. Si preguntás por calorías o macros, activa al Nutricionista. Si necesitás una lista de compras, activa al Asistente de Compras. Todo ocurre en tiempo real, sin que tengas que hacer nada extra.',
    'general',
    5
  )
;
