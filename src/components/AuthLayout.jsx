import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-neutral-900 mb-5">
            <Icon className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
          {subtitle && <p className="text-sm text-neutral-500 mt-2">{subtitle}</p>}
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-neutral-500 mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}
