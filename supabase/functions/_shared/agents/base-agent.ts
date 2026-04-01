// deno-lint-ignore-file
import type {
  AgentContext,
  AgentType,
  GeminiContent,
  SanitizationResult,
  UserProfile,
} from "../types.ts";
import { callGeminiStream } from "../gemini.ts";

// ─── Security ──────────────────────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore.*(?:previous|above|all).*instructions/i,
  /disregard.*(?:previous|above|all).*instructions/i,
  /forget.*(?:everything|instructions|rules)/i,
  /you are now/i,
  /act as (?:if you were|a|an)/i,
  /pretend (?:to be|you are)/i,
  /roleplay as/i,
  /repeat.*system.*prompt/i,
  /show.*(?:system|initial).*(?:prompt|instructions)/i,
  /what (?:are|were) your (?:instructions|rules)/i,
  /reveal.*(?:prompt|instructions)/i,
  /bypass.*(?:restrictions|filters|rules)/i,
  /jailbreak/i,
  /DAN mode/i,
  /developer mode/i,
];

const OFF_TOPIC_PATTERNS = [
  {
    pattern:
      /(?:crea|genera|escribe|programa|desarrolla|haz).*(?:código|programa|app|aplicación|software|script|bot)/i,
    reason: "programación/desarrollo de software",
  },
  {
    pattern: /(?:cómo|como).*(?:hackear|hackeo|hack|crackear)/i,
    reason: "actividades de hacking",
  },
  {
    pattern: /(?:ayuda|ayúdame).*(?:programar|codificar|desarrollar)/i,
    reason: "programación",
  },
  {
    pattern:
      /(?:javascript|python|java|html|css|sql|react|node|php|c\+\+|typescript)/i,
    reason: "lenguajes de programación",
  },
  {
    pattern: /(?:API|endpoint|backend|frontend|database|servidor)/i,
    reason: "desarrollo técnico",
  },
  {
    pattern:
      /(?:invertir|inversiones|criptomonedas|bitcoin|trading|forex|acciones)/i,
    reason: "inversiones/finanzas",
  },
  {
    pattern: /(?:diagnóstico médico|medicamento|prescripción|tratar enfermedad)/i,
    reason: "consejos médicos específicos",
  },
  { pattern: /(?:drogas|narcóticos|sustancias ilegales)/i, reason: "sustancias ilegales" },
  { pattern: /(?:armas|explosivos|veneno)/i, reason: "contenido peligroso" },
  { pattern: /(?:contenido adulto|pornografía|sexo)/i, reason: "contenido adulto" },
];

const MAX_MESSAGE_LENGTH = 4000;

export function sanitizeInput(input: string): SanitizationResult {
  if (typeof input !== "string") {
    return { sanitized: "", isOffTopic: false, hasPotentialInjection: false };
  }

  let sanitized = input.slice(0, MAX_MESSAGE_LENGTH).trim();

  let hasPotentialInjection = false;
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      console.warn("[SECURITY] Potential prompt injection detected");
      hasPotentialInjection = true;
      break;
    }
  }

  let isOffTopic = false;
  let offTopicReason: string | undefined;
  for (const { pattern, reason } of OFF_TOPIC_PATTERNS) {
    if (pattern.test(sanitized)) {
      isOffTopic = true;
      offTopicReason = reason;
      break;
    }
  }

  sanitized = sanitized.split("").filter((char) => {
    const code = char.charCodeAt(0);
    return code === 9 || code === 10 || code === 13 || code >= 32;
  }).join("");

  return { sanitized, isOffTopic, offTopicReason, hasPotentialInjection };
}

export function getOffTopicResponse(reason: string): string {
  return `¡Hola! 👋 Soy **Chef AI**, tu asistente especializado en **cocina y nutrición**.

Mi expertise está en:
- 🍳 Crear recetas personalizadas según tus objetivos
- 🥗 Asesoramiento nutricional y planes de alimentación
- 🛒 Sugerencias de ingredientes y sustituciones saludables
- 📊 Cálculo de calorías y macronutrientes
- 🌱 Adaptación de recetas a dietas especiales (keto, vegana, etc.)

No puedo ayudarte con temas de **${reason}**, ya que está fuera de mi área de especialización.

¿Te gustaría que te ayude con alguna receta o consulta nutricional? 😊`;
}

