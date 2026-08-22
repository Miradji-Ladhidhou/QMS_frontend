import { Link } from 'react-router-dom';
import AppLogo from './AppLogo.jsx';

export default function LegalPageLayout({ title, updatedAt, children }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <AppLogo className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-semibold text-slate-900">
              QMS <span className="font-normal text-slate-400">SaaS</span>
            </span>
          </Link>
          <Link to="/" className="text-sm font-medium text-slate-600 hover:text-primary">
            Retour
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Dernière mise à jour : {updatedAt}</p>

        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Document de travail fourni à titre indicatif. Les informations entre crochets doivent être
          complétées et ce texte doit être validé par un professionnel du droit avant toute mise en
          production réelle.
        </div>

        <div className="mt-8 space-y-8">{children}</div>
      </main>

      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto max-w-3xl px-4 text-sm text-slate-400 sm:px-6">© 2026 QMS SaaS</div>
      </footer>
    </div>
  );
}
