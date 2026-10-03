import { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { api } from '../lib/api.js';
import { useTenant } from '../lib/useTenant.js';
import { getTenantLogoPublicUrl } from '../lib/storage.js';

// Liste complète des fuseaux IANA fournie par le navigateur — évite de maintenir une liste à
// la main, et garantit qu'Intl.DateTimeFormat sait toujours interpréter la valeur choisie.
const TIMEZONES = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC'];

export default function CompanySettings({ isAdmin }) {
  // Lit le contexte partagé (voir TenantProvider.jsx) plutôt que son propre GET /tenant
  // redondant — le formulaire (name/timezone) reste un état local distinct, initialisé UNE
  // SEULE fois dès que le tenant partagé devient disponible (seededRef), jamais à chaque
  // changement de `tenant` : une modification survenue ailleurs (un autre onglet/admin)
  // pendant une saisie en cours ici ne doit pas écraser une édition non enregistrée.
  const tenant = useTenant();
  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    timezone: 'UTC',
    company_address: '',
    company_phone: '',
    company_legal_mentions: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const seededRef = useRef(false);

  useEffect(() => {
    if (tenant && !seededRef.current) {
      seededRef.current = true;
      setCompanyInfo({
        name: tenant.name || '',
        timezone: tenant.timezone || 'UTC',
        company_address: tenant.company_address || '',
        company_phone: tenant.company_phone || '',
        company_legal_mentions: tenant.company_legal_mentions || '',
      });
    }
  }, [tenant]);

  async function handleNameSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSavingName(true);

    try {
      const { data } = await api.patch('/tenant', companyInfo);
      // TenantProvider.jsx (contexte partagé lu par useTenant() partout dans l'appli, dont ce
      // composant lui-même) ne recharge pas tout seul après ce PATCH — ce broadcast le prévient
      // explicitement, sinon le fuseau affiché reste l'ancien tant qu'aucune navigation ne
      // remonte le Provider.
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
      window.dispatchEvent(new CustomEvent('tenant-updated', { detail: data }));
      setSuccess('Logo mis à jour.');
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de mettre à jour le logo.');
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  }

  if (!tenant) {
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

      <form onSubmit={handleNameSubmit} className="mt-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nom de l'entreprise</label>
            <input
              type="text"
              required
              disabled={!isAdmin}
              value={companyInfo.name}
              onChange={(e) => setCompanyInfo((current) => ({ ...current, name: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fuseau horaire</label>
            <select
              disabled={!isAdmin}
              value={companyInfo.timezone}
              onChange={(e) => setCompanyInfo((current) => ({ ...current, timezone: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Adresse de l'entreprise</label>
            <input
              type="text"
              maxLength={300}
              disabled={!isAdmin}
              value={companyInfo.company_address}
              onChange={(e) => setCompanyInfo((current) => ({ ...current, company_address: e.target.value }))}
              placeholder="Adresse postale"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Téléphone</label>
            <input
              type="tel"
              maxLength={80}
              disabled={!isAdmin}
              value={companyInfo.company_phone}
              onChange={(e) => setCompanyInfo((current) => ({ ...current, company_phone: e.target.value }))}
              placeholder="Numéro de téléphone"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Mentions légales</label>
            <textarea
              rows={2}
              maxLength={300}
              disabled={!isAdmin}
              value={companyInfo.company_legal_mentions}
              onChange={(e) => setCompanyInfo((current) => ({ ...current, company_legal_mentions: e.target.value }))}
              placeholder="Forme juridique, capital, SIRET…"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
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
