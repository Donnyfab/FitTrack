#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

export const API_SOURCE = "ascendapi";
export const DEFAULT_RAPIDAPI_HOST =
  "edb-with-videos-and-images-by-ascendapi.p.rapidapi.com";
export const DEFAULT_ASCENDAPI_DOCS_HOST =
  "edb-with-gifs-and-images-by-ascendapi.p.rapidapi.com";

const REPORTS_DIR = "reports";

const EQUIPMENT_WORDS = [
  "barbell",
  "dumbbell",
  "cable",
  "smith machine",
  "smith",
  "machine",
  "lever",
  "body weight",
  "bodyweight",
  "weighted",
  "band",
  "resistance band",
  "ez bar",
  "medicine ball",
  "plate",
  "kettlebell",
  "stability ball",
  "exercise ball",
];

export function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, "utf8");

  contents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) return;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

export function loadEnvFiles(cwd = process.cwd()) {
  loadEnvFile(path.join(cwd, ".env"));
  loadEnvFile(path.join(cwd, ".env.local"));
}

export function parseImportArgs(argv = process.argv.slice(2)) {
  const args = {
    dryRun: false,
    jsonOnly: false,
    help: false,
    limit: null,
    name: null,
    fromReport: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--json-only") {
      args.jsonOnly = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--limit") {
      const nextValue = argv[index + 1];
      args.limit = nextValue ? Number.parseInt(nextValue, 10) : null;
      index += 1;
    } else if (arg.startsWith("--limit=")) {
      args.limit = Number.parseInt(arg.slice("--limit=".length), 10);
    } else if (arg === "--name") {
      args.name = argv[index + 1] || null;
      index += 1;
    } else if (arg.startsWith("--name=")) {
      args.name = arg.slice("--name=".length);
    } else if (arg === "--from-report") {
      args.fromReport = argv[index + 1] || null;
      index += 1;
    } else if (arg.startsWith("--from-report=")) {
      args.fromReport = arg.slice("--from-report=".length);
    }
  }

  if (!Number.isFinite(args.limit) || args.limit <= 0) {
    args.limit = null;
  }

  return args;
}

export function printExerciseImportHelp(commandName) {
  console.log(`
${commandName}

Options:
  --dry-run       Match exercises and write a local report without Supabase writes.
  --json-only     Fetch, normalize, and report API data without Supabase writes.
  --limit <n>     Process only the first n matching local catalog exercises.
  --name <text>   Process catalog exercises whose names include this text.
  --from-report   Reuse matched API IDs from a prior report instead of scanning.
  --help          Show this help text.

Required environment for API calls:
  RAPIDAPI_KEY

Required environment for Supabase writes:
  VITE_SUPABASE_URL or SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
`);
}

export function createImportConfig({
  requireRapidApi = true,
  requireSupabase = true,
} = {}) {
  loadEnvFiles();

  const config = {
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    rapidApiKey: process.env.RAPIDAPI_KEY || process.env.X_RAPIDAPI_KEY,
    rapidApiHost: process.env.RAPIDAPI_HOST || DEFAULT_RAPIDAPI_HOST,
    ascendApiDocsHost:
      process.env.ASCENDAPI_DOCS_HOST || DEFAULT_ASCENDAPI_DOCS_HOST,
    exerciseDbBaseUrl:
      process.env.EXERCISEDB_BASE_URL ||
      `https://${process.env.RAPIDAPI_HOST || DEFAULT_RAPIDAPI_HOST}`,
  };

  const missing = [];
  if (requireRapidApi && !config.rapidApiKey) missing.push("RAPIDAPI_KEY");
  if (requireSupabase && !config.supabaseUrl) {
    missing.push("VITE_SUPABASE_URL or SUPABASE_URL");
  }
  if (requireSupabase && !config.supabaseServiceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (missing.length) {
    throw new Error(`Missing required environment: ${missing.join(", ")}`);
  }

  return config;
}

export function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === null || value === undefined || value === "") return [];
  if (typeof value === "string") {
    return value
      .split(/[,;/|]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [value].filter(Boolean);
}

export function normalizeText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value.map(normalizeText).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    const candidate =
      value.name ||
      value.title ||
      value.label ||
      value.muscle ||
      value.bodyPart ||
      value.body_part ||
      value.exerciseName ||
      value.exercise_name;
    return normalizeText(candidate);
  }
  return "";
}

