export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-[1.35rem] bg-neutral-100 flex items-center justify-center mb-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
          <Icon className="w-6 h-6 text-neutral-500" strokeWidth={1.8} />
        </div>
      )}
      <h3 className="text-lg font-semibold text-neutral-900 mb-2 tracking-tight">{title}</h3>
      {description && (
        <p className="text-sm leading-6 text-neutral-500 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
