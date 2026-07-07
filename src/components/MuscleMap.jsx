import {
  MUSCLE_MAP_BASE_IMAGE,
  SVG_VIEWBOX,
  muscleRegions,
  resolveMuscleRegions,
} from "../lib/muscleMapRegions";

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
  const primaryRegions = resolveMuscleRegions(primary);
  const secondaryRegions = resolveMuscleRegions(secondary);
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