export function normalizeKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[_-]/g, " ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function toDisplayCase(value) {
  const text = normalizeText(value);
  if (!text) return "";
  return text
    .replace(/[_-]/g, " ")
    .split(/\s+/)
    .map((word) => {
      if (!word) return "";
      if (/^[A-Z0-9]+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function toDisplayList(value) {
  return toArray(value)
    .map(toDisplayCase)
    .filter(Boolean)
    .filter((item, index, array) => {
      const key = normalizeKey(item);
      return array.findIndex((other) => normalizeKey(other) === key) === index;
    });
}

function isUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function collectUrls(value, urls = []) {
  if (value === null || value === undefined || value === "") return urls;
  if (isUrl(value)) {
    urls.push(value);
    return urls;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectUrls(item, urls));
    return urls;
  }
  if (typeof value !== "object") return urls;

  const preferredKeys = [
    "url",
    "src",
    "href",
    "imageUrl",
    "image_url",
    "videoUrl",
    "video_url",
    "gifUrl",
    "gif_url",
    "image",
    "video",
    "gif",
    "thumbnail",
    "poster",
    "1080p",
    "720p",
    "480p",
    "360p",
  ];

  preferredKeys.forEach((key) => collectUrls(value[key], urls));
  Object.entries(value).forEach(([key, nested]) => {
    if (!preferredKeys.includes(key)) collectUrls(nested, urls);
  });
  return urls;
}

export function firstUrl(...values) {
  for (const value of values) {
    const url = collectUrls(value)[0];
    if (url) return url;
  }
  return null;
}

export function flattenPayload(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== "object") return [];

  const likelyKeys = [
    "data",
    "results",
    "exercises",
    "items",
    "body",
    "response",
    "records",
  ];

  for (const key of likelyKeys) {
    if (Array.isArray(payload[key])) return payload[key];
    if (payload[key] && typeof payload[key] === "object") {
      const nested = flattenPayload(payload[key]);
      if (nested.length) return nested;
    }
  }

  return [payload];
}

export function exerciseIdFor(row) {
  if (!row || typeof row !== "object") return "";
  return normalizeText(
    row.id ||
      row.exerciseId ||
      row.exercise_id ||
      row.apiExerciseId ||
      row.api_exercise_id ||
      row.uuid,
  );
}

export function normalizeInstructions(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .map((item) => item.replace(/^\d+[\).]\s*/, "").trim());
  }

  const text = normalizeText(value);
  if (!text) return [];
  return text
    .split(/\n+|(?<=\.)\s+(?=\d+[\).])|\s+\d+[\).]\s+/)
    .map((item) => item.replace(/^\d+[\).]\s*/, "").trim())
    .filter(Boolean);
}

export function shortenOverview(value, fallbackExercise = {}) {
  const text = normalizeText(value);
  if (text) {
    const sentences = text
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    const summary = sentences.slice(0, 2).join(" ");
    return summary.length > 260 ? `${summary.slice(0, 257).trim()}...` : summary;
  }

  const name = fallbackExercise.name || "This exercise";
  const muscle = fallbackExercise.muscleGroup || "the target muscle group";
  const equipment = fallbackExercise.equipment
    ? ` using ${String(fallbackExercise.equipment).toLowerCase()}`
    : "";
  return `${name} trains ${String(muscle).toLowerCase()}${equipment}. Use controlled reps and keep the setup consistent.`;
}

