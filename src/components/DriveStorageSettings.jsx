import { useEffect, useState } from 'react';
import { HardDrive, Loader2 } from 'lucide-react';
import { api } from '../lib/api.js';

// Gating admin déjà assuré au niveau de l'onglet Paramètres qui rend ce composant (comme
// DocumentReviewSettings.jsx / CapaDelaysSettings.jsx) — pas de second contrôle de rôle ici.
export default function DriveStorageSettings() {
  const [status, setStatus] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [activating, setActivating] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  // true juste après le retour du callback OAuth (voir driveIntegration.js) : affiche la
  // confirmation "Activer ?" avant de basculer réellement le provider, plutôt que de le faire
  // automatiquement dès que la connexion Google a réussi — ce sont deux étapes distinctes.
  const [justConnected, setJustConnected] = useState(false);
  const [oauthError, setOauthError] = useState('');

  async function loadStatus() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/drive/status');
      setStatus(data);
      if (data.connected) {
        api
          .get('/drive/health')
          .then(({ data: h }) => setHealth(h))
          .catch(() => setHealth(null));
      } else {
        setHealth(null);
      }
    } catch {
      setError("Impossible de récupérer l'état de la connexion Google Drive.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Le callback OAuth (backend) redirige ici avec ?drive=connected ou ?drive=error&message=...
    // — on les lit une fois puis on les retire de l'URL, pour qu'un rechargement de page ne
    // réaffiche pas indéfiniment la bannière de confirmation ou l'erreur.
    const params = new URLSearchParams(window.location.search);
    const driveParam = params.get('drive');

    if (driveParam === 'connected') {
      setJustConnected(true);
    } else if (driveParam === 'error') {
      setOauthError(params.get('message') || 'La connexion à Google Drive a échoué.');
    }

    if (driveParam) {
      params.delete('drive');
      params.delete('message');
      const newSearch = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (newSearch ? `?${newSearch}` : ''));
    }

    loadStatus();
  }, []);

  async function handleConnect() {
    setActionError('');
    setConnecting(true);
    try {
      const { data } = await api.get('/drive/connect');
      window.location.href = data.url;
    } catch (err) {
      setActionError(err.response?.data?.error || 'Impossible de démarrer la connexion à Google Drive.');
      setConnecting(false);
    }
  }

  async function handleActivate() {
    setActionError('');
    setActivating(true);
    try {
      await api.post('/drive/activate');
      setJustConnected(false);
      await loadStatus();
    } catch (err) {
      setActionError(err.response?.data?.error || "Impossible d'activer Google Drive.");
    } finally {
      setActivating(false);
    }
  }

  async function handleDisconnect() {
    if (
      !window.confirm(
        'Vos documents déjà sur Drive resteront accessibles depuis Drive directement. Les nouveaux documents seront à nouveau stockés sur Supabase. Déconnecter Google Drive ?'
      )
    ) {
      return;
    }

    setActionError('');
    setDisconnecting(true);
    try {
      await api.delete('/drive/disconnect');
      setJustConnected(false);
      await loadStatus();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Impossible de déconnecter Google Drive.');
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return <div className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  const isActive = status?.storage_provider === 'google_drive';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <HardDrive size={18} className="text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Stockage des documents</h2>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {oauthError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{oauthError}</p>
      )}
      {actionError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{actionError}</p>
      )}

      <p className="mt-3 text-sm text-slate-600">
        Stockage actuel :{' '}
        {isActive ? (
          <>
            Google Drive (connecté en tant que <span className="font-medium">{status.google_email}</span>)
          </>
        ) : (
          'Supabase (par défaut)'
        )}
      </p>

      {justConnected && status?.connected && (
        <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm text-slate-700">
            Connexion réussie à <span className="font-medium">{status.google_email}</span>. Voulez-vous utiliser
            Google Drive pour vos nouveaux documents à partir de maintenant ?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleActivate}
              disabled={activating}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {activating ? 'Activation...' : 'Activer'}
            </button>
            <button
              type="button"
              onClick={() => setJustConnected(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {!status?.connected && (
        <div className="mt-4">
          <p className="text-sm text-slate-500">
            Vos nouveaux documents seront stockés directement dans le Google Drive de votre entreprise plutôt que
            sur nos serveurs.
          </p>
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting}
            className="mt-3 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {connecting ? <Loader2 size={16} className="animate-spin" /> : <HardDrive size={16} />}
            {connecting ? 'Redirection...' : 'Connecter Google Drive'}
          </button>
        </div>
      )}

      {status?.connected && !justConnected && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {health && (
            <span
              className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                health.healthy ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${health.healthy ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {health.healthy ? 'Connexion active' : 'Connexion expirée'}
            </span>
          )}
          {!isActive && (
            <button
              type="button"
              onClick={handleActivate}
              disabled={activating}
              className="rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary-50 disabled:opacity-60"
            >
              {activating ? 'Activation...' : 'Activer pour les nouveaux documents'}
            </button>
          )}
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {disconnecting ? 'Déconnexion...' : 'Déconnecter'}
          </button>
        </div>
      )}
    </div>
  );
}
