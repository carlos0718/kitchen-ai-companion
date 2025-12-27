-- Check recent meal plan items
SELECT 
  mpi.id,
  mpi.date,
  mpi.meal_type,
  mpi.created_at,
  r.name as recipe_name
FROM meal_plan_items mpi
LEFT JOIN recipes r ON r.id = mpi.recipe_id
WHERE mpi.date >= '2025-12-27'
ORDER BY mpi.created_at DESC
LIMIT 10;
