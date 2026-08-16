import { supabase } from '../lib/supabase.js';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-4 sm:px-8 sm:py-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg sm:text-xl font-semibold text-primary">QMS SaaS</h1>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-slate-600 hover:text-primary"
          >
            Déconnexion
          </button>
        </div>
        <p className="text-slate-600">Tableau de bord à venir.</p>
      </div>
    </div>
  );
}
