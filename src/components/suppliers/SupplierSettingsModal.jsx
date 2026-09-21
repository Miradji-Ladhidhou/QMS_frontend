import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../lib/api.js';
import { CRITERIA, CRITICALITIES } from '../../lib/supplierPolicy.js';

const FIELD_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:py-2 sm:text-sm';

// Réglages de l'évaluation des fournisseurs (admin) : rythme d'évaluation selon la criticité, seuils qui proposent la
// décision, poids des critères par criticité et suspension automatique. Ils s'appliquent aux évaluations à venir :
// chaque évaluation passée garde les poids qu'elle avait à sa date.
export default function SupplierSettingsModal({ onClose, onSaved }) {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/suppliers/settings')
      .then(({ data }) => setSettings(data))
      .catch(() => setError('Impossible de charger les réglages.'));
  }, []);

  function setFrequency(criticality, value) {
    setSettings((prev) => ({ ...prev, frequency_months: { ...prev.frequency_months, [criticality]: value } }));
  }
  function setThreshold(name, value) {
    setSettings((prev) => ({ ...prev, thresholds: { ...prev.thresholds, [name]: value } }));
  }
  function setWeight(criticality, criterion, value) {
    setSettings((prev) => ({ ...prev, weights: { ...prev.weights, [criticality]: { ...prev.weights[criticality], [criterion]: value } } }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    // Les champs se saisissent en texte ; le serveur exige des nombres (entiers pour les mois et les poids).
    const payload = {
      frequency_months: Object.fromEntries(CRITICALITIES.map(({ key }) => [key, Number(settings.frequency_months[key])])),
      thresholds: { watch: Number(String(settings.thresholds.watch).replace(',', '.')), replace: Number(String(settings.thresholds.replace).replace(',', '.')) },
      weights: Object.fromEntries(CRITICALITIES.map(({ key }) => [key, Object.fromEntries(CRITERIA.map((criterion) => [criterion.key, Number(settings.weights[key][criterion.key])]))])),
      auto_suspend_on_replace: settings.auto_suspend_on_replace,
    };
    let data;
    try {
      ({ data } = await api.patch('/suppliers/settings', payload));
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer les réglages.");
      setSaving(false);
      return;
    }
    setSaving(false);
    onSaved(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-2xl sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Réglages de l'évaluation</h2>
            <p className="text-sm text-slate-500">Rythme, seuils de décision et poids des critères.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="-m-2 shrink-0 p-2.5 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {!settings ? (
          error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : <div className="h-40 animate-pulse rounded-md bg-slate-100" />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <section>
              <h3 className="text-sm font-semibold text-slate-900">Évaluer tous les… (mois)</h3>
              <p className="text-xs text-slate-500">La prochaine évaluation se date toute seule depuis la dernière, selon la criticité du fournisseur.</p>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {CRITICALITIES.map(({ key, label }) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
                    <input type="number" min="1" max="120" inputMode="numeric" required value={settings.frequency_months[key]} onChange={(e) => setFrequency(key, e.target.value)} className={FIELD_CLASS} />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-slate-900">Seuils de décision (note sur 5)</h3>
              <p className="text-xs text-slate-500">La décision proposée : sous le premier seuil « sous surveillance », sous le second « à remplacer ». S'en écarter en étant plus indulgent exige un commentaire.</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Sous surveillance sous</label>
                  <input type="text" inputMode="decimal" required value={settings.thresholds.watch} onChange={(e) => setThreshold('watch', e.target.value)} className={FIELD_CLASS} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">À remplacer sous</label>
                  <input type="text" inputMode="decimal" required value={settings.thresholds.replace} onChange={(e) => setThreshold('replace', e.target.value)} className={FIELD_CLASS} />
                </div>
              </div>
              <label className="mt-3 flex min-h-[40px] cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                <input type="checkbox" checked={settings.auto_suspend_on_replace} onChange={(e) => setSettings((prev) => ({ ...prev, auto_suspend_on_replace: e.target.checked }))} className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-primary focus:ring-primary" />
                <span>Suspendre automatiquement un fournisseur dont la décision est « à remplacer »</span>
              </label>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-slate-900">Poids des critères</h3>
              <p className="text-xs text-slate-500">De 0 à 10 : un critère de poids 3 compte trois fois plus qu'un critère de poids 1. 0 = ignoré (au moins un critère doit compter).</p>
              <div className="mt-2 space-y-3">
                {CRITICALITIES.map(({ key, label }) => (
                  <div key={key} className="rounded-md border border-slate-200 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Criticité {label.toLowerCase()}</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {CRITERIA.map((criterion) => (
                        <div key={criterion.key}>
                          <label className="mb-1 block text-xs font-medium text-slate-600">{criterion.label}</label>
                          <input type="number" min="0" max="10" inputMode="numeric" required value={settings.weights[key][criterion.key]} onChange={(e) => setWeight(key, criterion.key, e.target.value)} className={FIELD_CLASS} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={saving} className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60">
              {saving ? 'Enregistrement...' : 'Enregistrer les réglages'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
