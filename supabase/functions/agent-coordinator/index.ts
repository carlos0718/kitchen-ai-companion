// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.0";

import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { detectAgentType } from "../_shared/agent-router.ts";
import { sanitizeInput, getOffTopicResponse } from "../_shared/agents/base-agent.ts";
import type { AgentContext, AgentType, ChatMessage, ImageData, UserProfile } from "../_shared/types.ts";

import { ChefAgent } from "../_shared/agents/chef-agent.ts";
import { NutricionistaAgent } from "../_shared/agents/nutricionista-agent.ts";
import { ComprasAgent } from "../_shared/agents/compras-agent.ts";
import { PlanificadorAgent } from "../_shared/agents/planificador-agent.ts";

// ─── Agent registry ──────────────────────────────────────────────────────────

const AGENTS: Record<AgentType, ChefAgent | NutricionistaAgent | ComprasAgent | PlanificadorAgent> = {
  chef:          new ChefAgent(),
  nutricionista: new NutricionistaAgent(),
  compras:       new ComprasAgent(),
  planificador:  new PlanificadorAgent(),
};

// ─── Helper: off-topic SSE response ─────────────────────────────────────────

function offTopicStream(req: Request, reason: string, agentType: AgentType): Response {
  const encoder = new TextEncoder();
  const text = getOffTopicResponse(reason);
  const metaEvent = JSON.stringify({ agent_type: agentType });
  const dataEvent = JSON.stringify({
    choices: [{ delta: { content: text }, index: 0 }],
  });
  const body = encoder.encode(
    `data: ${metaEvent}\n\ndata: ${dataEvent}\n\ndata: [DONE]\n\n`,
  );
  return new Response(body, {
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Agent-Type": agentType,
    },
  });
}

// ─── Main handler ────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { messages, conversationHistory, user_id } = await req.json() as {
      messages: Array<{ role: string; content: string; images?: ImageData[] }>;
      conversationHistory?: ChatMessage[];
      user_id?: string;
    };

    // Validate input
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("Formato de mensaje inválido");
    }

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || typeof lastMsg.content !== "string") {
      throw new Error("Mensaje vacío o inválido");
    }

    const images: ImageData[] = (lastMsg as { role: string; content: string; images?: ImageData[] }).images ?? [];
    const rawText = lastMsg.content.trim() || (images.length > 0 ? "¿Qué hay en esta imagen?" : "");
    if (!rawText) throw new Error("Mensaje vacío o inválido");

    // Sanitize
    const sanitized = sanitizeInput(rawText);
    if (sanitized.hasPotentialInjection) {
      console.warn("[SECURITY] Potential injection from user:", user_id);
    }

    // Detect agent type
    const agentType = detectAgentType(sanitized.sanitized);
    console.log(`[COORDINATOR] agent=${agentType} user=${user_id ?? "anonymous"}`);

    // Block off-topic
    if (sanitized.isOffTopic && sanitized.offTopicReason) {
      console.log("[SECURITY] Off-topic blocked:", sanitized.offTopicReason);
      return offTopicStream(req, sanitized.offTopicReason, agentType);
    }

    // Load user profile
    let userProfile: UserProfile | null = null;
    if (user_id) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const { data } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", user_id)
          .single();
        userProfile = data;
      } catch (err) {
        console.error("Error loading profile:", err);
      }
    }

    // Sanitize message history
    const sanitizedMessages: ChatMessage[] = messages.map((msg, i) => {
      if (msg.role === "user" && typeof msg.content === "string") {
        const isLast = i === messages.length - 1;
        return {
          role: "user" as const,
          content: isLast ? sanitized.sanitized : sanitizeInput(msg.content).sanitized,
        };
      }
      return { role: msg.role as "user" | "assistant", content: msg.content };
    });

    // Build context and delegate to agent
    const ctx: AgentContext = {
      userProfile,
      conversationHistory: (conversationHistory ?? []) as ChatMessage[],
      messages: sanitizedMessages,
      images,
      userMessageText: sanitized.sanitized,
    };

    const agent = AGENTS[agentType];
    const geminiStream = await agent.handle(ctx);

    // Prepend agent metadata as first SSE event, then pipe Gemini stream
    const encoder = new TextEncoder();
    const metaChunk = encoder.encode(
      `data: ${JSON.stringify({ agent_type: agentType })}\n\n`,
    );

    const combinedStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(metaChunk);
        const reader = geminiStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(combinedStream, {
      headers: {
        ...getCorsHeaders(req),
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Agent-Type": agentType,
      },
    });
  } catch (error) {
    console.error("[COORDINATOR] Error:", error);

    const safeErrors = ["Formato de mensaje inválido", "Mensaje vacío o inválido"];
    const clientMsg = error instanceof Error && safeErrors.includes(error.message)
      ? error.message
      : error instanceof Error && error.message === "rate_limit"
      ? "Demasiadas solicitudes. Por favor espera un momento."
      : "Ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo.";

    return new Response(JSON.stringify({ error: clientMsg }), {
      status: error instanceof Error && error.message === "rate_limit" ? 429 : 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
