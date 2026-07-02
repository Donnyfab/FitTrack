import fs from 'node:fs';
import path from 'node:path';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (!key || process.env[key] != null) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile(path.resolve(process.cwd(), '.env'));
loadEnvFile(path.resolve(process.cwd(), '.env.local'));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'edb-with-videos-and-images-by-ascendapi.p.rapidapi.com';
const ASCENDAPI_DOCS_HOST = 'edb-with-gifs-and-images-by-ascendapi.p.rapidapi.com';
const EXERCISEDB_BASE_URL =
  process.env.EXERCISEDB_BASE_URL || `https://${RAPIDAPI_HOST}`;
const EXERCISEDB_BENCH_PRESS_URL = process.env.EXERCISEDB_BENCH_PRESS_URL;
const API_SOURCE = 'ascendapi';
const BENCH_PRESS = 'Bench Press';
const jsonOnly = process.argv.includes('--json-only') || process.env.BENCH_PRESS_IMPORT_OUTPUT === 'json';

const required = [
  ['RAPIDAPI_KEY', RAPIDAPI_KEY],
];

if (!jsonOnly) {
  required.unshift(
    ['SUPABASE_URL or VITE_SUPABASE_URL', SUPABASE_URL],
    ['SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY]
  );
}

const missing = required.filter(([, value]) => !value).map(([name]) => name);

if (missing.length > 0) {
  throw new Error(`Missing required env vars: ${missing.join(', ')}`);
}

async function supabaseRest(pathname, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = body?.message || body?.error || response.statusText;
    throw new Error(`Supabase REST ${response.status}: ${message}`);
  }

  return body;
}

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

function toDisplayCase(value) {
  const text = normalizeText(value);
  if (!text) return '';
  return text
    .toLowerCase()
    .split(/([\s/-]+)/)
    .map((part) => (/^[a-z]/.test(part) ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join('');
}

function toDisplayList(value) {
  return toArray(value).map(toDisplayCase).filter(Boolean);
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
    if (typeof candidate === 'object') {
      const resolutionUrl =
        candidate['720p'] ||
        candidate['480p'] ||
        candidate['360p'] ||
        candidate['1080p'] ||
        Object.values(candidate).find((value) => typeof value === 'string');
      if (resolutionUrl) return resolutionUrl;
    }
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

function exerciseIdFor(row) {
  return normalizeText(row?.exerciseId || row?.id || row?.exercise_id || row?._id);
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
  const bodyParts = toDisplayList(row.bodyParts || row.bodyPart || row.body_part);
  const targetMuscles = toDisplayList(
    row.targetMuscles ||
      row.targetMuscle ||
      row.target ||
      row.primaryMuscles ||
      row.primaryMuscle ||
      row.muscles
  );
  const secondaryMuscles = toDisplayList(
    row.secondaryMuscles ||
      row.secondaryMuscle ||
      row.synergistMuscles ||
      row.supportingMuscles
  );
  const equipmentList = toDisplayList(row.equipments || row.equipment || row.equipmentType);
  const instructions = normalizeInstructions(row.instructions || row.steps || row.howTo);
  const firstTip = Array.isArray(row.tips) ? row.tips[0] : row.tips;
  const overview =
    normalizeText(row.overview || row.description || row.about || row.summary) ||
    'A compound chest press performed with a barbell while lying on a flat bench.';

  return {
    name: BENCH_PRESS,
    muscle_group: bodyParts[0] || 'Chest',
    equipment: equipmentList[0] || 'Barbell',
    icon: 'chest',
    form_tips:
      normalizeText(firstTip || row.tip || row.coachingCue) ||
      'Keep your shoulder blades set, control the bar path, and press with stable wrists.',
    is_favorite: false,
    is_custom: false,
    api_source: API_SOURCE,
    api_exercise_id: exerciseIdFor(row) || 'bench-press',
    image_url: firstUrl(row.imageUrl, row.image, row.thumbnail, row.images, row.imageUrls),
    video_url: firstUrl(row.videoUrl, row.video, row.videos, row.videoUrls),
    gif_url: firstUrl(row.gifUrl, row.gif, row.gifs, row.gifUrls, row.animationUrl),
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
  const requestHost = new URL(url).host;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': requestHost,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${body.slice(0, 240)}`);
  }

  return response.json();
}

async function fetchBenchPress() {
  const bases = Array.from(
    new Set([
      EXERCISEDB_BASE_URL.replace(/\/$/, ''),
      `https://${ASCENDAPI_DOCS_HOST}`,
    ])
  );
  const urls = EXERCISEDB_BENCH_PRESS_URL
    ? [EXERCISEDB_BENCH_PRESS_URL]
    : bases.flatMap((base) => [
        `${base}/api/v1/exercises?name=Bench%20Press&equipments=Barbell&limit=10`,
        `${base}/api/v1/exercises/search?search=Bench%20Press&threshold=0.2`,
        `${base}/api/v1/exercises?name=Bench%20Press&limit=10`,
        `${base}/api/v1/exercises/search?search=barbell%20bench%20press&threshold=0.2`,
        `${base}/exercises/name/bench%20press`,
        `${base}/exercises/search?query=bench%20press`,
        `${base}/exercises?search=bench%20press`,
        `${base}/exercises?name=bench%20press`,
      ]);

  const failures = [];
  for (const url of urls) {
    try {
      const payload = await fetchJson(url);
      const exercise = pickBenchPress(payload);
      if (!exercise) continue;

      const exerciseId = exerciseIdFor(exercise);
      if (exerciseId && !EXERCISEDB_BENCH_PRESS_URL) {
        const base = new URL(url).origin;
        try {
          const detailPayload = await fetchJson(`${base}/api/v1/exercises/${encodeURIComponent(exerciseId)}`);
          const detail = pickBenchPress(detailPayload);
          if (detail) return normalizeExercise({ ...exercise, ...detail });
        } catch (detailError) {
          failures.push(`${base}/api/v1/exercises/${exerciseId} -> ${detailError.message}`);
        }
      }

      return normalizeExercise(exercise);
    } catch (error) {
      failures.push(`${url} -> ${error.message}`);
    }
  }

  throw new Error(`Could not import Bench Press. Tried:\n${failures.join('\n')}`);
}

async function saveBenchPress(exercise) {
  const apiExerciseId = encodeURIComponent(exercise.api_exercise_id);
  const existingRows = await supabaseRest(
    `user_exercises?select=id&user_id=is.null&api_source=eq.${API_SOURCE}&api_exercise_id=eq.${apiExerciseId}&limit=1`
  );
  const existing = existingRows?.[0];

  if (existing?.id) {
    const rows = await supabaseRest(`user_exercises?id=eq.${existing.id}&select=*`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(exercise),
    });
    return { action: 'updated', row: rows[0] };
  }

  const rows = await supabaseRest('user_exercises?select=*', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...exercise, user_id: null }),
  });
  return { action: 'inserted', row: rows[0] };
}

const exercise = await fetchBenchPress();

if (jsonOnly) {
  console.log(JSON.stringify(exercise, null, 2));
} else {
  const result = await saveBenchPress(exercise);

  console.log(`Bench Press ${result.action}: ${result.row.id}`);
  console.log(`Media: image=${Boolean(result.row.image_url)} video=${Boolean(result.row.video_url)} gif=${Boolean(result.row.gif_url)}`);
}
