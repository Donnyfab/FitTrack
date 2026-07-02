const MUSCLE_MAP_BASE_IMAGE = "/images/muscle-map-base.png";
const SVG_VIEWBOX = "0 0 1280 960";

const normalizeMuscleName = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const muscleRegions = {
  chest: {
    label: "Chest / Pectoralis Major",
    paths: [
      "M327 202 C292 203 260 221 247 251 C267 282 302 299 344 291 C373 283 389 259 386 233 C371 212 352 202 327 202 Z",
      "M431 202 C466 203 498 221 511 251 C491 282 456 299 414 291 C385 283 369 259 372 233 C387 212 406 202 431 202 Z",
    ],
  },
  upperChest: {
    label: "Pectoralis Major Clavicular Head",
    paths: [
      "M325 197 C293 198 268 207 252 225 C276 236 310 241 347 232 C346 216 340 203 325 197 Z",
      "M433 197 C465 198 490 207 506 225 C482 236 448 241 411 232 C412 216 418 203 433 197 Z",
    ],
  },
  anteriorDeltoid: {
    label: "Anterior Deltoid",
    paths: [
      "M251 218 C223 226 205 253 206 283 C207 307 221 323 240 316 C255 293 265 252 251 218 Z",
      "M507 218 C535 226 553 253 552 283 C551 307 537 323 518 316 C503 293 493 252 507 218 Z",
    ],
  },
  triceps: {
    label: "Triceps Brachii",
    paths: [
      "M217 289 C197 315 185 355 189 396 C194 419 205 434 219 424 C231 390 236 326 217 289 Z",
      "M541 289 C561 315 573 355 569 396 C564 419 553 434 539 424 C527 390 522 326 541 289 Z",
    ],
  },
};

const muscleAliases = [
  {
    key: "upperChest",
    matches: ["clavicular", "upper chest", "pec major clavicular"],
  },
  {
    key: "chest",
    matches: ["pectoralis major sternal", "pectoralis", "pec major", "pecs", "chest"],
  },
  {
    key: "anteriorDeltoid",
    matches: ["anterior deltoid", "front deltoid", "front delt", "deltoid anterior"],
  },
  {
    key: "triceps",
    matches: ["triceps brachii", "triceps"],
  },
];

const getMuscleRegionKey = (muscle) => {
  const normalized = normalizeMuscleName(muscle);
  if (!normalized) return null;
  const alias = muscleAliases.find(({ matches }) =>
    matches.some((match) => normalized.includes(match))
  );
  return alias?.key || null;
};

const buildRegionSet = (muscles) => {
  const keys = new Set();
  muscles.forEach((muscle) => {
    const key = getMuscleRegionKey(muscle);
    if (key && muscleRegions[key]) keys.add(key);
  });
  return keys;
};

const uniqueMuscles = (muscles = []) =>
  Array.isArray(muscles) ? [...new Set(muscles.filter(Boolean))] : [];

function MuscleLegend({ title, muscles, colorClass, emptyText }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-3">
      <div className="flex items-center gap-2">
        <span className={`h-3 w-1.5 rounded-full ${colorClass}`} />
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{title}</p>
      </div>
      {muscles.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {muscles.map((muscle) => (
            <span key={muscle} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 shadow-sm">
              {muscle}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-neutral-400">{emptyText}</p>
      )}
    </div>
  );
}

export default function MuscleMap({ primaryMuscles = [], secondaryMuscles = [] }) {
  const primary = uniqueMuscles(primaryMuscles);
  const secondary = uniqueMuscles(secondaryMuscles);
  const primaryRegions = buildRegionSet(primary);
  const secondaryRegions = buildRegionSet(secondary);
  primaryRegions.forEach((key) => secondaryRegions.delete(key));
  const hasMappedRegions = primaryRegions.size > 0 || secondaryRegions.size > 0;

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.8fr)]">
      <div className="relative overflow-hidden rounded-3xl border border-neutral-100 bg-neutral-50">
        <img
          src={MUSCLE_MAP_BASE_IMAGE}
          alt="Front and back muscle anatomy"
          className="block w-full select-none object-contain"
          draggable="false"
        />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={SVG_VIEWBOX}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            <filter id="muscle-map-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {[...primaryRegions].map((key) =>
            muscleRegions[key].paths.map((path, index) => (
              <path
                key={`primary-${key}-${index}`}
                d={path}
                fill="rgba(239, 68, 68, 0.68)"
                stroke="rgba(220, 38, 38, 0.92)"
                strokeWidth="2"
                strokeLinejoin="round"
                filter="url(#muscle-map-soft-glow)"
                style={{ mixBlendMode: "multiply" }}
              />
            ))
          )}
          {[...secondaryRegions].map((key) =>
            muscleRegions[key].paths.map((path, index) => (
              <path
                key={`secondary-${key}-${index}`}
                d={path}
                fill="rgba(37, 99, 235, 0.56)"
                stroke="rgba(29, 78, 216, 0.86)"
                strokeWidth="2"
                strokeLinejoin="round"
                filter="url(#muscle-map-soft-glow)"
                style={{ mixBlendMode: "multiply" }}
              />
            ))
          )}
        </svg>
      </div>

      <div className="space-y-3">
        <MuscleLegend
          title="Primary muscles"
          muscles={primary}
          colorClass="bg-red-500"
          emptyText="No primary muscles listed."
        />
        <MuscleLegend
          title="Secondary muscles"
          muscles={secondary}
          colorClass="bg-blue-600"
          emptyText="No secondary muscles listed."
        />
        {!hasMappedRegions && (
          <p className="rounded-2xl bg-neutral-50 p-3 text-xs leading-5 text-neutral-500">
            This exercise has muscle data, but its regions have not been mapped to the anatomy overlay yet.
          </p>
        )}
      </div>
    </div>
  );
}
