-- Add agent_type column to messages table to persist which AI agent generated each response
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS agent_type TEXT
    CHECK (agent_type IN ('chef', 'nutricionista', 'compras', 'planificador'));