// ─── Localization ───────────────────────────────────────────────────────────

export const COUNTRY_NAMES: Record<string, string> = {
  AR: "Argentina", PE: "Perú", MX: "México", CO: "Colombia", CL: "Chile",
  EC: "Ecuador", VE: "Venezuela", UY: "Uruguay", PY: "Paraguay", BO: "Bolivia",
  ES: "España", US: "Estados Unidos", CR: "Costa Rica", CU: "Cuba",
  SV: "El Salvador", GT: "Guatemala", HN: "Honduras", NI: "Nicaragua",
  PA: "Panamá", PR: "Puerto Rico", DO: "República Dominicana",
};

export const INGREDIENT_LOCALIZATION_GUIDE = `
GUÍA DE LOCALIZACIÓN DE INGREDIENTES POR PAÍS:

🇦🇷 ARGENTINA:
- Palta (no aguacate), Choclo (no elote), Poroto (no frijol), Ananá (no piña)
- Frutilla (no fresa), Banana (no plátano/guineo), Papa (no patata)
- Arvejas (no guisantes), Manteca (no mantequilla), Crema de leche (no nata)
- Morrón (no pimiento/ají), Zapallo (no calabaza), Batata (no camote), Ricota (no requesón)

🇲🇽 MÉXICO:
- Aguacate (no palta), Elote (no choclo), Frijol (no poroto), Piña (no ananá)
- Fresa (no frutilla), Plátano (no banana), Papa (no patata), Chícharo (no arvejas)
- Mantequilla (no manteca), Queso cotija/oaxaca/panela, Chile (no morrón), Camote (no batata)

🇵🇪 PERÚ:
- Palta (no aguacate), Choclo (no elote), Frejol (no poroto), Piña (no ananá)
- Fresa (no frutilla), Papa (variedad: amarilla, huayro...), Arvejas (no chícharos)
- Ají (no chile/morrón) — amarillo, panca, rocoto. Camote (no batata), Vainita (no ejote)

🇨🇴 COLOMBIA:
- Aguacate (no palta), Mazorca (no choclo), Fríjol (no poroto), Piña (no ananá)
- Fresa (no frutilla), Banano (no plátano dulce), Papa (no patata), Arveja (no chícharos)
- Pimentón (no morrón), Ahuyama (no zapallo), Habichuela (no ejote)

🇨🇱 CHILE:
- Palta (no aguacate), Choclo (no elote), Poroto (no frijol), Piña (no ananá)
- Frutilla (no fresa), Plátano (no banana), Papa (no patata), Arvejas (no chícharos)
- Pimentón (no morrón), Zapallo (no calabaza), Poroto verde (no ejote)

🇪🇸 ESPAÑA:
- Aguacate (no palta), Judía/alubia (no frijol), Piña (no ananá), Fresa (no frutilla)
- Melocotón (no durazno), Plátano (no banana), Patata (no papa), Guisantes (no arvejas)
- Nata (no crema de leche), Pimiento (no morrón), Calabaza (no zapallo), Boniato (no batata)
`;

// ─── Profile helpers ────────────────────────────────────────────────────────

function calculateDailyCalories(profile: UserProfile): number | null {
  if (!profile.weight || !profile.height || !profile.age || !profile.gender) return null;
  let bmr: number;
  if (profile.gender === "male") {
    bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) + 5;
  } else {
    bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) - 161;
  }
  let tdee = bmr * 1.55;
  if (profile.fitness_goal === "lose_weight") tdee *= 0.85;
  else if (profile.fitness_goal === "gain_muscle") tdee *= 1.1;
  return Math.round(tdee);
}

function classifyBMI(bmi: number): { status: string; emoji: string; recommendation: string } {
  if (bmi < 18.5) return { status: "bajo peso", emoji: "⚠️", recommendation: "Aumenta gradualmente tu ingesta calórica con alimentos nutritivos." };
  if (bmi < 25)  return { status: "peso saludable", emoji: "✅", recommendation: "¡Excelente! Tu peso está en rango saludable." };
  if (bmi < 30)  return { status: "sobrepeso", emoji: "📊", recommendation: "Podemos trabajar en recetas bajas en calorías pero deliciosas." };
  return { status: "obesidad", emoji: "🎯", recommendation: "Te ayudaré con recetas saludables y balanceadas." };
}

