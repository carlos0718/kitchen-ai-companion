-- Check meal plans for the current week
SELECT 
  id,
  user_id,
  name,
  week_start_date,
  week_end_date,
  created_at
FROM meal_plans
WHERE week_start_date >= '2025-12-22' AND week_start_date <= '2025-12-27'
ORDER BY created_at DESC;

-- Check meal plan items for recent dates
SELECT 
  mpi.id,
  mpi.meal_plan_id,
  mpi.date,
  mpi.meal_type,
  mpi.recipe_id,
  r.name as recipe_name,
  mpi.created_at
FROM meal_plan_items mpi
LEFT JOIN recipes r ON r.id = mpi.recipe_id
WHERE mpi.date >= '2025-12-22' AND mpi.date <= '2025-12-28'
ORDER BY mpi.date, mpi.meal_type;
