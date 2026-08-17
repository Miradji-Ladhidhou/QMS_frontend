import { useEffect, useState } from 'react';
import { Download, TriangleAlert } from 'lucide-react';
import { api } from '../lib/api.js';
import { supabase } from '../lib/supabase.js';

export default function DataPrivacy() {
  const [tenantName, setTenantName] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const [confirmName, setConfirmName] = useState('');
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .get('/tenant')
      .then(({ data }) => setTenantName(data.name))
      .catch(() => {});
  }, []);

  async function handleExport() {
    setExporting(true);
    setExportError('');

    try {
      const response = await api.get('/tenant/export', { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `export-qms-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Impossible de générer l'export.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete(event) {
    event.preventDefault();
    setDeleteError('');

    if (confirmName !== tenantName) {
      setDeleteError("Le nom saisi ne correspond pas au nom de l'entreprise.");
      return;
    }

    setDeleting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user?.email,
      password,
    });

    if (verifyError) {
      setDeleteError('Mot de passe incorrect.');
      setDeleting(false);
      return;
    }

    try {
      await api.delete('/tenant', { data: { confirm_name: confirmName } });
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Impossible de supprimer les données.');
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Exporter mes données</h2>
        <p className="mt-2 text-sm text-slate-600">
          Téléchargez un fichier JSON contenant l'ensemble des données de votre entreprise : documents,
          CAPA, formations, indicateurs, analyses QQOQCCP et utilisateurs. Les fichiers joints aux documents
          ne sont pas inclus dans cet export et restent téléchargeables individuellement.
        </p>
        {exportError && (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {exportError}
          </p>
        )}
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="mt-4 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
        >
          <Download size={16} />
          {exporting ? 'Génération...' : 'Télécharger mes données'}
        </button>
      </div>

      <div className="rounded-xl border border-red-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <TriangleAlert size={18} className="text-red-600" />
          <h2 className="text-sm font-semibold text-red-700 sm:text-base">Supprimer définitivement l'entreprise</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Cette action supprime immédiatement et irréversiblement l'ensemble des données de votre entreprise
          — documents, CAPA, formations, indicateurs, analyses et comptes utilisateurs. Pensez à exporter vos
          données avant de continuer, cette action ne peut pas être annulée.
        </p>

        <form onSubmit={handleDelete} className="mt-4 space-y-3 sm:max-w-sm">
          {deleteError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {deleteError}
            </p>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Tapez « {tenantName} » pour confirmer
            </label>
            <input
              type="text"
              required
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Votre mot de passe</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <button
            type="submit"
            disabled={deleting || confirmName !== tenantName}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? 'Suppression...' : "Supprimer définitivement l'entreprise"}
          </button>
        </form>
      </div>
    </div>
  );
}
