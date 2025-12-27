-- Add nutritional improvement fields to user_profiles table
-- These fields enable:
-- 1. Diet type selection (casera_normal, keto, paleo, etc.)
-- 2. Snack preferences (3, 4, or 5 meals per day)
-- 3. Flexible mode for ingredient substitutions

-- Add new columns to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS diet_type TEXT DEFAULT 'casera_normal',
ADD COLUMN IF NOT EXISTS flexible_mode BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS snack_preference TEXT DEFAULT '3meals';

-- Update constraint for meal_type to support snacks
ALTER TABLE meal_plan_items
DROP CONSTRAINT IF EXISTS meal_plan_items_meal_type_check;

ALTER TABLE meal_plan_items
ADD CONSTRAINT meal_plan_items_meal_type_check
CHECK (meal_type IN ('breakfast', 'mid_morning_snack', 'lunch', 'afternoon_snack', 'dinner'));

-- Create index for faster diet_type lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_diet_type ON user_profiles(diet_type);

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.diet_type IS 'Type of diet plan: casera_normal, keto, paleo, vegetariano, vegano, deportista';
COMMENT ON COLUMN user_profiles.flexible_mode IS 'Allow ingredient substitutions if exact ingredients unavailable';
COMMENT ON COLUMN user_profiles.snack_preference IS 'Number of meals per day: 3meals, 4meals, or 5meals';
