import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserProfile {
  name?: string;
  age?: number;
  height?: number;
  weight?: number;
  bmi?: number;
  gender?: string;
  country?: string;
  dietary_restrictions?: string[];
  allergies?: string[];
  cuisine_preferences?: string[];
  daily_calorie_goal?: number;
  protein_goal?: number;
  carbs_goal?: number;
  fat_goal?: number;
  household_size?: number;
  cooking_skill_level?: string;
  max_prep_time?: number;
  diet_type?: string;
  flexible_mode?: boolean;
  snack_preference?: string;
  fitness_goal?: string;
}

// Mapeo de países a nombres localizados
const COUNTRY_NAMES: Record<string, string> = {
  'AR': 'Argentina',
  'PE': 'Perú',
  'MX': 'México',
  'CO': 'Colombia',
  'CL': 'Chile',
  'EC': 'Ecuador',
  'VE': 'Venezuela',
  'UY': 'Uruguay',
  'PY': 'Paraguay',
  'BO': 'Bolivia',
  'ES': 'España',
  'US': 'Estados Unidos',
  'CR': 'Costa Rica',
  'CU': 'Cuba',
  'SV': 'El Salvador',
  'GT': 'Guatemala',
  'HN': 'Honduras',
  'NI': 'Nicaragua',
  'PA': 'Panamá',
  'PR': 'Puerto Rico',
  'DO': 'República Dominicana',
};

// Ejemplos de ingredientes localizados por país
const INGREDIENT_LOCALIZATION_GUIDE = `
GUÍA DE LOCALIZACIÓN DE INGREDIENTES POR PAÍS:

🇦🇷 ARGENTINA:
- Palta (no aguacate)
- Choclo (no elote/mazorca)
- Poroto (no frijol/judía)
- Ananá (no piña)
- Frutilla (no fresa)
- Durazno (no melocotón)
- Banana (no plátano/guineo)
- Papa (no patata)
- Arvejas (no guisantes/chícharos)
- Manteca (no mantequilla)
- Crema de leche (no nata)
- Queso cremoso/port salut (no queso cotija/oaxaca)
- Morrón (no pimiento/ají)
- Zapallo (no calabaza/ayote)
- Batata (no camote/boniato)
- Chaucha (no ejote/judía verde)
- Ricota (no requesón)

🇲🇽 MÉXICO:
- Aguacate (no palta)
- Elote/mazorca (no choclo)
- Frijol (no poroto)
- Piña (no ananá)
- Fresa (no frutilla)
- Durazno (no melocotón)
- Plátano (no banana)
- Papa (no patata)
- Chícharo (no arvejas)
- Mantequilla (no manteca)
- Crema (no nata)
- Queso cotija, oaxaca, panela
- Chile/pimiento (no morrón)
- Calabaza (no zapallo)
- Camote (no batata)
- Ejote (no chaucha)

🇵🇪 PERÚ:
- Palta (no aguacate)
- Choclo (no elote)
- Frejol (no poroto)
- Piña (no ananá)
- Fresa (no frutilla)
- Durazno (no melocotón)
- Plátano (no banana para el dulce)
- Papa (variedad enorme: amarilla, huayro, etc.)
- Arvejas (no chícharos)
- Mantequilla (no manteca)
- Crema de leche (no nata)
- Queso fresco, queso andino
- Ají (no chile/morrón) - ají amarillo, ají panca, rocoto
- Zapallo (no calabaza)
- Camote (no batata)
- Vainita (no ejote/chaucha)

🇨🇴 COLOMBIA:
- Aguacate (no palta)
- Mazorca (no choclo/elote)
- Fríjol (no poroto)
- Piña (no ananá)
- Fresa (no frutilla)
- Durazno (no melocotón)
- Banano (no plátano para el dulce)
- Papa (no patata)
- Arveja (no chícharos)
- Mantequilla (no manteca)
- Crema de leche (no nata)
- Queso costeño, queso campesino
- Pimentón (no morrón/chile)
- Ahuyama (no zapallo/calabaza)
- Batata (no camote)
- Habichuela (no ejote/chaucha)

🇨🇱 CHILE:
- Palta (no aguacate)
- Choclo (no elote)
- Poroto (no frijol)
- Piña (no ananá)
- Frutilla (no fresa)
- Durazno (no melocotón)
- Plátano (no banana)
- Papa (no patata)
- Arvejas (no chícharos)
- Mantequilla (no manteca)
- Crema (no nata)
- Queso chanco, queso fresco
- Pimentón (no morrón)
- Zapallo (no calabaza)
- Camote (no batata)
- Poroto verde (no ejote)

🇪🇸 ESPAÑA:
- Aguacate (no palta)
- Mazorca (no choclo)
- Judía/alubia (no frijol/poroto)
- Piña (no ananá)
- Fresa (no frutilla)
- Melocotón (no durazno)
- Plátano (no banana)
- Patata (no papa)
- Guisantes (no arvejas)
- Mantequilla (no manteca)
- Nata (no crema de leche)
- Queso manchego, queso fresco
- Pimiento (no morrón)
- Calabaza (no zapallo)
- Boniato (no batata/camote)
- Judía verde (no ejote)
`;

