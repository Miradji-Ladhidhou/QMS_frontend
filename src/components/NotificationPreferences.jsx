import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const TOGGLE_LABELS = {
  email_documents_to_review: 'Documents à réviser',
  email_capa_overdue: 'CAPA en retard',
  email_training_renewal: 'Renouvellement de formation',
  email_approval_requests: "Demandes d'approbation",
  email_task_due: 'Tâches à échéance',
  email_procedure_review: 'Procédures à réviser',
};

const FREQUENCY_LABELS = {
  immediate: 'Immédiat',
  daily: 'Résumé quotidien',
  weekly: 'Résumé hebdomadaire',
};

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingField, setSavingField] = useState(null);

  useEffect(() => {
    api
      .get('/users/me/notification-preferences')
      .then(({ data }) => setPrefs(data))
      .catch(() => setError('Impossible de charger vos préférences.'))
      .finally(() => setLoading(false));
  }, []);

  async function updatePreference(field, value) {
    setSavingField(field);
    setError('');
    try {
      const { data } = await api.patch('/users/me/notification-preferences', { [field]: value });
      setPrefs(data);
    } catch {
      setError('Impossible de mettre à jour vos préférences.');
    } finally {
      setSavingField(null);
    }
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  if (!prefs) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
        {error || 'Préférences introuvables.'}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Notifications par email</h2>
      <p className="mt-1 text-sm text-slate-500">Choisissez les alertes que vous souhaitez recevoir par email.</p>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <ul className="mt-4 divide-y divide-slate-100">
        {Object.entries(TOGGLE_LABELS).map(([field, label]) => (
          <li key={field} className="flex items-center justify-between py-3">
            <span className="text-sm text-slate-700">{label}</span>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={prefs[field]}
                disabled={savingField === field}
                onChange={(e) => updatePreference(field, e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-primary peer-disabled:opacity-60" />
              <div className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <label className="mb-1 block text-sm font-medium text-slate-700">Fréquence des résumés</label>
        <select
          value={prefs.digest_frequency}
          disabled={savingField === 'digest_frequency'}
          onChange={(e) => updatePreference('digest_frequency', e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:max-w-xs"
        >
          {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
