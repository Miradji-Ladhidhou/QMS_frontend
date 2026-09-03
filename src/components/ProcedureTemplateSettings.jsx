import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Sparkles, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import AutoTextarea from './AutoTextarea.jsx';

// Slug technique dérivé du libellé — c'est CETTE valeur que l'IA et procedure_versions.content
// utilisent pour retrouver une section (voir section_key dans groq.js), jamais le libellé
// affiché qui peut changer sans casser les contenus déjà rédigés.
function slugify(label) {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Configuration du gabarit de sections utilisé par ProcedureSectionsEditor pour tout le tenant
// — une seule ligne (PUT upsert onConflict tenant_id), pas de CRUD section par section côté
// API : on édite le tableau localement puis on enregistre le tout d'un coup, comme
// MenuVisibilitySettings plutôt que comme ModuleCategoryManager (pas d'id serveur par section).
export default function ProcedureTemplateSettings() {
  const [sections, setSections] = useState([]);
  const [fixedInstructions, setFixedInstructions] = useState('');
  const [presets, setPresets] = useState([]);
  const [applyingPresetId, setApplyingPresetId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [presetError, setPresetError] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/procedure-templates');
        setSections(data.section_structure || []);
        setFixedInstructions(data.fixed_instructions || '');
      } catch {
        setError('Impossible de charger le gabarit.');
      } finally {
        setLoading(false);
      }
    }
    load();

    api
      .get('/procedure-templates/presets')
      .then(({ data }) => setPresets(data))
      .catch(() => {});
  }, []);

  function addSection(event) {
    event.preventDefault();
    const label = newLabel.trim();
    if (!label) return;

    let key = slugify(label);
    if (!key) return;
    const existingKeys = new Set(sections.map((s) => s.key));
    if (existingKeys.has(key)) {
      let suffix = 2;
      while (existingKeys.has(`${key}_${suffix}`)) suffix += 1;
      key = `${key}_${suffix}`;
    }

    setSections((prev) => [...prev, { key, label }]);
    setNewLabel('');
    setDirty(true);
  }

  function removeSection(index) {
    setSections((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  function moveSection(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    setSections((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put('/procedure-templates', {
        section_structure: sections,
        fixed_instructions: fixedInstructions || undefined,
      });
      setSections(data.section_structure || []);
      setFixedInstructions(data.fixed_instructions || '');
      setDirty(false);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer le gabarit.");
    } finally {
      setSaving(false);
    }
  }

  // Copie le preset dans le gabarit du tenant — à partir de là c'est une copie normale,
  // librement modifiable ensuite (voir POST /apply-preset côté backend). N'affecte jamais les
  // procédures déjà rédigées : seules les PROCHAINES générations en tiendront compte.
  async function handleApplyPreset(preset) {
    if (
      !window.confirm(
        `Remplacer le gabarit actuel par "${preset.name}" ? Cette action n'affecte que les prochaines générations — les procédures déjà créées gardent leur contenu tel quel. Vous pourrez modifier le résultat ensuite.`
      )
    ) {
      return;
    }

    setPresetError('');
    setApplyingPresetId(preset.id);
    try {
      const { data } = await api.post('/procedure-templates/apply-preset', { preset_id: preset.id });
      setSections(data.section_structure || []);
      setFixedInstructions(data.fixed_instructions || '');
      setDirty(false);
    } catch (err) {
      setPresetError(err.response?.data?.error || "Impossible d'appliquer ce preset.");
    } finally {
      setApplyingPresetId(null);
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  return (
    <div className="space-y-4">
      {presets.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Points de départ suggérés</h2>
          <p className="mt-1 text-sm text-slate-500">
            Choisissez un style pour démarrer, puis ajustez-le librement ci-dessous — appliquer un preset remplace le
            gabarit actuel et n'affecte que les prochaines générations.
          </p>

          {presetError && (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {presetError}
            </p>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {presets.map((preset) => (
              <div key={preset.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: preset.renderStyle?.accentColor || '#94A3B8' }}
                  />
                  <p className="text-sm font-semibold text-slate-900">{preset.name}</p>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">{preset.description}</p>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  disabled={applyingPresetId === preset.id}
                  className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-700 disabled:opacity-50"
                >
                  <Sparkles size={14} />
                  {applyingPresetId === preset.id ? 'Application...' : 'Appliquer ce preset'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Gabarit des procédures</h2>
        <p className="mt-1 text-sm text-slate-500">
          Les sections définies ici s'affichent, dans cet ordre, à la rédaction de chaque procédure. Les
          champs Objet, Domaine d'application et Responsabilités sont toujours présents et n'ont pas besoin
          d'être ajoutés ici. Tant que rien n'a été enregistré, un point de départ minimal est proposé
          ci-dessous — renommez, complétez ou supprimez-le librement avant de l'enregistrer.
        </p>

        {error && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        {sections.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Aucune section configurée pour l'instant.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {sections.map((section, index) => (
              <li key={section.key} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-800">{section.label}</p>
                  <p className="text-xs text-slate-400">{section.key}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => moveSection(index, -1)}
                    disabled={index === 0}
                    aria-label="Monter"
                    className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-primary disabled:opacity-30"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(index, 1)}
                    disabled={index === sections.length - 1}
                    aria-label="Descendre"
                    className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-primary disabled:opacity-30"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSection(index)}
                    aria-label="Supprimer"
                    className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={addSection} className="mt-4 flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Nom de la nouvelle section (ex. Étapes du processus)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <button
            type="submit"
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus size={16} />
            Ajouter
          </button>
        </form>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Consignes de style pour l'IA <span className="font-normal text-slate-400">(optionnel)</span>
          </label>
          <AutoTextarea
            rows={3}
            value={fixedInstructions}
            onChange={(e) => {
              setFixedInstructions(e.target.value);
              setDirty(true);
            }}
            placeholder="Ex. en-tête à reprendre tel quel, façon de présenter les listes, encadrés à utiliser..."
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <p className="mt-1 text-xs text-slate-400">
            Prise en compte par l'IA à la génération d'un brouillon et à la vérification de conformité.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer le gabarit'}
        </button>
      </div>
    </div>
  );
}
