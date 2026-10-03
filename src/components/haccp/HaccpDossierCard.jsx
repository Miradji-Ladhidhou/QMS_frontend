import { useState } from 'react';
import { FileCheck2, X } from 'lucide-react';
import { api } from '../../lib/api.js';
import AutoTextarea from '../AutoTextarea.jsx';

const FIELDS = [
  ['product_characteristics', 'Caractéristiques du produit', 'Composition, allergènes, conditionnement, durée de vie et conditions de conservation.'],
  ['intended_use', 'Usage prévu', 'Mode de consommation et préparation attendue.'],
  ['consumer_groups', 'Consommateurs concernés', 'Public visé, populations sensibles et restrictions éventuelles.'],
  ['prerequisites', 'Programmes prérequis', 'Hygiène, nettoyage, nuisibles, maintenance, fournisseurs, formation : références des procédures et preuves de leur application.'],
  ['flow_diagram_reference', 'Diagramme du procédé', 'Référence et version du diagramme couvrant toutes les étapes et les flux.'],
  ['flow_diagram_verification', 'Confirmation du diagramme sur site', 'Qui a confirmé le diagramme, à quelle date et selon quelles observations ?'],
  ['validation_review_notes', 'Validation des mesures de maîtrise', 'Preuves que les mesures peuvent maîtriser les dangers : études, textes applicables ou validation du procédé.'],
  ['verification_review_notes', 'Vérification du système', 'Résultats de revue des relevés, audits, contrôles et suivi des actions correctives.'],
  ['no_ccp_justification', 'Conclusion si aucun CCP identifié', 'Justification issue de l’analyse, mesures de maîtrise retenues et conclusion de l’équipe HACCP. Ne pas créer de CCP artificiel.'],
];

export default function HaccpDossierCard({ plan, canManage, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const completed = FIELDS.filter(([field]) => Boolean(plan[field]?.trim())).length;

  function openEditor() {
    setForm(Object.fromEntries(FIELDS.map(([field]) => [field, plan[field] || ''])));
    setError('');
    setEditing(true);
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await api.patch(`/haccp/plans/${plan.id}`, form);
      onSaved(data);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer le dossier HACCP.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FileCheck2 size={16} /> Dossier HACCP et preuves
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {completed}/{FIELDS.length} rubriques renseignées — indicateur de saisie, pas de conformité.
          </p>
        </div>
        {canManage && <button type="button" onClick={openEditor} className="min-h-[40px] rounded-md border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-50">Compléter le dossier</button>}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-medium text-slate-700">Consulter les éléments du dossier</summary>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {FIELDS.map(([field, label]) => (
            <div key={field}>
              <dt className="text-xs font-semibold text-slate-500">{label}</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-slate-700">{plan[field] || 'Non documenté'}</dd>
            </div>
          ))}
        </dl>
      </details>
      <p className="mt-3 text-xs text-slate-500">La validation démontre l’efficacité prévue des mesures ; la vérification contrôle leur application. Une revue réexamine le plan après un changement ou à une échéance définie.</p>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-2xl sm:rounded-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Compléter le dossier HACCP</h2>
              <button type="button" disabled={saving} onClick={() => setEditing(false)} aria-label="Fermer le dossier" className="p-2 text-slate-500"><X size={20} /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              {FIELDS.map(([field, label, help]) => (
                <label key={field} className="block text-sm font-medium text-slate-700">
                  {label}
                  <AutoTextarea rows={2} value={form[field]} onChange={(event) => setForm((previous) => ({ ...previous, [field]: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-primary" />
                  <span className="mt-1 block text-xs font-normal text-slate-500">{help}</span>
                </label>
              ))}
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <button type="submit" disabled={saving} className="min-h-[44px] w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? 'Enregistrement...' : 'Enregistrer le dossier'}</button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
