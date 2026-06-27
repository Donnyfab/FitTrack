import { supabase } from '@/lib/supabase';
import { chatJSON } from '@/api/openaiClient';

const FALLBACK_WORKOUTS = [
  {
    name: 'Push Day',
    date: new Date().toISOString().split('T')[0],
    muscle_group: 'Chest',
    notes: 'Sample workout — edit or delete anytime.',
    exercises: [
      {
        name: 'Bench Press',
        sets: [
          { reps: 8, weight: 135 },
          { reps: 8, weight: 155 },
          { reps: 6, weight: 175 },
        ],
      },
      {
        name: 'Overhead Press',
        sets: [
          { reps: 10, weight: 65 },
          { reps: 8, weight: 75 },
        ],
      },
    ],
  },
  {
    name: 'Leg Day',
    date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    muscle_group: 'Legs',
    notes: 'Sample leg session.',
    exercises: [
      {
        name: 'Squat',
        sets: [
          { reps: 5, weight: 185 },
          { reps: 5, weight: 205 },
        ],
      },
    ],
  },
];

const FALLBACK_GOALS = [
  {
    title: 'Bench 225 lbs',
    type: 'get_stronger',
    target: 'Hit 225 for 1 rep on bench press',
    status: 'active',
    progress: 35,
    notes: 'Sample goal — customize in Goals.',
  },
  {
    title: 'Train 4x per week',
    type: 'improve_consistency',
    target: 'Maintain a 4-day training split',
    status: 'active',
    progress: 50,
    notes: 'Sample consistency goal.',
  },
];

async function generateSampleDataWithAI() {
  return chatJSON(
    'You generate realistic fitness tracker seed data. Respond with JSON only: { "workouts": [...], "goals": [...] }. Workouts need name, date (YYYY-MM-DD), muscleGroup, notes, exercises[{name, sets[{reps, weight}]}]. Goals need title, type (build_muscle|lose_weight|get_stronger|improve_consistency), target, status (active), progress (0-100), notes. Provide 2 workouts and 2 goals.',
    'Create beginner-friendly sample workouts and goals for a new user starting a fitness tracker app.'
  );
}

function mapWorkoutForInsert(workout, userId) {
  return {
    user_id: userId,
    name: workout.name,
    date: workout.date,
    muscle_group: workout.muscleGroup || workout.muscle_group || null,
    notes: workout.notes || null,
    exercises: workout.exercises || [],
  };
}

function mapGoalForInsert(goal, userId) {
  return {
    user_id: userId,
    title: goal.title,
    type: goal.type,
    target: goal.target || null,
    deadline: goal.deadline || null,
    status: goal.status || 'active',
    progress: Number(goal.progress) || 0,
    notes: goal.notes || null,
  };
}

export async function seedSampleDataIfNeeded(userId) {
  const { count, error: countError } = await supabase
    .from('workouts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (countError || (count ?? 0) > 0) {
    return;
  }

  let workouts = FALLBACK_WORKOUTS;
  let goals = FALLBACK_GOALS;

  try {
    const generated = await generateSampleDataWithAI();
    if (generated?.workouts?.length) workouts = generated.workouts;
    if (generated?.goals?.length) goals = generated.goals;
  } catch {
    // Use static fallbacks when OpenAI edge function is not configured
  }

  const workoutRows = workouts.map((w) => mapWorkoutForInsert(w, userId));
  const goalRows = goals.map((g) => mapGoalForInsert(g, userId));

  await supabase.from('workouts').insert(workoutRows);
  await supabase.from('goals').insert(goalRows);
}
