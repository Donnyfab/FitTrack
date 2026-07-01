import { Dumbbell } from "lucide-react";

export default function FitTrackLogo({ compact = false, className = "" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`grid place-items-center rounded-2xl bg-[#1778f2] text-white shadow-[0_18px_45px_-24px_rgba(23,120,242,0.9)] ${
          compact ? "h-10 w-10" : "h-12 w-12"
        }`}
      >
        <Dumbbell className={compact ? "h-4 w-4" : "h-5 w-5"} strokeWidth={2.4} />
      </div>
      <span className="text-xl font-semibold tracking-tight text-neutral-950">FitTrack</span>
    </div>
  );
}
