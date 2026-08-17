export default function LegalSection({ title, children }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-slate-700 sm:text-base">{children}</div>
    </section>
  );
}
