export const MUSCLE_GROUPS = [
  "Chest", "Back", "Shoulders", "Arms", "Legs", "Glutes", "Core", "Full Body", "Cardio"
];

export const GOAL_TYPES = [
  { value: "build_muscle", label: "Build Muscle" },
  { value: "lose_weight", label: "Lose Weight" },
  { value: "get_stronger", label: "Get Stronger" },
  { value: "improve_consistency", label: "Improve Consistency" },
];

export const GOAL_STATUSES = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "paused", label: "Paused" },
];

export const getGoalTypeLabel = (value) =>
  GOAL_TYPES.find((t) => t.value === value)?.label || value;

export const getGoalStatusLabel = (value) =>
  GOAL_STATUSES.find((s) => s.value === value)?.label || value;
