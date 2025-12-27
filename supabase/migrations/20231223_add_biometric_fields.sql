-- Add biometric fields to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS height DECIMAL(5,2), -- in cm
ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2), -- in kg
ADD COLUMN IF NOT EXISTS bmi DECIMAL(4,2),
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- Add comment to explain the fields
COMMENT ON COLUMN user_profiles.age IS 'User age in years';
COMMENT ON COLUMN user_profiles.height IS 'User height in centimeters';
COMMENT ON COLUMN user_profiles.weight IS 'User weight in kilograms';
COMMENT ON COLUMN user_profiles.bmi IS 'Body Mass Index (calculated from height and weight)';
COMMENT ON COLUMN user_profiles.gender IS 'User gender for better nutritional recommendations';