function calculateIdealWeight(heightCm: number, gender: string) {
  const heightM = heightCm / 100;
  const minWeight = Math.round(18.5 * heightM * heightM);
  const maxWeight = Math.round(24.9 * heightM * heightM);
  const heightInches = heightCm / 2.54;
  let ideal = gender === "male" ? 50 + 2.3 * (heightInches - 60) : 45.5 + 2.3 * (heightInches - 60);
  ideal = Math.max(minWeight, Math.min(maxWeight, Math.round(ideal)));
  return { ideal, min: minWeight, max: maxWeight };
}

const DIET_TRANSLATIONS: Record<string, string> = {
  casera_normal: "comida casera tradicional", keto: "dieta cetogénica (keto)",
  paleo: "dieta paleo", vegetariano: "dieta vegetariana", vegano: "dieta vegana",
  deportista: "dieta alta en proteínas para deportistas",
  mediterranea: "dieta mediterránea", ayuno_intermitente: "ayuno intermitente",
};

const GOAL_TRANSLATIONS: Record<string, string> = {
  lose_weight: "bajar de peso", gain_muscle: "ganar masa muscular",
  maintain: "mantener peso actual", eat_healthy: "comer más saludable",
};

const GENDER_TRANSLATIONS: Record<string, string> = {
  male: "masculino", female: "femenino", other: "otro",
};

export function buildUserContext(profile: UserProfile): string {
  const country = profile.country || "AR";
  const countryName = COUNTRY_NAMES[country] || country;

  let ctx = `\n\n═══════════════════════════════════════\nPERFIL DEL USUARIO:\n═══════════════════════════════════════`;
  ctx += `\n\n🌍 PAÍS: ${countryName} (${country})`;
  ctx += `\n⚠️ IMPORTANTE: USA nombres de ingredientes como se conocen en ${countryName}.`;

  if (profile.name) ctx += `\n\n👤 Nombre: ${profile.name}`;

  if (profile.age && profile.height && profile.weight) {
    ctx += `\n\n📊 DATOS FÍSICOS:\n- Edad: ${profile.age} años\n- Altura: ${profile.height} cm\n- Peso: ${profile.weight} kg`;
    if (profile.gender) ctx += `\n- Género: ${GENDER_TRANSLATIONS[profile.gender] || profile.gender}`;

    if (profile.bmi && profile.height && profile.gender) {
      const bmi = classifyBMI(profile.bmi);
      const ideal = calculateIdealWeight(profile.height, profile.gender);
      const diff = profile.weight ? Math.round(profile.weight - ideal.ideal) : 0;
      ctx += `\n\n📈 ANÁLISIS DE PESO:\n- IMC: ${profile.bmi.toFixed(1)} (${bmi.status}) ${bmi.emoji}`;
      ctx += `\n- Peso ideal: ${ideal.ideal} kg | Rango: ${ideal.min}-${ideal.max} kg`;
      if (diff > 0) ctx += `\n- Por perder para peso ideal: ${diff} kg`;
      else if (diff < 0) ctx += `\n- Por ganar para peso ideal: ${Math.abs(diff)} kg`;
      else ctx += `\n- ¡Estás en tu peso ideal! 🎉`;
      ctx += `\n- ${bmi.recommendation}`;
    }

    const cal = profile.daily_calorie_goal || calculateDailyCalories(profile);
    if (cal) {
      ctx += `\n\n🔥 REQUERIMIENTO CALÓRICO:\n- Calorías diarias: ~${cal} kcal\n- Por comida principal: ~${Math.round(cal / 3)} kcal`;
    }

    if (profile.protein_goal || profile.carbs_goal || profile.fat_goal) {
      ctx += `\n\n🥗 MACROS OBJETIVO:`;
      if (profile.protein_goal) ctx += `\n- Proteínas: ${profile.protein_goal}g`;
      if (profile.carbs_goal) ctx += `\n- Carbohidratos: ${profile.carbs_goal}g`;
      if (profile.fat_goal) ctx += `\n- Grasas: ${profile.fat_goal}g`;
    }
  }

  if (profile.fitness_goal) ctx += `\n\n🎯 OBJETIVO: ${(GOAL_TRANSLATIONS[profile.fitness_goal] || profile.fitness_goal).toUpperCase()}`;
  if (profile.diet_type) ctx += `\n\n🍽️ TIPO DE DIETA: ${DIET_TRANSLATIONS[profile.diet_type] || profile.diet_type}`;

  const restrictions = profile.dietary_restrictions ?? [];
  if (restrictions.length > 0) {
    ctx += `\n\n⚠️ RESTRICCIONES: ${restrictions.join(", ")}\n   ¡NUNCA sugieras recetas que las violen!`;
  }

  const allergies = profile.allergies ?? [];
  if (allergies.length > 0) {
    ctx += `\n\n🚫 ALERGIAS: ${allergies.join(", ")}\n   ¡NUNCA uses estos ingredientes!`;
  }

  const cuisines = profile.cuisine_preferences ?? [];
  if (cuisines.length > 0) ctx += `\n\n❤️ Cocinas favoritas: ${cuisines.join(", ")}`;

  ctx += `\n\n🏠 CONTEXTO:`;
  if (profile.household_size) ctx += `\n- Cocina para: ${profile.household_size} persona(s)`;
  if (profile.cooking_skill_level) ctx += `\n- Nivel: ${profile.cooking_skill_level}`;
  if (profile.max_prep_time) ctx += `\n- Tiempo máx: ${profile.max_prep_time} min`;
  if (profile.snack_preference) {
    const meals = { "3meals": "3 comidas", "4meals": "4 comidas (con 1 snack)", "5meals": "5 comidas (con 2 snacks)" };
    ctx += `\n- Comidas/día: ${meals[profile.snack_preference as keyof typeof meals] || profile.snack_preference}`;
  }
  if (profile.flexible_mode !== undefined) {
    ctx += `\n- Modo flexible: ${profile.flexible_mode ? "Sí (puede sugerir sustitutos)" : "No (ingredientes exactos)"}`;
  }

  ctx += `\n\n🌍 LOCALIZACIÓN:\n- Usuario en ${countryName}. USA NOMBRES DE INGREDIENTES DE ESE PAÍS.\n═══════════════════════════════════════`;
  ctx += `\n\n${INGREDIENT_LOCALIZATION_GUIDE}`;

  return ctx;
}

