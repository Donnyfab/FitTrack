export default function StatCard({ icon: Icon, label, value, sublabel }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-4 lg:p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
          {label}
        </span>
        {Icon && <Icon className="w-4 h-4 text-neutral-300" strokeWidth={2} />}
      </div>
      <div className="text-xl lg:text-2xl font-semibold text-neutral-900 tracking-tight truncate">
        {value}
      </div>
      {sublabel && (
        <div className="text-xs text-neutral-500 mt-1 truncate">{sublabel}</div>
      )}
    </div>
  );
}
