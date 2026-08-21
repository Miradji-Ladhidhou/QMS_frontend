import { useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import { api } from '../lib/api.js';
import { getTenantLogoPublicUrl } from '../lib/storage.js';

// Liste complète des fuseaux IANA fournie par le navigateur — évite de maintenir une liste à
// la main, et garantit qu'Intl.DateTimeFormat sait toujours interpréter la valeur choisie.
const TIMEZONES = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC'];

export default function CompanySettings({ isAdmin }) {
  const [tenant, setTenant] = useState(null);
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function loadTenant() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/tenant');
      setTenant(data);
      setName(data.name);
      setTimezone(data.timezone || 'UTC');
    } catch {
      setError("Impossible de charger les informations de l'entreprise.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTenant();
  }, []);

  async function handleNameSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSavingName(true);

    try {
      const { data } = await api.patch('/tenant', { name, timezone });
      setTenant(data);
      // useTenant() (Layout.jsx, horloge du menu) ne recharge pas tout seul après ce PATCH —
      // ce broadcast le prévient explicitement, sinon le fuseau affiché reste l'ancien tant
      // qu'aucune navigation ne remonte le composant.
      window.dispatchEvent(new CustomEvent('tenant-updated', { detail: data }));
      setSuccess('Informations mises à jour.');
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de mettre à jour les informations.');
    } finally {
      setSavingName(false);
    }
  }

  async function handleLogoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/tenant/logo', formData);
      setTenant(data);
      setSuccess('Logo mis à jour.');
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de mettre à jour le logo.');
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  }

  if (loading) {
    return <div className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  const logoUrl = getTenantLogoPublicUrl(tenant?.logo_url);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Informations de l'entreprise</h2>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {success && (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      )}

      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo de l'entreprise" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-slate-400">Logo</span>
          )}
        </div>
        {isAdmin && (
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Upload size={16} />
            {uploadingLogo ? 'Envoi...' : 'Changer le logo'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
              disabled={uploadingLogo}
            />
          </label>
        )}
      </div>

      <form onSubmit={handleNameSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700">Nom de l'entreprise</label>
          <input
            type="text"
            required
            disabled={!isAdmin}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700">Fuseau horaire</label>
          <select
            disabled={!isAdmin}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        {isAdmin && (
          <button
            type="submit"
            disabled={savingName}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {savingName ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        )}
      </form>
    </div>
  );
}
