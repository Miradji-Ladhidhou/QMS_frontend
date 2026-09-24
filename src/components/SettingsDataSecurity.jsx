import { useState } from 'react';
import { ExternalLink, LogOut, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export default function SettingsDataSecurity() {
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');

  async function signOutEverywhere() {
    if (!window.confirm('Déconnecter ce compte de tous les appareils ?')) return;
    setError('');
    setSigningOut(true);
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
    if (signOutError) {
      setError('Impossible de déconnecter les autres sessions.');
      setSigningOut(false);
      return;
    }
    window.location.assign('/login');
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Données et sécurité</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Les données sont isolées par entreprise. Votre mot de passe se modifie dans « Mon profil » et les sessions peuvent
          être révoquées ici.
        </p>
        {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={signOutEverywhere}
          disabled={signingOut}
          className="mt-4 flex min-h-[40px] items-center gap-2 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          <LogOut size={16} />
          {signingOut ? 'Déconnexion...' : 'Déconnecter tous les appareils'}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Documents légaux et données</h2>
        <p className="mt-2 text-sm text-slate-600">
          Consultez les informations relatives à la confidentialité et aux conditions d'utilisation. L'export complet et la
          suppression de toutes les données de l'entreprise nécessitent encore une fonctionnalité dédiée côté serveur.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
          <Link to="/legal/confidentialite" className="inline-flex items-center gap-1 text-primary hover:underline">
            Politique de confidentialité <ExternalLink size={14} />
          </Link>
          <Link to="/legal/cgu" className="inline-flex items-center gap-1 text-primary hover:underline">
            Conditions d'utilisation <ExternalLink size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
