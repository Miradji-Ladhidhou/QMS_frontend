import { useState } from 'react';

export default function Maintenance() {
  const [message] = useState(() => {
    const value = sessionStorage.getItem('maintenance-message');
    sessionStorage.removeItem('maintenance-message');
    return value || "L'application est temporairement indisponible. Revenez dans quelques instants.";
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Maintenance en cours</h1>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{message}</p>
      </section>
    </main>
  );
}