// Calcular calorías diarias recomendadas usando Harris-Benedict
function calculateDailyCalories(profile: UserProfile): number | null {
  if (!profile.weight || !profile.height || !profile.age || !profile.gender) {
    return null;
  }

  let bmr: number;

  // Fórmula de Mifflin-St Jeor (más precisa que Harris-Benedict)
  if (profile.gender === 'male') {
    bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) + 5;
  } else {
    bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) - 161;
  }

  // Factor de actividad moderada (1.55) como default
  const activityFactor = 1.55;
  let tdee = bmr * activityFactor;

  // Ajustar según objetivo
  if (profile.fitness_goal === 'lose_weight') {
    tdee *= 0.85; // Déficit del 15%
  } else if (profile.fitness_goal === 'gain_muscle') {
    tdee *= 1.1; // Superávit del 10%
  }

  return Math.round(tdee);
}

// Calcular peso ideal y rango saludable basado en altura
function calculateIdealWeight(heightCm: number, gender: string): { ideal: number; min: number; max: number } {
  const heightM = heightCm / 100;

  // Rango saludable basado en IMC 18.5 - 24.9
  const minWeight = Math.round(18.5 * heightM * heightM);
  const maxWeight = Math.round(24.9 * heightM * heightM);

  // Peso ideal usando fórmula de Devine modificada
  let idealWeight: number;
  if (gender === 'male') {
    // Hombres: 50 + 2.3 * (altura en pulgadas - 60)
    const heightInches = heightCm / 2.54;
    idealWeight = 50 + 2.3 * (heightInches - 60);
  } else {
    // Mujeres: 45.5 + 2.3 * (altura en pulgadas - 60)
    const heightInches = heightCm / 2.54;
    idealWeight = 45.5 + 2.3 * (heightInches - 60);
  }

  // Asegurar que el peso ideal esté dentro del rango saludable
  idealWeight = Math.max(minWeight, Math.min(maxWeight, Math.round(idealWeight)));

  return { ideal: idealWeight, min: minWeight, max: maxWeight };
}

// Clasificar IMC
function classifyBMI(bmi: number): { status: string; emoji: string; recommendation: string } {
  if (bmi < 18.5) {
    return {
      status: 'bajo peso',
      emoji: '⚠️',
      recommendation: 'Te recomiendo aumentar gradualmente tu ingesta calórica con alimentos nutritivos.'
    };
  } else if (bmi < 25) {
    return {
      status: 'peso saludable',
      emoji: '✅',
      recommendation: '¡Excelente! Tu peso está en un rango saludable. Enfócate en mantenerlo.'
    };
  } else if (bmi < 30) {
    return {
      status: 'sobrepeso',
      emoji: '📊',
      recommendation: 'Podemos trabajar juntos en recetas bajas en calorías pero deliciosas para ayudarte a alcanzar tu peso ideal.'
    };
  } else {
    return {
      status: 'obesidad',
      emoji: '🎯',
      recommendation: 'Te ayudaré con recetas saludables y balanceadas. Recuerda que pequeños cambios llevan a grandes resultados.'
    };
  }
}

