export default function StatCard({ icon: Icon, label, value, sublabel }) {
  return (
    <div className="bg-white rounded-2xl border border-white/60 p-5 lg:p-6 transition-all hover:-translate-y-0.5 hover:shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <span className="text-[12px] font-medium text-neutral-500">
          {label}
        </span>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100">
            <Icon className="w-4 h-4 text-neutral-500" strokeWidth={1.8} />
          </span>
        )}
      </div>
      <div className="text-2xl lg:text-3xl font-semibold text-neutral-900 tracking-tight tabular-nums truncate">
        {value}
      </div>
      {sublabel && (
        <div className="text-sm text-neutral-500 mt-2 truncate">{sublabel}</div>
      )}
    </div>
  );
}
