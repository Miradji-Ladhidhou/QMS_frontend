import { useState } from 'react';
import { Link } from 'react-router-dom';

const DISMISS_KEY = 'qms_cookie_notice_dismissed';

export default function CookieNotice() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');

  if (dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          QMS SaaS n'utilise aucun cookie de suivi ou publicitaire. Seul le stockage local strictement
          nécessaire à votre connexion est utilisé.{' '}
          <Link to="/legal/confidentialite" className="text-primary hover:underline">
            En savoir plus
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="w-full shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 sm:w-auto"
        >
          Compris
        </button>
      </div>
    </div>
  );
}