// Traducir valores del perfil
function translateDietType(dietType: string): string {
  const translations: Record<string, string> = {
    'casera_normal': 'comida casera tradicional',
    'keto': 'dieta cetogénica (keto)',
    'paleo': 'dieta paleo',
    'vegetariano': 'dieta vegetariana',
    'vegano': 'dieta vegana',
    'deportista': 'dieta alta en proteínas para deportistas',
    'mediterranea': 'dieta mediterránea'
  };
  return translations[dietType] || dietType;
}

function translateFitnessGoal(goal: string): string {
  const translations: Record<string, string> = {
    'lose_weight': 'bajar de peso',
    'gain_muscle': 'ganar masa muscular',
    'maintain': 'mantener peso actual',
    'eat_healthy': 'comer más saludable'
  };
  return translations[goal] || goal;
}

function translateGender(gender: string): string {
  const translations: Record<string, string> = {
    'male': 'masculino',
    'female': 'femenino',
    'other': 'otro'
  };
  return translations[gender] || gender;
}

const BASE_SYSTEM_PROMPT = `Eres Chef AI, un **Nutricionista Deportivo y Coach de Alimentación Saludable** con más de 15 años de experiencia. Eres también chef profesional especializado en cocina saludable. Tu enfoque combina la ciencia de la nutrición con el arte culinario para crear recetas deliciosas que ayuden a las personas a alcanzar sus objetivos de salud.

TU PERFIL PROFESIONAL:
- Licenciado en Nutrición y Dietética
- Especialización en Nutrición Deportiva
- Chef certificado en cocina saludable
- Coach de hábitos alimentarios
- Experto en adaptación de recetas tradicionales a versiones más saludables

TU PERSONALIDAD:
- Motivador pero realista
- Científico pero accesible
- Empático con los desafíos de cambiar hábitos
- Entusiasta de la buena comida
- Nunca juzgas, siempre apoyas

IMPORTANTE - COMPORTAMIENTO EN PRIMERA INTERACCIÓN:
- Si el usuario tiene perfil completo (peso, altura, edad, objetivos), NO hagas preguntas sobre esa información. Ya la conoces.
- En tu primer mensaje, da la bienvenida personalizada mencionando lo que sabes del usuario.
- Ofrece directamente ayuda con recetas adaptadas a su perfil.
- Solo pregunta información que NO tengas en el perfil.

FORMATO DE RESPUESTA:
- Usa títulos con ## para secciones principales (ej: ## Ingredientes)
- Usa ### para subsecciones (ej: ### Para la salsa)
- NO uses asteriscos sueltos como viñetas, usa guiones (-)
- Las negritas van con **texto** solo para palabras clave importantes
- Listas numeradas para pasos de preparación
- Mantén el formato limpio y legible

RECOMENDACIONES PERSONALIZADAS:
- Si el usuario tiene preferencias culinarias (peruana, mexicana, italiana, etc.), SIEMPRE sugiere versiones saludables de esas cocinas
- Adapta las recetas tradicionales al objetivo del usuario:
  - Para BAJAR DE PESO: reduce porciones, sustituye ingredientes calóricos, aumenta vegetales, sugiere versiones light
  - Para GANAR MÚSCULO: aumenta proteínas, incluye más carbohidratos complejos, porciones más grandes
  - Para MANTENER: equilibra macronutrientes según sus metas
- Ejemplo: Si alguien quiere bajar de peso y le gusta la comida peruana, sugiere ceviche (bajo en calorías), lomo saltado con menos aceite y más verduras, causa de atún light, etc.

COMO NUTRICIONISTA EXPERTO:
- Explica brevemente POR QUÉ ciertos ingredientes son beneficiosos para el objetivo del usuario
- Menciona los beneficios nutricionales de los ingredientes principales
- Sugiere mejoras nutricionales cuando sea apropiado
- Si detectas que una receta solicitada no es ideal para el objetivo del usuario, sugiere una versión más saludable
- Ofrece tips de nutrición relevantes al contexto

Directrices generales:
- Sugiere recetas simples y prácticas para cocina casera
- Adapta las recetas según los ingredientes mencionados por el usuario
- Ofrece alternativas cuando falten ingredientes
- Proporciona tiempos de preparación y cocción estimados
- Da consejos útiles de cocina y nutrición basados en el perfil del usuario
- Sé cálido, motivador y entusiasta
- Si el usuario menciona ingredientes, sugiere 2-3 recetas posibles
- Incluye instrucciones paso a paso claras
- SIEMPRE menciona valores nutricionales (calorías, proteínas, carbohidratos, grasas) por porción
- Adapta las porciones y calorías al objetivo calórico diario del usuario

Responde siempre en español de forma clara, concisa y motivadora.`;

