const DAY = 86400000;

const DEFAULT_TIP = "Track controlled reps and keep your setup consistent.";

const iconByMuscleGroup = {
  Abs: "abs",
  Back: "back",
  Biceps: "biceps",
  Calves: "calves",
  Cardio: "cardio",
  Chest: "chest",
  Forearms: "forearms",
  Glutes: "glutes",
  Hamstrings: "hamstrings",
  Hips: "hips",
  Neck: "neck",
  Quadriceps: "quadriceps",
  Shoulders: "shoulders",
  Triceps: "triceps",
};

const catalogSections = [
  {
    muscleGroup: "Chest",
    equipment: "Barbell",
    names: [
      "Bench Press",
      "Incline Bench Press",
      "Decline Bench Press",
      "Close-Grip Bench Press",
      "Reverse-Grip Bench Press",
      "Barbell Floor Press",
    ],
  },
  {
    muscleGroup: "Chest",
    equipment: "Dumbbell",
    names: [
      "Dumbbell Bench Press",
      "Incline Dumbbell Press",
      "Dumbbell Incline Bench Press",
      "Dumbbell Floor Press",
      "Dumbbell Squeeze Press",
      "Lying Hammer Press",
      "Dumbbell Arnold Chest Press",
      "Exercise Ball Dumbbell Bench Press",
      "Dumbbell Fly",
      "Dumbbell Incline Fly",
    ],
  },
  {
    muscleGroup: "Chest",
    equipment: "Smith machine",
    names: ["Smith Bench Press", "Smith Incline Bench Press"],
  },
  {
    muscleGroup: "Chest",
    equipment: "Leverage machine",
    names: [
      "Lever Chest Press",
      "Lever Incline Chest Press",
      "Lever Lying Chest Press",
      "Machine Chest Press",
      "Assisted Dip Machine",
      "Machine Dip",
      "Lever Seated Fly",
      "Lever Pec Deck Fly",
    ],
  },
  {
    muscleGroup: "Chest",
    equipment: "Cable",
    names: [
      "Cable Standing Fly",
      "Cable Seated Fly",
      "Cable Low Fly",
      "Cable Middle Fly",
      "Cable Crossover",
      "High-to-Low Cable Fly",
      "Low-to-High Cable Fly",
      "Single-Arm Cable Fly",
      "Cable Fly",
    ],
  },
  {
    muscleGroup: "Chest",
    equipment: "Body weight",
    names: [
      "Push-Up",
      "Wide-Hand Push-Up",
      "Incline Push-Up",
      "Decline Push-Up",
      "Diamond Push-Up",
      "Archer Push-Up",
      "Deficit Push-Up",
      "Clap Push-Up",
      "Chest Dip",
      "Incline Chest Fly",
      "Standing Chest Fly",
      "Seated Chest Fly",
    ],
  },
  {
    muscleGroup: "Chest",
    equipment: "Weighted",
    names: ["Weighted Push-Up", "Weighted Chest Dip"],
  },
  {
    muscleGroup: "Chest",
    equipment: "Medicine Ball",
    names: ["Medicine Ball Push-Up"],
  },
  {
    muscleGroup: "Chest",
    equipment: "Plate",
    names: ["Svend Press / Plate Press"],
  },
  {
    muscleGroup: "Chest",
    equipment: "Dumbbell",
    names: ["Pullover"],
  },

  {
    muscleGroup: "Shoulders",
    equipment: "Barbell",
    names: [
      "Barbell Standing Shoulder Press",
      "Barbell Seated Shoulder Press",
      "Military Press",
      "Push Press",
      "Barbell Upright Row",
      "Barbell Front Raise",
      "Behind-the-Neck Press",
    ],
  },
  {
    muscleGroup: "Shoulders",
    equipment: "Dumbbell",
    names: [
      "Dumbbell Shoulder Press",
      "Seated Dumbbell Shoulder Press",
      "Arnold Press",
      "Dumbbell Lateral Raise",
      "Lateral Raise",
      "Seated Lateral Raise",
      "Dumbbell Front Raise",
      "Dumbbell Rear Delt Raise",
      "Dumbbell Rear Delt Fly",
      "Rear Delt Fly",
      "Dumbbell Upright Row",
      "Dumbbell Cuban Press",
      "Dumbbell Y-Raise",
      "Dumbbell Scaption Raise",
    ],
  },
  {
    muscleGroup: "Shoulders",
    equipment: "Cable",
    names: [
      "Cable One-Arm Lateral Raise",
      "Cable Front Raise",
      "Cable Rear Delt Fly",
      "Cable Standing Rear Delt Row",
      "Cable Face Pull with Rope",
      "Cable Upright Row",
      "Cable Y-Raise",
      "Cable External Rotation",
    ],
  },
  {
    muscleGroup: "Shoulders",
    equipment: "Leverage machine",
    names: [
      "Lever Seated Shoulder Press",
      "Lever Lateral Raise",
      "Lever Seated Reverse Fly",
      "Reverse Pec Deck Fly",
      "Machine Shoulder Press",
      "Machine Lateral Raise",
    ],
  },
  {
    muscleGroup: "Shoulders",
    equipment: "Smith machine",
    names: ["Smith Seated Shoulder Press", "Smith Standing Shoulder Press", "Smith Upright Row"],
  },
  {
    muscleGroup: "Shoulders",
    equipment: "Body weight",
    names: ["Pike Push-Up", "Handstand Push-Up", "Wall Handstand Push-Up", "Shoulder Tap Push-Up", "Plank to Downward Dog"],
  },
  {
    muscleGroup: "Shoulders",
    equipment: "Band",
    names: ["Band Face Pull", "Band Pull-Apart", "Band Lateral Raise", "Band Front Raise", "Band External Rotation"],
  },

  {
    muscleGroup: "Triceps",
    equipment: "Barbell",
    names: ["Barbell Skull Crusher", "EZ-Bar Skull Crusher", "Barbell Overhead Triceps Extension", "JM Press"],
  },
  {
    muscleGroup: "Triceps",
    equipment: "Dumbbell",
    names: [
      "Dumbbell Skull Crusher",
      "Dumbbell Overhead Triceps Extension",
      "Overhead Triceps Extension",
      "Single-Arm Dumbbell Overhead Extension",
      "Dumbbell Kickback",
      "Seated Dumbbell Triceps Extension",
      "Lying Dumbbell Triceps Extension",
      "Tate Press",
    ],
  },
  {
    muscleGroup: "Triceps",
    equipment: "Cable",
    names: [
      "Cable Triceps Pushdown",
      "Rope Triceps Pushdown",
      "Straight-Bar Triceps Pushdown",
      "Reverse-Grip Triceps Pushdown",
      "Cable Overhead Triceps Extension",
      "Single-Arm Cable Pushdown",
      "Single-Arm Cable Overhead Extension",
      "Cable Kickback",
    ],
  },
  {
    muscleGroup: "Triceps",
    equipment: "Leverage machine",
    names: ["Machine Triceps Press", "Lever Triceps Extension", "Seated Dip Machine"],
  },
  {
    muscleGroup: "Triceps",
    equipment: "Smith machine",
    names: ["Smith Close-Grip Bench Press", "Smith JM Press", "Smith Reverse-Grip Bench Press"],
  },
  {
    muscleGroup: "Triceps",
    equipment: "Body weight",
    names: ["Bench Dip", "Parallel Bar Dip", "Close-Grip Push-Up", "Triceps Push-Up", "Bodyweight Skull Crusher", "Ring Dip"],
  },
  {
    muscleGroup: "Triceps",
    equipment: "Band",
    names: ["Band Triceps Pushdown", "Band Overhead Triceps Extension", "Band Kickback"],
  },

  {
    muscleGroup: "Biceps",
    equipment: "Barbell",
    names: [
      "Barbell Curl",
      "EZ-Bar Curl",
      "Wide-Grip EZ-Bar Curl",
      "Close-Grip EZ-Bar Curl",
      "Barbell Preacher Curl",
      "Drag Curl",
      "Cheat Curl",
      "Reverse Barbell Curl",
    ],
  },
  {
    muscleGroup: "Biceps",
    equipment: "Dumbbell",
    names: [
      "Dumbbell Curl",
      "Alternating Dumbbell Curl",
      "Hammer Curl",
      "Cross-Body Hammer Curl",
      "Incline Dumbbell Curl",
      "Incline Hammer Curl",
      "Concentration Curl",
      "Dumbbell Preacher Curl",
      "Spider Curl",
      "Zottman Curl",
      "Waiter Curl",
    ],
  },
  {
    muscleGroup: "Biceps",
    equipment: "Cable",
    names: ["Cable Curl", "Rope Hammer Curl", "Cable Preacher Curl", "Single-Arm Cable Curl", "Bayesian Cable Curl", "High Cable Curl", "Reverse Cable Curl"],
  },
  {
    muscleGroup: "Biceps",
    equipment: "Leverage machine",
    names: ["Machine Preacher Curl", "Machine Biceps Curl", "Lever Preacher Curl", "Lever Biceps Curl", "Preacher Curl"],
  },
  {
    muscleGroup: "Biceps",
    equipment: "Smith machine",
    names: ["Smith Drag Curl"],
  },
  {
    muscleGroup: "Biceps",
    equipment: "Body weight",
    names: ["Close-Grip Chin-Up", "Inverted Row with Supinated Grip"],
  },
  {
    muscleGroup: "Biceps",
    equipment: "Band",
    names: ["Band Biceps Curl", "Band Hammer Curl", "Band Reverse Curl"],
  },

  {
    muscleGroup: "Back",
    equipment: "Barbell",
    names: ["Barbell Deadlift", "Deadlift", "Barbell Bent-Over Row", "Pendlay Row", "Barbell T-Bar Row", "T-Bar Row", "Barbell Shrug", "Rack Pull", "Good Morning"],
  },
  {
    muscleGroup: "Back",
    equipment: "Dumbbell",
    names: [
      "Single-Arm Dumbbell Row",
      "Dumbbell Bent-Over Row",
      "Chest-Supported Dumbbell Row",
      "Chest-Supported Row",
      "Dumbbell Pullover",
      "Dumbbell Shrug",
      "Renegade Row",
      "Incline Bench Dumbbell Row",
    ],
  },
  {
    muscleGroup: "Back",
    equipment: "Cable",
    names: [
      "Lat Pulldown",
      "Wide-Grip Lat Pulldown",
      "Close-Grip Lat Pulldown",
      "Straight-Arm Pulldown",
      "Seated Cable Row",
      "One-Arm Cable Row",
      "Cable High Row",
      "Cable Face Pull",
      "Cable Pullover",
    ],
  },
  {
    muscleGroup: "Back",
    equipment: "Leverage machine",
    names: [
      "Machine Row",
      "Chest-Supported Row Machine",
      "Lever Row",
      "Lever High Row",
      "T-Bar Row Machine",
      "Assisted Pull-Up Machine",
      "Back Extension Machine",
      "Machine Pullover",
    ],
  },
  {
    muscleGroup: "Back",
    equipment: "Smith machine",
    names: ["Smith Machine Row", "Smith Machine Shrug", "Smith Rack Pull"],
  },
  {
    muscleGroup: "Back",
    equipment: "Body weight",
    names: ["Pull-Up", "Chin-Up", "Neutral-Grip Pull-Up", "Inverted Row", "Back Extension", "Superman", "Dead Hang"],
  },
  {
    muscleGroup: "Back",
    equipment: "Band",
    names: ["Band Row", "Band Lat Pulldown", "Band Straight-Arm Pulldown"],
  },

  {
    muscleGroup: "Abs",
    equipment: "Body weight",
    names: [
      "Crunch",
      "Sit-Up",
      "Reverse Crunch",
      "Bicycle Crunch",
      "V-Up",
      "Toe Touch",
      "Dead Bug",
      "Hollow Body Hold",
      "Mountain Climber",
      "Flutter Kick",
      "Scissor Kick",
      "Leg Raise",
      "Lying Knee Raise",
      "Plank",
      "Side Plank",
      "Plank Shoulder Tap",
      "Plank Up-Down",
      "RKC Plank",
      "Bird Dog",
      "Bear Crawl",
      "Bear Plank",
      "Hanging Knee Raise",
      "Hanging Leg Raise",
      "Hanging Windshield Wiper",
      "Captain's Chair Knee Raise",
      "Captain's Chair Leg Raise",
    ],
  },
  {
    muscleGroup: "Abs",
    equipment: "Cable",
    names: ["Cable Crunch", "Kneeling Cable Crunch", "Cable Woodchopper", "Cable Reverse Crunch", "Pallof Press", "Cable Rotation"],
  },
  {
    muscleGroup: "Abs",
    equipment: "Leverage machine",
    names: ["Ab Crunch Machine", "Decline Sit-Up", "Decline Crunch", "Roman Chair Sit-Up", "Back Extension Bench Side Bend"],
  },
  {
    muscleGroup: "Abs",
    equipment: "Weighted",
    names: ["Weighted Crunch", "Weighted Sit-Up", "Weighted Russian Twist", "Dumbbell Side Bend", "Plate Toe Touch"],
  },
  {
    muscleGroup: "Abs",
    equipment: "Ab roller",
    names: ["Ab Wheel Rollout"],
  },
  {
    muscleGroup: "Abs",
    equipment: "Stability ball",
    names: ["Stability Ball Crunch", "Stability Ball Rollout"],
  },
  {
    muscleGroup: "Abs",
    equipment: "Medicine Ball",
    names: ["Medicine Ball Slam", "Medicine Ball Russian Twist"],
  },
  {
    muscleGroup: "Abs",
    equipment: "Band",
    names: ["Band Pallof Press", "Band Woodchopper", "Band Crunch"],
  },

  {
    muscleGroup: "Quadriceps",
    equipment: "Barbell",
    names: ["Barbell Back Squat", "Back Squat", "Squat", "Barbell Front Squat", "Front Squat", "Barbell Hack Squat", "Zercher Squat", "Barbell Split Squat", "Barbell Walking Lunge", "Barbell Step-Up"],
  },
  {
    muscleGroup: "Quadriceps",
    equipment: "Dumbbell",
    names: [
      "Dumbbell Goblet Squat",
      "Dumbbell Split Squat",
      "Dumbbell Bulgarian Split Squat",
      "Dumbbell Walking Lunge",
      "Dumbbell Reverse Lunge",
      "Dumbbell Step-Up",
      "Dumbbell Front-Foot Elevated Split Squat",
      "Front-Foot Elevated Split Squat",
    ],
  },
  {
    muscleGroup: "Quadriceps",
    equipment: "Leverage machine",
    names: ["Leg Press", "Hack Squat Machine", "Hack Squat", "Pendulum Squat", "V-Squat Machine", "Leg Extension", "Machine Squat", "Belt Squat", "Assisted Sissy Squat Machine"],
  },
  {
    muscleGroup: "Quadriceps",
    equipment: "Smith machine",
    names: ["Smith Machine Squat", "Smith Machine Front Squat", "Smith Machine Split Squat", "Smith Machine Reverse Lunge"],
  },
  {
    muscleGroup: "Quadriceps",
    equipment: "Body weight",
    names: ["Bodyweight Squat", "Jump Squat", "Walking Lunge", "Reverse Lunge", "Bulgarian Split Squat", "Step-Up", "Wall Sit", "Sissy Squat", "Spanish Squat", "Step-Down"],
  },
  {
    muscleGroup: "Quadriceps",
    equipment: "Cable",
    names: ["Cable Squat", "Cable Reverse Lunge", "Cable Step-Up", "Cable Leg Extension"],
  },
  {
    muscleGroup: "Quadriceps",
    equipment: "Band",
    names: ["Band Squat", "Band Split Squat", "Band Leg Extension", "Band Step-Up", "Band Terminal Knee Extension", "Terminal Knee Extension"],
  },

  {
    muscleGroup: "Hamstrings",
    equipment: "Barbell",
    names: [
      "Barbell Romanian Deadlift",
      "Romanian Deadlift",
      "Barbell Stiff-Leg Deadlift",
      "Barbell Good Morning",
      "Barbell Hip Thrust",
      "Barbell Glute Bridge",
      "Barbell Sumo Deadlift",
      "Barbell Rack Pull",
    ],
  },
  {
    muscleGroup: "Hamstrings",
    equipment: "Dumbbell",
    names: [
      "Dumbbell Romanian Deadlift",
      "Single-Leg Dumbbell Romanian Deadlift",
      "Dumbbell Stiff-Leg Deadlift",
      "Dumbbell Good Morning",
      "Dumbbell Leg Curl",
      "Dumbbell Hip Thrust",
      "Dumbbell Glute Bridge",
    ],
  },
  {
    muscleGroup: "Hamstrings",
    equipment: "Leverage machine",
    names: ["Seated Leg Curl", "Lying Leg Curl", "Standing Leg Curl", "Single-Leg Curl Machine", "Glute-Ham Raise", "Nordic Hamstring Curl Machine", "Nordic Hamstring Curl", "Smith Machine Romanian Deadlift", "Smith Machine Good Morning"],
  },
  {
    muscleGroup: "Hamstrings",
    equipment: "Cable",
    names: ["Cable Pull-Through", "Cable Romanian Deadlift", "Cable Leg Curl", "Cable Single-Leg Curl", "Cable Kickback"],
  },
  {
    muscleGroup: "Hamstrings",
    equipment: "Body weight",
    names: ["Glute Bridge", "Single-Leg Glute Bridge", "Sliding Hamstring Curl", "Stability Ball Hamstring Curl", "Reverse Plank", "Hamstring Walkout"],
  },
  {
    muscleGroup: "Hamstrings",
    equipment: "Band",
    names: ["Band Leg Curl", "Band Romanian Deadlift", "Band Good Morning", "Band Pull-Through"],
  },

  {
    muscleGroup: "Glutes",
    equipment: "Barbell",
    names: ["Hip Thrust", "Barbell Walking Lunge", "Barbell Bulgarian Split Squat", "Barbell Step-Up"],
  },
  {
    muscleGroup: "Glutes",
    equipment: "Dumbbell",
    names: ["Dumbbell Sumo Squat", "Dumbbell Walking Lunge", "Dumbbell Bulgarian Split Squat", "Dumbbell Step-Up", "Dumbbell Curtsy Lunge"],
  },
  {
    muscleGroup: "Glutes",
    equipment: "Leverage machine",
    names: ["Hip Thrust Machine", "Glute Bridge Machine", "Glute Kickback Machine", "Hip Abduction Machine", "Single-Leg Leg Press", "Smith Machine Hip Thrust", "Smith Machine Glute Bridge"],
  },
  {
    muscleGroup: "Glutes",
    equipment: "Cable",
    names: ["Cable Glute Kickback", "Cable Hip Abduction"],
  },
  {
    muscleGroup: "Glutes",
    equipment: "Body weight",
    names: ["Single-Leg Hip Thrust", "Frog Pump", "Donkey Kick", "Fire Hydrant", "Clamshell", "Curtsy Lunge"],
  },
  {
    muscleGroup: "Glutes",
    equipment: "Band",
    names: ["Band Glute Bridge", "Band Hip Thrust", "Band Lateral Walk", "Lateral Band Walk", "Band Monster Walk", "Band Clamshell", "Band Fire Hydrant", "Band Kickback", "Band Hip Abduction"],
  },

  {
    muscleGroup: "Hips",
    equipment: "Leverage machine",
    names: ["Hip Adduction Machine", "Hip Abduction Machine"],
  },
  {
    muscleGroup: "Hips",
    equipment: "Cable",
    names: ["Cable Hip Adduction", "Standing Cable Hip Abduction"],
  },
  {
    muscleGroup: "Hips",
    equipment: "Body weight",
    names: ["Hip Airplane", "90/90 Hip Switch", "Standing Hip CAR"],
  },

  {
    muscleGroup: "Calves",
    equipment: "Leverage machine",
    names: ["Standing Calf Raise", "Seated Calf Raise", "Leg Press Calf Raise"],
  },
  {
    muscleGroup: "Calves",
    equipment: "Body weight",
    names: ["Single-Leg Calf Raise", "Calf Raise"],
  },
  {
    muscleGroup: "Calves",
    equipment: "Dumbbell",
    names: ["Dumbbell Calf Raise", "Dumbbell Seated Calf Raise"],
  },

  {
    muscleGroup: "Forearms",
    equipment: "Barbell",
    names: ["Barbell Wrist Curl", "Barbell Reverse Wrist Curl", "Barbell Behind-the-Back Wrist Curl", "Barbell Finger Curl", "Barbell Hold", "Double Overhand Deadlift Hold"],
  },
  {
    muscleGroup: "Forearms",
    equipment: "Dumbbell",
    names: ["Dumbbell Wrist Curl", "Wrist Curl", "Dumbbell Reverse Wrist Curl", "Reverse Wrist Curl", "Dumbbell Hammer Curl", "Dumbbell Reverse Curl", "Dumbbell Farmer's Carry", "Dumbbell Wrist Rotation", "Dumbbell Pronation/Supination"],
  },
  {
    muscleGroup: "Forearms",
    equipment: "Cable",
    names: ["Cable Wrist Curl", "Cable Reverse Wrist Curl", "Cable Reverse Curl", "Reverse Curl", "Cable Hammer Curl", "Cable Wrist Roller"],
  },
  {
    muscleGroup: "Forearms",
    equipment: "Leverage machine",
    names: ["Wrist Curl Machine", "Grip Machine", "Lever Wrist Curl", "Lever Reverse Wrist Curl"],
  },
  {
    muscleGroup: "Forearms",
    equipment: "Body weight",
    names: ["Towel Hang", "Towel Pull-Up", "Fingertip Push-Up", "Plate Pinch Hold", "Farmer's Carry", "Suitcase Carry", "Plate Pinch Carry"],
  },
  {
    muscleGroup: "Forearms",
    equipment: "Band",
    names: ["Band Wrist Curl", "Band Reverse Wrist Curl", "Band Pronation/Supination", "Band Finger Extension", "Band Reverse Curl"],
  },
  {
    muscleGroup: "Forearms",
    equipment: "Grip tool",
    names: ["Hand Gripper", "Wrist Roller", "Fat Grip Hold", "Towel Twist", "Rice Bucket Drill", "Pronation/Supination"],
  },

  {
    muscleGroup: "Neck",
    equipment: "Mobility",
    names: ["Neck Flexion", "Neck Extension", "Lateral Neck Flexion", "Neck Rotation", "Chin Tuck", "Neck Glide", "Neck Circles"],
  },
  {
    muscleGroup: "Neck",
    equipment: "Isometric",
    names: ["Front Neck Isometric", "Back Neck Isometric", "Side Neck Isometric", "Partner-Resisted Neck Isometric", "Neck Isometrics"],
  },
  {
    muscleGroup: "Neck",
    equipment: "Weighted",
    names: ["Weighted Neck Flexion", "Weighted Neck Extension", "Weighted Lateral Neck Flexion", "Neck Harness Extension"],
  },
  {
    muscleGroup: "Neck",
    equipment: "Leverage machine",
    names: ["Neck Flexion Machine", "Neck Extension Machine", "4-Way Neck Machine", "Lever Neck Extension", "Lever Neck Flexion"],
  },
  {
    muscleGroup: "Neck",
    equipment: "Band",
    names: ["Band Neck Flexion", "Band Neck Extension", "Band Lateral Neck Flexion", "Band Neck Rotation"],
  },
  {
    muscleGroup: "Neck",
    equipment: "Barbell",
    names: ["Shrugs"],
  },
  {
    muscleGroup: "Neck",
    equipment: "Cable",
    names: ["Cable Shrug"],
  },

  {
    muscleGroup: "Cardio",
    equipment: "Cardio machine",
    names: ["Treadmill", "Treadmill Walk", "Treadmill Jog", "Treadmill Run", "Incline Treadmill Walk", "Elliptical", "Stationary Bike", "Spin Bike", "Rowing Machine", "Stair Climber", "Air Bike", "SkiErg"],
  },
  {
    muscleGroup: "Cardio",
    equipment: "Outdoor",
    names: ["Walking", "Brisk Walking", "Jogging", "Running", "Sprinting", "Hiking", "Cycling", "Hill Sprints", "Swimming"],
  },
  {
    muscleGroup: "Cardio",
    equipment: "Body weight",
    names: ["Jumping Jacks", "High Knees", "Butt Kicks", "Burpees", "Skater Jumps", "Fast Feet", "Shadow Boxing", "Step-Ups", "HIIT Bodyweight Cardio"],
  },
  {
    muscleGroup: "Cardio",
    equipment: "Jump rope",
    names: ["Jump Rope", "Single-Unders", "Double-Unders", "Boxer Step Jump Rope", "High-Knee Jump Rope"],
  },
  {
    muscleGroup: "Cardio",
    equipment: "Sports",
    names: ["Basketball", "Soccer", "Tennis", "Pickleball", "Boxing", "Kickboxing", "Dancing", "Aerobics Class", "Water Aerobics"],
  },
];

