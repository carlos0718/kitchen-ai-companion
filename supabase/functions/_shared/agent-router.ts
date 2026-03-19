// deno-lint-ignore-file
import type { AgentType } from "./types.ts";

interface RouterPattern {
  type: AgentType;
  pattern: RegExp;
}

// Order matters: more specific patterns first
const AGENT_PATTERNS: RouterPattern[] = [
  {
    type: "compras",
    pattern:
      /lista de compras|comprar|sustituto|reemplazar|tengo en casa|qu[eé] puedo usar|supermercado|presupuesto/i,
  },
  {
    type: "planificador",
    pattern:
      /planificar|plan semanal|men[uú] semanal|organizar comidas|qu[eé] como esta semana|programar.*comidas|distribuci[oó]n.*comidas|horario.*comidas/i,
  },
  {
    type: "nutricionista",
    pattern:
      /calorías|proteínas|carbohidratos|macros|nutrici[oó]n|nutricional|déficit|superávit|imc|keto|vegano|vegetariano|fibra|vitaminas|minerales|cu[aá]ntas calorías|an[aá]lisis nutricional/i,
  },
  {
    type: "chef",
    pattern:
      /receta|preparar|cocinar|c[oó]mo (hago|se hace|preparo|cocino)|t[eé]cnica|asar|hornear|hervir|fre[ií]r|saltear|guiso|estofado|postre|torta|pizza|pasta\b|sopa\b/i,
  },
];

export function detectAgentType(message: string): AgentType {
  for (const { type, pattern } of AGENT_PATTERNS) {
    if (pattern.test(message)) {
      return type;
    }
  }
  // Default: chef handles most cooking queries
  return "chef";
}