// ─── Base Agent ─────────────────────────────────────────────────────────────

export abstract class BaseAgent {
  abstract readonly type: AgentType;
  abstract readonly baseSystemPrompt: string;
  abstract readonly agentSuffix: string;
  readonly temperature: number = 0.8;
  readonly topP?: number;

  buildSystemPrompt(profile: UserProfile | null): string {
    const userCtx = profile ? buildUserContext(profile) : "";
    return this.baseSystemPrompt + this.agentSuffix + userCtx;
  }

  buildGeminiContents(ctx: AgentContext): GeminiContent[] {
    const systemPrompt = this.buildSystemPrompt(ctx.userProfile);
    const contents: GeminiContent[] = [
      { role: "user", parts: [{ text: systemPrompt }] },
      {
        role: "model",
        parts: [{ text: "Entendido. Soy Chef AI, tu asistente de cocina y nutrición. Estoy listo para ayudarte." }],
      },
    ];

    // Conversation history (last 10)
    for (const msg of ctx.conversationHistory.slice(-10)) {
      const content = msg.role === "user"
        ? sanitizeInput(msg.content).sanitized
        : msg.content;
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: content }],
      });
    }

    // Current messages
    for (let i = 0; i < ctx.messages.length; i++) {
      const msg = ctx.messages[i];
      const isLast = i === ctx.messages.length - 1 && msg.role === "user";
      const parts: GeminiContent["parts"] = [];

      if (isLast && ctx.images.length > 0) {
        for (const img of ctx.images) {
          if (img.base64 && img.mimeType) {
            parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
          }
        }
      }

      if (msg.content) parts.push({ text: msg.content });
      contents.push({ role: msg.role === "assistant" ? "model" : "user", parts });
    }

    return contents;
  }

  async handle(ctx: AgentContext): Promise<ReadableStream<Uint8Array>> {
    const contents = this.buildGeminiContents(ctx);
    return callGeminiStream(contents, {
      temperature: this.temperature,
      maxOutputTokens: 2048,
      topP: this.topP,
    });
  }
}
