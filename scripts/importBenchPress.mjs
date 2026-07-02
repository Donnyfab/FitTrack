import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'edb-with-videos-and-images-by-ascendapi.p.rapidapi.com';
const EXERCISEDB_BASE_URL =
  process.env.EXERCISEDB_BASE_URL || `https://${RAPIDAPI_HOST}`;
const EXERCISEDB_BENCH_PRESS_URL = process.env.EXERCISEDB_BENCH_PRESS_URL;
const API_SOURCE = 'ascendapi';
const BENCH_PRESS = 'Bench Press';

const required = [
  ['SUPABASE_URL or VITE_SUPABASE_URL', SUPABASE_URL],
  ['SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY],
  ['RAPIDAPI_KEY', RAPIDAPI_KEY],
];

const missing = required.filter(([, value]) => !value).map(([name]) => name);

if (missing.length > 0) {
  throw new Error(`Missing required env vars: ${missing.join(', ')}`);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => normalizeText(item)).filter(Boolean);
  return [normalizeText(value)].filter(Boolean);
}

function normalizeText(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (typeof value === 'object') {
    return String(value.name || value.title || value.label || value.muscle || value.bodyPart || '').trim();
  }
  return '';
}

function firstUrl(...candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate === 'string') return candidate;
    if (Array.isArray(candidate)) {
      const url = candidate.find((item) => typeof item === 'string') || candidate.find((item) => item?.url);
      if (typeof url === 'string') return url;
      if (url?.url) return url.url;
    }
    if (candidate?.url) return candidate.url;
    if (candidate?.src) return candidate.src;
  }
  return null;
}

function flattenPayload(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.exercises)) return payload.exercises;
  if (payload.data && typeof payload.data === 'object') return flattenPayload(payload.data);
  if (payload.result && typeof payload.result === 'object') return flattenPayload(payload.result);
  return [payload];
}

function pickBenchPress(payload) {
  const rows = flattenPayload(payload);
  return (
    rows.find((row) => normalizeText(row?.name).toLowerCase() === 'bench press') ||
    rows.find((row) => normalizeText(row?.exerciseName).toLowerCase() === 'bench press') ||
    rows.find((row) => normalizeText(row?.name || row?.exerciseName).toLowerCase().includes('bench press')) ||
    rows[0]
  );
}

function normalizeInstructions(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((step) => {
        if (typeof step === 'string') return step.trim();
        return normalizeText(step.text || step.instruction || step.description || step.step);
      })
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/\n+|(?<=\.)\s+(?=[A-Z])/)
      .map((step) => step.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeExercise(row) {
  if (!row) throw new Error('Bench Press was not found in the API response.');

  const name = normalizeText(row.name || row.exerciseName) || BENCH_PRESS;
  const bodyParts = toArray(row.bodyParts || row.bodyPart || row.body_part);
  const targetMuscles = toArray(
    row.targetMuscles ||
      row.targetMuscle ||
      row.target ||
      row.primaryMuscles ||
      row.primaryMuscle ||
      row.muscles
  );
  const secondaryMuscles = toArray(
    row.secondaryMuscles ||
      row.secondaryMuscle ||
      row.synergistMuscles ||
      row.supportingMuscles
  );
  const equipmentList = toArray(row.equipments || row.equipment || row.equipmentType);
  const instructions = normalizeInstructions(row.instructions || row.steps || row.howTo);
  const overview =
    normalizeText(row.overview || row.description || row.about || row.summary) ||
    'A compound chest press performed with a barbell while lying on a flat bench.';

  return {
    name: BENCH_PRESS,
    muscle_group: targetMuscles[0] || bodyParts[0] || 'Chest',
    equipment: equipmentList[0] || 'Barbell',
    icon: 'chest',
    form_tips:
      normalizeText(row.tips?.[0] || row.tip || row.coachingCue) ||
      'Keep your shoulder blades set, control the bar path, and press with stable wrists.',
    is_favorite: false,
    is_custom: false,
    api_source: API_SOURCE,
    api_exercise_id: normalizeText(row.id || row.exerciseId || row.exercise_id || row._id) || 'bench-press',
    image_url: firstUrl(row.imageUrl, row.image, row.thumbnail, row.images, row.imageUrls),
    video_url: firstUrl(row.videoUrl, row.video, row.videos, row.videoUrls),
    gif_url: firstUrl(row.gifUrl, row.gif, row.gifs, row.animationUrl),
    body_parts: bodyParts.length ? bodyParts : ['Chest'],
    target_muscles: targetMuscles.length ? targetMuscles : ['Chest'],
    secondary_muscles: secondaryMuscles,
    instructions: instructions.length
      ? instructions
      : [
          'Lie on a flat bench with your eyes under the bar.',
          'Grip the bar slightly wider than shoulder width and set your shoulder blades.',
          'Lower the bar under control toward the lower chest.',
          'Press the bar back up until your arms are extended without losing your setup.',
        ],
    overview,
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${body.slice(0, 240)}`);
  }

  return response.json();
}

async function fetchBenchPress() {
  const urls = EXERCISEDB_BENCH_PRESS_URL
    ? [EXERCISEDB_BENCH_PRESS_URL]
    : [
        `${EXERCISEDB_BASE_URL}/exercises/name/bench%20press`,
        `${EXERCISEDB_BASE_URL}/exercises/search?query=bench%20press`,
        `${EXERCISEDB_BASE_URL}/exercises?search=bench%20press`,
        `${EXERCISEDB_BASE_URL}/exercises?name=bench%20press`,
      ];

  const failures = [];
  for (const url of urls) {
    try {
      const payload = await fetchJson(url);
      const exercise = pickBenchPress(payload);
      if (exercise) return normalizeExercise(exercise);
    } catch (error) {
      failures.push(`${url} -> ${error.message}`);
    }
  }

  throw new Error(`Could not import Bench Press. Tried:\n${failures.join('\n')}`);
}

async function saveBenchPress(exercise) {
  const { data: existing, error: existingError } = await supabase
    .from('user_exercises')
    .select('id')
    .is('user_id', null)
    .eq('api_source', API_SOURCE)
    .eq('api_exercise_id', exercise.api_exercise_id)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.id) {
    const { data, error } = await supabase
      .from('user_exercises')
      .update(exercise)
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw error;
    return { action: 'updated', row: data };
  }

  const { data, error } = await supabase
    .from('user_exercises')
    .insert({ ...exercise, user_id: null })
    .select('*')
    .single();

  if (error) throw error;
  return { action: 'inserted', row: data };
}

const exercise = await fetchBenchPress();
const result = await saveBenchPress(exercise);

console.log(`Bench Press ${result.action}: ${result.row.id}`);
console.log(`Media: image=${Boolean(result.row.image_url)} video=${Boolean(result.row.video_url)} gif=${Boolean(result.row.gif_url)}`);
