# Plan: Mejora de System Prompts con Técnicas de Prompt Engineering

## Contexto

El proyecto Kitchen AI Companion usa Gemini 2.5 Flash Lite en múltiples agentes (Chef, Nutricionista, Planificador, Compras) y en la generación de planes de comida. Los prompts actuales funcionan, pero carecen de:
- **Few-Shot**: no hay ejemplos concretos de respuestas ideales
- **Chain-of-Thought**: no hay instrucción de razonamiento paso a paso antes de responder
- **Parámetros de generación**: `top_p` no está configurado en ningún agente; `temperature` es 0.8 para TODO incluso donde se genera JSON (riesgo de respuestas inválidas)

El objetivo es mejorar la calidad, consistencia y precisión de las respuestas sin cambiar el comportamiento visible para el usuario.

---

## Conceptos Aplicados

### 1. Few-Shot Prompting
Incluir 1-2 ejemplos completos de input → output en el prompt del sistema. El modelo "aprende por imitación" del ejemplo. Aplica donde necesitamos un formato de respuesta muy específico.

### 2. Chain-of-Thought (CoT)
Añadir una instrucción interna de "piensa paso a paso antes de responder". El modelo razona internamente (sin escribirlo en la respuesta) antes de comprometerse con una respuesta. Mejora precisión en cálculos de macros y análisis de dietas.

### 3. ReAct (Reasoning + Acting)
Patrón Thought → Action → Observation. No aplica directamente (requiere herramientas externas / agentes multi-step), pero se simula con CoT estructurado en agentes de análisis nutricional.

### 4. Temperature

Controla qué tan "creativo" o "determinista" es el modelo al elegir cada token. A mayor temperatura, más variedad y creatividad; a menor temperatura, más consistencia y precisión.

| Rango | Comportamiento | Casos de uso ideales |
|---|---|---|
| **0.0 – 0.2** | Casi determinista. Siempre elige el token más probable. Respuestas muy repetitivas. | Clasificación, extracción de datos, respuestas de sí/no |
| **0.3 – 0.5** | Bajo. Alta consistencia con algo de variación. Ideal para **output estructurado**. | JSON, SQL, código, datos numéricos, macros nutricionales |
| **0.6 – 0.7** | Moderado. Equilibrio entre precisión y naturalidad. | Análisis, explicaciones técnicas, planificación |
| **0.7 – 0.8** | Medio-alto. Respuestas más variadas y fluidas. Riesgo de imprecisión en datos. | Conversación general, recetas creativas, sugerencias |
| **0.9 – 1.0** | Alto. Muy creativo, impredecible. Puede alucinar datos o perder estructura. | Brainstorming, escritura creativa libre |
| **> 1.0** | Experimental. Respuestas caóticas, poco coherentes. | No recomendado para producción |

**Valores elegidos en este proyecto:**
- Chat/recetas creativas: **0.75** (bajado de 0.8 — mantiene creatividad, reduce alucinaciones de macros)
- Análisis nutricional: **0.6** (precisión con lenguaje natural fluido)
- Planificador / Compras: **0.7** (estructurado pero con variedad de sugerencias)
- JSON estructurado (meal plan): **0.35** — crítico reducirlo, 0.8 causaba JSON inválido con campos mal formateados

### 5. top_p (Nucleus Sampling)
No estaba configurado en ningún agente (solo temperature). Se añadió:
- Chat (Chef): `top_p = 0.9`
- Nutricionista: `top_p = 0.85`
- Planificador: `top_p = 0.9`
- Compras: `top_p = 0.88`
- JSON (meal plan): `top_p = 0.8`

---

## Archivos Modificados

| Archivo | Cambio |
|---|---|
| `supabase/functions/_shared/types.ts` | Añadido `topP?: number` y `topK?: number` a `GenerationConfig` |
| `supabase/functions/_shared/gemini.ts` | `topP`/`topK` se pasan al payload de la API en ambas funciones |
| `supabase/functions/_shared/agents/base-agent.ts` | Propiedad `topP?: number` + se pasa a `callGeminiStream` en `handle()` |
| `supabase/functions/_shared/agents/chef-agent.ts` | Temperature 0.75, topP 0.9, Few-Shot (hamburguesa) + CoT (5 pasos) |
| `supabase/functions/_shared/agents/nutricionista-agent.ts` | topP 0.85, CoT (análisis nutricional 5 pasos) + Few-Shot (tabla macros arroz) |
| `supabase/functions/_shared/agents/planificador-agent.ts` | Temperature 0.7, topP 0.9, Few-Shot (formato día completo) |
| `supabase/functions/_shared/agents/compras-agent.ts` | Temperature 0.7, topP 0.88 |
| `supabase/functions/generate-meal-plan/index.ts` | Temperature **0.35** (×2 fetch), topP 0.8, Few-Shot JSON completo, CoT en `buildMealPrompt` |

---

## Resumen de Parámetros por Agente

| Agente | Temperature | top_p | Few-Shot | CoT |
|---|---|---|---|---|
| Chef | 0.75 | 0.9 | ✅ Hamburguesa + VEREDICTO | ✅ 5 pasos |
| Nutricionista | 0.6 | 0.85 | ✅ Arroz + tabla macros | ✅ 5 pasos |
| Planificador | 0.7 | 0.9 | ✅ Formato día completo | — |
| Compras | 0.7 | 0.88 | — | — |
| Meal Plan (JSON) | 0.35 | 0.8 | ✅ JSON completo avena | ✅ 5 pasos |

---

## Deploy

```bash
npx supabase functions deploy chat-cocina --no-verify-jwt
npx supabase functions deploy generate-meal-plan --no-verify-jwt
```
