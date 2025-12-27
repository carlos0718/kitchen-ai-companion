import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserProfile {
  age?: number;
  height?: number;
  weight?: number;
  bmi?: number;
  gender?: string;
  dietary_restrictions?: string[];
  allergies?: string[];
  cuisine_preferences?: string[];
  daily_calorie_goal?: number;
  household_size?: number;
  cooking_skill_level?: string;
  max_prep_time?: number;
}

const BASE_SYSTEM_PROMPT = `Eres Chef AI, un asistente de cocina casera experto y amigable. Tu objetivo es ayudar a los usuarios a crear recetas deliciosas y saludables adaptadas a sus necesidades nutricionales.

Directrices:
- Al saludar o en conversaciones iniciales, pregunta proactivamente sobre sus objetivos:
  * ¿Qué tipo de dieta quieres seguir? (vegetariana, vegana, keto, mediterránea, alta en proteínas, etc.)
  * ¿Tienen algún objetivo específico? (bajar de peso, ganar masa muscular, mantenerse saludable)
  * ¿Tienen restricciones o alergias alimentarias?
  * o simplemente quieres una receta rápida y fácil?
- Sugiere recetas simples y prácticas para cocina casera
- Adapta las recetas según los ingredientes mencionados por el usuario
- Ofrece alternativas cuando falten ingredientes
- Proporciona tiempos de preparación y cocción estimados
- Da consejos útiles de cocina y nutrición
- Sé cálido, motivador y entusiasta
- Si el usuario menciona ingredientes, sugiere 2-3 recetas posibles
- Incluye instrucciones paso a paso claras
- Menciona valores nutricionales básicos (calorías, proteínas, carbohidratos, grasas)
- Adapta tus sugerencias al tipo de dieta y objetivos mencionados

Responde siempre en español de forma clara, concisa y motivadora.`;

function buildSystemPrompt(userProfile: UserProfile | null): string {
  if (!userProfile) return BASE_SYSTEM_PROMPT;

  let userContext = '\n\nCONTEXTO DEL USUARIO:';

  if (userProfile.dietary_restrictions?.length > 0) {
    userContext += `\n- Restricciones dietéticas: ${userProfile.dietary_restrictions.join(', ')}. NUNCA sugieras recetas que violen estas restricciones.`;
  }

  if (userProfile.allergies?.length > 0) {
    userContext += `\n- Alergias: ${userProfile.allergies.join(', ')}. NUNCA uses estos ingredientes.`;
  }

  if (userProfile.cuisine_preferences?.length > 0) {
    userContext += `\n- Preferencias de cocina: ${userProfile.cuisine_preferences.join(', ')}.`;
  }

  if (userProfile.daily_calorie_goal) {
    userContext += `\n- Objetivo calórico: ~${Math.round(userProfile.daily_calorie_goal / 3)} kcal por comida.`;
  }

  if (userProfile.household_size) {
    userContext += `\n- Cocina para ${userProfile.household_size} persona(s).`;
  }

  if (userProfile.cooking_skill_level) {
    userContext += `\n- Nivel de cocina: ${userProfile.cooking_skill_level}.`;
  }

  if (userProfile.max_prep_time) {
    userContext += `\n- Tiempo máximo de preparación: ${userProfile.max_prep_time} minutos.`;
  }

  userContext += '\n\nAdapta todas tus sugerencias según este perfil.';

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