function buildExerciseCatalog(sections) {
  const seen = new Set();
  return sections.flatMap((section) =>
    section.names
      .filter((name) => {
        const key = name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((name) => ({
        name,
        muscleGroup: section.muscleGroup,
        equipment: section.equipment,
        icon: iconByMuscleGroup[section.muscleGroup] || section.muscleGroup.toLowerCase(),
        favorite: false,
        custom: false,
        tip: DEFAULT_TIP,
      }))
  );
}

export const exerciseCatalog = buildExerciseCatalog(catalogSections);

export const exerciseCategories = [
  "Chest",
  "Biceps",
  "Triceps",
  "Back",
  "Shoulders",
  "Abs",
  "Quadriceps",
  "Hamstrings",
  "Glutes",
  "Hips",
  "Calves",
  "Forearms",
  "Neck",
  "Cardio",
];

export const equipmentOptions = [
  "Barbell",
  "Body weight",
  "Cable",
  "Dumbbell",
  "EZ Bar",
  "Leverage machine",
  "Smith machine",
  "Weighted",
  "Band",
  "Battling rope",
  "Bosu ball",
  "Kettlebell",
  "Medicine Ball",
  "Plate",
  "Power Sled",
  "Sled machine",
  "Resistance band",
  "Foam roller",
  "Massage ball",
  "Jump rope",
  "Stability ball",
  "Power sling",
  "Trap bar",
  "Ab roller",
  "Grip tool",
  "Mobility",
  "Isometric",
  "Cardio machine",
  "Outdoor",
  "Sports",
];

export function countSets(workout) {
  return (workout?.exercises || []).reduce((sum, exercise) => sum + (exercise.sets?.length || 0), 0);
}

export function getDateKey(date) {
  return date.toISOString().split("T")[0];
}

export function daysUntil(dateString) {
  if (!dateString) return null;
  const end = new Date(`${dateString}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / DAY);
}
