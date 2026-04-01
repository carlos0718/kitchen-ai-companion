// deno-lint-ignore-file
import type { GeminiContent, GenerationConfig } from "./types.ts";

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}`;

function getApiKey(): string {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("Error de configuración del servidor");
  return key;
}

/**
 * Streaming call to Gemini — returns a ReadableStream in OpenAI SSE format.
 * The caller is responsible for including the agent_type metadata before this stream.
 */
export async function callGeminiStream(
  contents: GeminiContent[],
  config: GenerationConfig = {},
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = getApiKey();
  const response = await fetch(
    `${BASE_URL}:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: config.temperature ?? 0.8,
          maxOutputTokens: config.maxOutputTokens ?? 2048,
          ...(config.topP !== undefined && { topP: config.topP }),
          ...(config.topK !== undefined && { topK: config.topK }),
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini stream error:", response.status, errorText);
    if (response.status === 429) throw new Error("rate_limit");
    throw new Error("gemini_error");
  }

  const reader = response.body!.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                const openaiFormat = {
                  choices: [{ delta: { content: text }, index: 0 }],
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`),
                );
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

/**
 * Non-streaming call to Gemini — returns parsed JSON from the response text.
 * Used by generate-meal-plan and generate-shopping-list.
 */
export async function callGeminiJSON<T = unknown>(
  contents: GeminiContent[],
  config: GenerationConfig = {},
): Promise<T> {
  const apiKey = getApiKey();
  const response = await fetch(
    `${BASE_URL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: config.temperature ?? 0.7,
          maxOutputTokens: config.maxOutputTokens ?? 2000,
          ...(config.topP !== undefined && { topP: config.topP }),
          ...(config.topK !== undefined && { topK: config.topK }),
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini JSON error:", response.status, errorText);
    throw new Error("gemini_error");
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Extract JSON from the response text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Gemini response");

  return JSON.parse(jsonMatch[0]) as T;
}
