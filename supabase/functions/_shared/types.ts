// deno-lint-ignore-file
export type AgentType = "chef" | "nutricionista" | "compras" | "planificador";

export interface UserProfile {
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

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ImageData {
  base64: string;
  mimeType: string;
}

export interface AgentContext {
  userProfile: UserProfile | null;
  conversationHistory: ChatMessage[];
  messages: ChatMessage[];
  images: ImageData[];
  userMessageText: string;
}

export interface SanitizationResult {
  sanitized: string;
  isOffTopic: boolean;
  offTopicReason?: string;
  hasPotentialInjection: boolean;
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface GenerationConfig {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}