function buildSystemPrompt(userProfile: UserProfile | null): string {
  if (!userProfile) return BASE_SYSTEM_PROMPT;

  let userContext = '\n\n═══════════════════════════════════════\nPERFIL COMPLETO DEL USUARIO:\n═══════════════════════════════════════';

  // País del usuario (CRÍTICO para localización de ingredientes)
  const userCountry = userProfile.country || 'AR'; // Default Argentina
  const countryName = COUNTRY_NAMES[userCountry] || userCountry;

  userContext += `\n\n🌍 PAÍS: ${countryName} (${userCountry})`;
  userContext += `\n⚠️ IMPORTANTE: DEBES usar los nombres de ingredientes como se conocen en ${countryName}.`;
  userContext += `\n   Si un ingrediente NO existe en ${countryName}, sustitúyelo por uno local equivalente o indícalo.`;

  // Información personal
  if (userProfile.name) {
    userContext += `\n\n👤 Nombre: ${userProfile.name}`;
  }

  // Datos biométricos y análisis
  const hasBiometrics = userProfile.age && userProfile.height && userProfile.weight;
  if (hasBiometrics) {
    userContext += `\n\n📊 DATOS FÍSICOS:`;
    userContext += `\n- Edad: ${userProfile.age} años`;
    userContext += `\n- Altura: ${userProfile.height} cm`;
    userContext += `\n- Peso: ${userProfile.weight} kg`;
    if (userProfile.gender) {
      userContext += `\n- Género: ${translateGender(userProfile.gender)}`;
    }

    // Análisis de IMC y peso ideal
    if (userProfile.bmi && userProfile.height && userProfile.gender) {
      const bmiAnalysis = classifyBMI(userProfile.bmi);
      const idealWeight = calculateIdealWeight(userProfile.height, userProfile.gender);
      const weightDiff = userProfile.weight ? Math.round(userProfile.weight - idealWeight.ideal) : 0;

      userContext += `\n\n📈 ANÁLISIS DE PESO:`;
      userContext += `\n- IMC actual: ${userProfile.bmi.toFixed(1)} (${bmiAnalysis.status}) ${bmiAnalysis.emoji}`;
      userContext += `\n- Peso actual: ${userProfile.weight} kg`;
      userContext += `\n- Peso ideal para tu altura: ${idealWeight.ideal} kg`;
      userContext += `\n- Rango saludable: ${idealWeight.min} - ${idealWeight.max} kg`;

      if (weightDiff > 0) {
        userContext += `\n- Para alcanzar tu peso ideal necesitas perder: ${weightDiff} kg`;
      } else if (weightDiff < 0) {
        userContext += `\n- Para alcanzar tu peso ideal necesitas ganar: ${Math.abs(weightDiff)} kg`;
      } else {
        userContext += `\n- ¡Estás en tu peso ideal! 🎉`;
      }

      userContext += `\n- ${bmiAnalysis.recommendation}`;
    } else if (userProfile.bmi) {
      const bmiAnalysis = classifyBMI(userProfile.bmi);
      userContext += `\n\n📈 ANÁLISIS DE PESO:`;
      userContext += `\n- IMC: ${userProfile.bmi.toFixed(1)} (${bmiAnalysis.status}) ${bmiAnalysis.emoji}`;
      userContext += `\n- Recomendación: ${bmiAnalysis.recommendation}`;
    }

    // Calorías recomendadas
    const calculatedCalories = calculateDailyCalories(userProfile);
    const dailyCalories = userProfile.daily_calorie_goal || calculatedCalories;
    if (dailyCalories) {
      userContext += `\n\n🔥 REQUERIMIENTO CALÓRICO:`;
      userContext += `\n- Calorías diarias recomendadas: ~${dailyCalories} kcal/día`;
      userContext += `\n- Por comida principal (aprox): ~${Math.round(dailyCalories / 3)} kcal`;
      if (userProfile.snack_preference === '4meals' || userProfile.snack_preference === '5meals') {
        const snacks = userProfile.snack_preference === '5meals' ? 2 : 1;
        userContext += `\n- Por snack (aprox): ~${Math.round(dailyCalories * 0.1)} kcal`;
      }
    }

    // Macros si están definidos
    if (userProfile.protein_goal || userProfile.carbs_goal || userProfile.fat_goal) {
      userContext += `\n\n🥗 MACRONUTRIENTES OBJETIVO:`;
      if (userProfile.protein_goal) userContext += `\n- Proteínas: ${userProfile.protein_goal}g`;
      if (userProfile.carbs_goal) userContext += `\n- Carbohidratos: ${userProfile.carbs_goal}g`;
      if (userProfile.fat_goal) userContext += `\n- Grasas: ${userProfile.fat_goal}g`;
    }
  }

  // Objetivo de fitness
  if (userProfile.fitness_goal) {
    userContext += `\n\n🎯 OBJETIVO: ${translateFitnessGoal(userProfile.fitness_goal).toUpperCase()}`;
  }

  // Tipo de dieta
  if (userProfile.diet_type) {
    userContext += `\n\n🍽️ TIPO DE DIETA: ${translateDietType(userProfile.diet_type)}`;
  }

  // Restricciones y alergias (CRÍTICO)
  if (userProfile.dietary_restrictions?.length > 0) {
    userContext += `\n\n⚠️ RESTRICCIONES DIETÉTICAS: ${userProfile.dietary_restrictions.join(', ')}`;
    userContext += `\n   ¡NUNCA sugieras recetas que violen estas restricciones!`;
  }

  if (userProfile.allergies?.length > 0) {
    userContext += `\n\n🚫 ALERGIAS: ${userProfile.allergies.join(', ')}`;
    userContext += `\n   ¡NUNCA uses estos ingredientes bajo ninguna circunstancia!`;
  }

  // Preferencias
  if (userProfile.cuisine_preferences?.length > 0) {
    userContext += `\n\n❤️ Cocinas favoritas: ${userProfile.cuisine_preferences.join(', ')}`;
  }

  // Contexto del hogar
  userContext += `\n\n🏠 CONTEXTO:`;
  if (userProfile.household_size) {
    userContext += `\n- Cocina para: ${userProfile.household_size} persona(s)`;
  }
  if (userProfile.cooking_skill_level) {
    userContext += `\n- Nivel de cocina: ${userProfile.cooking_skill_level}`;
  }
  if (userProfile.max_prep_time) {
    userContext += `\n- Tiempo máximo de preparación: ${userProfile.max_prep_time} minutos`;
  }
  if (userProfile.snack_preference) {
    const mealsText = userProfile.snack_preference === '3meals' ? '3 comidas' :
                      userProfile.snack_preference === '4meals' ? '4 comidas (con 1 snack)' :
                      '5 comidas (con 2 snacks)';
    userContext += `\n- Comidas por día: ${mealsText}`;
  }
  if (userProfile.flexible_mode !== undefined) {
    userContext += `\n- Modo flexible: ${userProfile.flexible_mode ? 'Sí (puede sugerir sustitutos)' : 'No (ingredientes exactos)'}`;
  }

  userContext += `\n\n═══════════════════════════════════════
INSTRUCCIONES ESPECIALES:
- En tu PRIMER mensaje, saluda al usuario por su nombre si lo conoces.
- Menciona brevemente su objetivo (ej: "Veo que tu objetivo es bajar de peso").
- Si tiene IMC fuera de rango normal, menciona brevemente su estado de peso de forma positiva y motivadora.
- Ofrece ayuda específica basada en su perfil.
- NO preguntes información que ya tienes arriba.
- SIEMPRE adapta las porciones a sus calorías objetivo.
- Si tiene cocinas favoritas definidas, PRIORIZA recetas de esas cocinas adaptadas a su objetivo.
- Explica específicamente QUÉ ingredientes usar y en QUÉ cantidades para cumplir su objetivo.
- Si quiere bajar de peso: indica sustituciones saludables, porciones reducidas, técnicas de cocción sin grasa.
- Si quiere ganar músculo: indica fuentes de proteína, porciones abundantes, carbohidratos complejos.

🌍 LOCALIZACIÓN DE INGREDIENTES (MUY IMPORTANTE):
- El usuario está en ${countryName}. USA LOS NOMBRES DE INGREDIENTES COMO SE CONOCEN EN ESE PAÍS.
- NO uses nombres de ingredientes de otros países (ej: si el usuario está en Argentina, di "palta" no "aguacate").
- Si una receta tradicional de otro país tiene ingredientes que no existen en ${countryName}, sustitúyelos por equivalentes locales.
- Si no hay sustituto, indícalo claramente: "En ${countryName} puedes usar X como alternativa a Y".
═══════════════════════════════════════`;

  // Agregar guía de localización de ingredientes
  userContext += `\n\n${INGREDIENT_LOCALIZATION_GUIDE}`;

  return BASE_SYSTEM_PROMPT + userContext;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationHistory, user_id } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Load user profile if user_id provided
    let userProfile: UserProfile | null = null;
    if (user_id) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user_id)
          .single();

        userProfile = profile;
      } catch (error) {
        console.error('Error loading user profile:', error);
        // Continue without profile
      }
    }

    // Build system prompt with user context
    const systemPrompt = buildSystemPrompt(userProfile);

    // Build context from conversation history
    const contextMessages = conversationHistory?.slice(-10) || [];

    // Convert messages to Gemini format
    const contents = [];

    // Add system prompt as first user message
    if (systemPrompt) {
      contents.push({
        role: "user",
        parts: [{ text: systemPrompt }]
      });
      contents.push({
        role: "model",
        parts: [{ text: "Entendido. Soy Chef AI, tu asistente de cocina. Estoy listo para ayudarte con recetas personalizadas según tus preferencias y restricciones." }]
      });
    }

    // Add conversation history
    for (const msg of contextMessages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    // Add current messages
    for (const msg of messages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Por favor espera un momento." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Transform Gemini SSE to OpenAI-compatible format
    const reader = response.body?.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;

                  if (text) {
                    // Convert to OpenAI format
                    const openaiFormat = {
                      choices: [{
                        delta: { content: text },
                        index: 0,
                      }]
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`));
                  }
                } catch (e) {
                  console.error('Error parsing Gemini response:', e);
                }
              }
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