function createApiUrl(base, pathname, params = {}) {
  const url = new URL(pathname, base.endsWith("/") ? base : `${base}/`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

function uniqueUrls(urls) {
  return urls.filter((url, index, array) => url && array.indexOf(url) === index);
}

export function buildExerciseSearchUrls(catalogExercise, config) {
  const name = normalizeText(catalogExercise.name);
  const equipment = normalizeText(catalogExercise.equipment);
  const bases = uniqueUrls([
    config.exerciseDbBaseUrl,
    `https://${config.rapidApiHost}`,
    `https://${config.ascendApiDocsHost}`,
  ]);

  const urls = [];
  for (const base of bases) {
    urls.push(createApiUrl(base, "/api/v1/exercises", { name, limit: "10" }));
    urls.push(createApiUrl(base, "/api/v1/exercises/search", { search: name }));
    urls.push(createApiUrl(base, "/exercises", { search: name }));
    urls.push(createApiUrl(base, "/exercises", { name }));
    urls.push(createApiUrl(base, `/exercises/name/${encodeURIComponent(name)}`));
    urls.push(createApiUrl(base, "/exercises/search", { query: name }));

    if (equipment) {
      urls.push(
        createApiUrl(base, "/api/v1/exercises", {
          name,
          equipments: equipment,
          limit: "10",
        }),
      );
    }
  }

  return uniqueUrls(urls);
}

export async function fetchJson(url, config) {
  const response = await fetch(url, {
    headers: {
      "X-RapidAPI-Key": config.rapidApiKey,
      "X-RapidAPI-Host": new URL(url).host,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} from ${new URL(url).host}: ${body.slice(0, 180)}`);
  }

  return response.json();
}

function candidateNameFor(row) {
  if (!row || typeof row !== "object") return "";
  return normalizeText(
    row.name ||
      row.exerciseName ||
      row.exercise_name ||
      row.title ||
      row.label ||
      row.displayName,
  );
}

function stripEquipmentWords(name) {
  let text = normalizeKey(name);
  for (const word of EQUIPMENT_WORDS) {
    const key = normalizeKey(word);
    text = text
      .replace(new RegExp(`^${key}\\s+`, "i"), "")
      .replace(new RegExp(`\\s+${key}$`, "i"), "")
      .replace(new RegExp(`\\s+${key}\\s+`, "ig"), " ");
  }
  return text.replace(/\s+/g, " ").trim();
}

function tokenOverlapScore(localName, candidateName) {
  const localTokens = new Set(normalizeKey(localName).split(" ").filter(Boolean));
  const candidateTokens = new Set(
    normalizeKey(candidateName).split(" ").filter(Boolean),
  );
  if (!localTokens.size || !candidateTokens.size) return 0;
  const overlap = [...localTokens].filter((token) => candidateTokens.has(token));
  return overlap.length / Math.max(localTokens.size, candidateTokens.size);
}

function getCandidateEquipment(row) {
  return toDisplayList(
    row?.equipment ||
      row?.equipments ||
      row?.equipmentType ||
      row?.equipment_type ||
      row?.apparatus,
  );
}

function getCandidateMuscles(row) {
  return toDisplayList([
    ...toArray(row?.targetMuscles || row?.target_muscles || row?.target),
    ...toArray(row?.secondaryMuscles || row?.secondary_muscles),
    ...toArray(row?.bodyParts || row?.body_parts || row?.bodyPart || row?.body_part),
    ...toArray(row?.muscles || row?.primaryMuscles || row?.primary_muscles),
  ]);
}

export function scoreExerciseCandidate(catalogExercise, row) {
  const localName = normalizeText(catalogExercise.name);
  const candidateName = candidateNameFor(row);
  const localKey = normalizeKey(localName);
  const candidateKey = normalizeKey(candidateName);
  const localStripped = stripEquipmentWords(localName);
  const candidateStripped = stripEquipmentWords(candidateName);

  let score = 0;
  let exactish = false;
  const reasons = [];

  if (localKey && candidateKey && localKey === candidateKey) {
    score += 70;
    exactish = true;
    reasons.push("exact normalized name");
  } else if (localStripped && localStripped === candidateStripped) {
    score += 62;
    exactish = true;
    reasons.push("name matches after equipment normalization");
  } else {
    const overlap = tokenOverlapScore(localName, candidateName);
    if (overlap >= 0.9) {
      score += 55;
      reasons.push("high token overlap");
    } else if (
      localKey.length > 6 &&
      candidateKey.length > 6 &&
      (localKey.includes(candidateKey) || candidateKey.includes(localKey))
    ) {
      score += 42;
      reasons.push("partial name containment");
    } else if (overlap >= 0.65) {
      score += 32;
      reasons.push("moderate token overlap");
    }
  }

  const localEquipment = normalizeKey(catalogExercise.equipment);
  const candidateEquipment = getCandidateEquipment(row).map(normalizeKey);
  if (localEquipment && candidateEquipment.includes(localEquipment)) {
    score += 15;
    reasons.push("equipment match");
  } else if (!localEquipment || !candidateEquipment.length) {
    score += 4;
    reasons.push("equipment missing");
  }

  const localMuscle = normalizeKey(catalogExercise.muscleGroup);
  const candidateMuscles = getCandidateMuscles(row).map(normalizeKey);
  if (
    localMuscle &&
    candidateMuscles.some(
      (muscle) => muscle.includes(localMuscle) || localMuscle.includes(muscle),
    )
  ) {
    score += 12;
    reasons.push("muscle group match");
  }

  if (
    firstUrl(
      row?.imageUrl,
      row?.image_url,
      row?.image,
      row?.images,
      row?.imageUrls,
      row?.thumbnail,
      row?.videoUrl,
      row?.video_url,
      row?.video,
      row?.videos,
      row?.videoUrls,
      row?.gifUrl,
      row?.gif_url,
      row?.gif,
      row?.gifs,
      row?.gifUrls,
    )
  ) {
    score += 4;
    reasons.push("media present");
  }

  if (
    normalizeInstructions(row?.instructions || row?.steps || row?.howTo || row?.how_to)
      .length
  ) {
    score += 4;
    reasons.push("instructions present");
  }

  return {
    score,
    exactish,
    reasons,
    localName,
    candidateName,
    normalizedName: candidateKey,
    equipment: getCandidateEquipment(row),
    muscles: getCandidateMuscles(row),
  };
}

export async function fetchExerciseCandidates(catalogExercise, config, options = {}) {
  const extraUrls = options.extraUrls || [];
  const urls = uniqueUrls([
    ...extraUrls,
    ...buildExerciseSearchUrls(catalogExercise, config),
  ]);
  const candidates = [];
  const failures = [];
  const triedUrls = [];

  for (const url of urls) {
    triedUrls.push(url);
    try {
      const payload = await fetchJson(url, config);
      const rows = flattenPayload(payload)
        .filter((row) => row && typeof row === "object")
        .map((row) => ({ ...row, _sourceUrl: url }));
      candidates.push(...rows);
    } catch (error) {
      failures.push({
        url,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const seen = new Set();
  const uniqueCandidates = candidates.filter((candidate) => {
    const key =
      exerciseIdFor(candidate) ||
      `${normalizeKey(candidateNameFor(candidate))}:${normalizeKey(
        getCandidateEquipment(candidate).join(","),
      )}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { candidates: uniqueCandidates, failures, triedUrls };
}

async function fetchExerciseDetail(candidate, config) {
  const id = exerciseIdFor(candidate);
  const sourceUrl = candidate._sourceUrl;
  if (!id) return candidate;

  const sourceOrigin = (() => {
    if (!sourceUrl) return null;
    try {
      return new URL(sourceUrl).origin;
    } catch {
      return null;
    }
  })();
  const detailBases = uniqueUrls([
    sourceOrigin,
    config.exerciseDbBaseUrl,
    `https://${config.rapidApiHost}`,
    `https://${config.ascendApiDocsHost}`,
  ]);
  const detailUrls = uniqueUrls(
    detailBases.flatMap((baseUrl) => [
      createApiUrl(baseUrl, `/api/v1/exercises/${encodeURIComponent(id)}`),
      createApiUrl(baseUrl, `/exercises/${encodeURIComponent(id)}`),
    ]),
  );

  for (const url of detailUrls) {
    try {
      const payload = await fetchJson(url, config);
      const rows = flattenPayload(payload).filter(
        (row) => row && typeof row === "object",
      );
      const detail =
        rows.find((row) => exerciseIdFor(row) === id) || rows[0] || null;
      if (detail) return { ...candidate, ...detail, _sourceUrl: sourceUrl || url };
    } catch {
      // Search payloads often include enough data. Detail failures are non-fatal.
    }
  }

  return candidate;
}

export async function fetchExerciseDetailById(
  apiExerciseId,
  config,
  fallbackExercise = {},
) {
  const id = normalizeText(apiExerciseId);
  if (!id) throw new Error("Missing API exercise ID");

  const candidate = {
    id,
    exerciseId: id,
    exercise_id: id,
    apiExerciseId: id,
    api_exercise_id: id,
    name: normalizeText(fallbackExercise.apiName) || normalizeText(fallbackExercise.name) || id,
  };

  const detail = await fetchExerciseDetail(candidate, config);
  const exercise = normalizeExercisePayload(detail, fallbackExercise);

  return {
    exercise: {
      ...exercise,
      api_source: API_SOURCE,
      api_exercise_id: id,
    },
    detailPayload: detail,
  };
}

function summarizeCandidates(scoredCandidates) {
  return scoredCandidates.slice(0, 5).map((candidate) => ({
    apiExerciseId: exerciseIdFor(candidate.row),
    name: candidate.score.candidateName,
    score: candidate.score.score,
    exactish: candidate.score.exactish,
    equipment: candidate.score.equipment,
    muscles: candidate.score.muscles,
    reasons: candidate.score.reasons,
  }));
}

export async function findConfidentExerciseMatch(
  catalogExercise,
  config,
  options = {},
) {
  const { candidates, failures, triedUrls } = await fetchExerciseCandidates(
    catalogExercise,
    config,
    options,
  );

  if (!candidates.length) {
    return {
      status: failures.length ? "failed" : "unsupported",
      catalogExercise,
      triedUrls,
      failures,
      candidates: [],
    };
  }

  const scored = candidates
    .map((row) => ({ row, score: scoreExerciseCandidate(catalogExercise, row) }))
    .sort((a, b) => b.score.score - a.score.score);

  const top = scored[0];
  const second = scored[1];
  const gap = second ? top.score.score - second.score.score : top.score.score;
  const confident =
    (top.score.exactish && top.score.score >= 70) ||
    (top.score.score >= 90 && gap >= 12);

  if (!confident) {
    return {
      status: "ambiguous",
      catalogExercise,
      triedUrls,
      failures,
      candidates: summarizeCandidates(scored),
    };
  }

  if (second && second.score.score >= 72 && gap < 8 && !top.score.exactish) {
    return {
      status: "ambiguous",
      catalogExercise,
      triedUrls,
      failures,
      candidates: summarizeCandidates(scored),
    };
  }

  const detailed = await fetchExerciseDetail(top.row, config);
  const exercise = normalizeExercisePayload(detailed, catalogExercise);

  return {
    status: "matched",
    catalogExercise,
    triedUrls,
    failures,
    candidates: summarizeCandidates(scored),
    score: top.score,
    exercise,
  };
}

export function normalizeExercisePayload(row, fallbackExercise = {}) {
  const name =
    normalizeText(fallbackExercise.name) ||
    candidateNameFor(row) ||
    "Imported Exercise";
  const targetMuscles = toDisplayList(
    row?.targetMuscles ||
      row?.target_muscles ||
      row?.target ||
      row?.primaryMuscles ||
      row?.primary_muscles ||
      row?.muscles,
  );
  const secondaryMuscles = toDisplayList(
    row?.secondaryMuscles ||
      row?.secondary_muscles ||
      row?.synergistMuscles ||
      row?.supportingMuscles,
  );
  const bodyParts = toDisplayList(
    row?.bodyParts || row?.body_parts || row?.bodyPart || row?.body_part,
  );
  const equipment = toDisplayList(
    row?.equipment ||
      row?.equipments ||
      row?.equipmentType ||
      row?.equipment_type ||
      fallbackExercise.equipment,
  );
  const instructions = normalizeInstructions(
    row?.instructions || row?.steps || row?.howTo || row?.how_to,
  );
  const apiExerciseId =
    exerciseIdFor(row) ||
    normalizeKey(`${name}:${equipment.join(",") || fallbackExercise.equipment}`);

  return {
    user_id: null,
    name,
    muscle_group:
      normalizeText(fallbackExercise.muscleGroup) ||
      targetMuscles[0] ||
      bodyParts[0] ||
      null,
    equipment: equipment.join(", ") || normalizeText(fallbackExercise.equipment) || null,
    icon: fallbackExercise.icon || null,
    form_tips:
      normalizeText(row?.tips || row?.formTips || row?.form_tips) ||
      normalizeText(fallbackExercise.tip) ||
      null,
    is_favorite: false,
    is_custom: false,
    api_source: API_SOURCE,
    api_exercise_id: apiExerciseId,
    image_url: firstUrl(
      row?.imageUrl,
      row?.image_url,
      row?.image,
      row?.images,
      row?.thumbnail,
      row?.imageUrls,
    ),
    video_url: firstUrl(
      row?.videoUrl,
      row?.video_url,
      row?.video,
      row?.videos,
      row?.videoUrls,
    ),
    gif_url: firstUrl(
      row?.gifUrl,
      row?.gif_url,
      row?.gif,
      row?.gifs,
      row?.gifUrls,
      row?.animationUrl,
      row?.animation_url,
    ),
    body_parts: bodyParts,
    target_muscles: targetMuscles,
    secondary_muscles: secondaryMuscles,
    instructions,
    overview: shortenOverview(
      row?.overview || row?.description || row?.about || row?.summary,
      fallbackExercise,
    ),
  };
}

export function createSupabaseRest(config) {
  const supabaseBaseUrl = `${config.supabaseUrl.replace(/\/$/, "")}/rest/v1`;

  return async function supabaseRest(endpoint, options = {}) {
    const response = await fetch(`${supabaseBaseUrl}/${endpoint}`, {
      ...options,
      headers: {
        apikey: config.supabaseServiceRoleKey,
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: options.prefer || "return=representation",
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Supabase REST ${response.status}: ${body}`);
    }

    if (response.status === 204) return null;
    return response.json();
  };
}

export async function saveImportedExercise(exercise, supabaseRest, options = {}) {
  const dryRun = Boolean(options.dryRun);
  if (dryRun) {
    return { action: "dry-run", row: null };
  }

  const apiExerciseId = encodeURIComponent(exercise.api_exercise_id);
  const existingRows = await supabaseRest(
    `user_exercises?select=id&user_id=is.null&api_source=eq.${API_SOURCE}&api_exercise_id=eq.${apiExerciseId}&limit=1`,
  );

  const body = JSON.stringify({
    ...exercise,
    user_id: null,
  });

  if (existingRows?.[0]?.id) {
    const updated = await supabaseRest(
      `user_exercises?id=eq.${existingRows[0].id}`,
      {
        method: "PATCH",
        body,
      },
    );
    return { action: "updated", row: updated?.[0] || null };
  }

  const created = await supabaseRest("user_exercises", {
    method: "POST",
    body,
  });
  return { action: "created", row: created?.[0] || null };
}

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function formatReportMarkdown(report) {
  const lines = [];
  lines.push(`# FitTrack Exercise Library Import Report`);
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  lines.push(`Mode: ${report.mode.jsonOnly ? "json-only" : report.mode.dryRun ? "dry-run" : "write"}`);
  if (report.mode.name) lines.push(`Name filter: ${report.mode.name}`);
  if (report.mode.limit) lines.push(`Limit: ${report.mode.limit}`);
  if (report.mode.fromReport) lines.push(`Source report: ${report.mode.fromReport}`);
  if (report.mode.sourceMatchedRows !== undefined) {
    lines.push(`Source matched rows: ${report.mode.sourceMatchedRows}`);
  }
  if (report.mode.uniqueApiIds !== undefined) {
    lines.push(`Unique API IDs: ${report.mode.uniqueApiIds}`);
  }
  if (report.mode.duplicateAliases !== undefined) {
    lines.push(`Duplicate aliases: ${report.mode.duplicateAliases}`);
  }
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Processed: ${report.totals.processed}`);
  lines.push(`- Matched: ${report.totals.matched}`);
  lines.push(`- Skipped: ${report.totals.skipped}`);
  lines.push(`- Unsupported: ${report.totals.unsupported}`);
  lines.push(`- Ambiguous: ${report.totals.ambiguous}`);
  lines.push(`- Failed: ${report.totals.failed}`);
  lines.push("");

  const addSection = (title, rows) => {
    lines.push(`## ${title}`);
    lines.push("");
    if (!rows.length) {
      lines.push("None.");
      lines.push("");
      return;
    }
    rows.forEach((row) => {
      lines.push(`- ${row.name}${row.status ? ` (${row.status})` : ""}`);
      if (row.apiExerciseId) lines.push(`  - API ID: ${row.apiExerciseId}`);
      if (row.score !== undefined) lines.push(`  - Score: ${row.score}`);
      if (row.action) lines.push(`  - Action: ${row.action}`);
      if (row.reason) lines.push(`  - Reason: ${row.reason}`);
      if (row.candidates?.length) {
        lines.push(
          `  - Candidates: ${row.candidates
            .map((candidate) => `${candidate.name || "unknown"} (${candidate.score})`)
            .join("; ")}`,
        );
      }
    });
    lines.push("");
  };

  addSection("Matched Exercises", report.matched);
  addSection("Skipped Exercises", report.skipped);
  addSection("Unsupported Exercises", report.unsupported);
  addSection("Ambiguous Matches", report.ambiguous);
  addSection("Failed Imports", report.failed);

  return `${lines.join("\n")}\n`;
}

export function writeExerciseImportReport(report, options = {}) {
  const reportsDir = options.reportsDir || REPORTS_DIR;
  const basename = options.basename || "exercise-library-import-report";
  fs.mkdirSync(reportsDir, { recursive: true });

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");
  const jsonPath = path.join(reportsDir, `${basename}-${timestamp}.json`);
  const markdownPath = path.join(reportsDir, `${basename}-${timestamp}.md`);

  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, formatReportMarkdown(report));

  return { jsonPath, markdownPath };
}
