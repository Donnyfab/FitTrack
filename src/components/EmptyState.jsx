export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-neutral-300" strokeWidth={2} />
        </div>
      )}
      <h3 className="text-base font-semibold text-neutral-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-neutral-500 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
