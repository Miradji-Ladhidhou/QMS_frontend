import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Download, Loader2, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { getTenantLogoPublicUrl } from '../lib/storage.js';
import { postForWordDownload } from '../lib/pdfExport.js';
import AutoTextarea from './AutoTextarea.jsx';
import ProcedureAccentColorPicker from './ProcedureAccentColorPicker.jsx';

const DEFAULT_ACCENT_COLOR = '#44546A';
const DEFAULT_VISUAL_OPTIONS = { band: false, bulletStyle: 'dash', calloutStyle: 'left-border' };

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

// Configuration du gabarit de procédures pour tout le tenant — structure de sections ET
// personnalisation visuelle (couleur/options, voir le plan de refonte de la mise en page des
// procédures : remplace les 4 presets figés d'origine par une personnalisation directe). Une
// seule ligne (PUT upsert onConflict tenant_id), pas de CRUD section par section côté API.
export default function ProcedureTemplateSettings() {
  const [sections, setSections] = useState([]);
  const [fixedInstructions, setFixedInstructions] = useState('');
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR);
  const [visualOptions, setVisualOptions] = useState(DEFAULT_VISUAL_OPTIONS);
  const [tenantLogoUrl, setTenantLogoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [{ data }, { data: tenant }] = await Promise.all([api.get('/procedure-templates'), api.get('/tenant')]);
        setSections(data.section_structure || []);
        setFixedInstructions(data.fixed_instructions || '');
        setAccentColor(data.accent_color || DEFAULT_ACCENT_COLOR);
        setVisualOptions({ ...DEFAULT_VISUAL_OPTIONS, ...(data.visual_options || {}) });
        setTenantLogoUrl(getTenantLogoPublicUrl(tenant?.logo_url));
      } catch {
        setError('Impossible de charger le gabarit.');
      } finally {
        setLoading(false);
      }
    }
    load();
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

  function updateVisualOption(key, value) {
    setVisualOptions((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put('/procedure-templates', {
        section_structure: sections,
        fixed_instructions: fixedInstructions || undefined,
        accent_color: accentColor,
        visual_options: visualOptions,
      });
      setSections(data.section_structure || []);
      setFixedInstructions(data.fixed_instructions || '');
      setAccentColor(data.accent_color || DEFAULT_ACCENT_COLOR);
      setVisualOptions({ ...DEFAULT_VISUAL_OPTIONS, ...(data.visual_options || {}) });
      setDirty(false);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer le gabarit.");
    } finally {
      setSaving(false);
    }
  }

  // Applique les réglages EN COURS D'ÉDITION (pas ceux déjà enregistrés) sur un contenu
  // générique fixe côté serveur — rien n'est appliqué avant "Enregistrer le gabarit" ci-dessus,
  // cet aperçu est purement informatif.
  async function handlePreview() {
    setPreviewError('');
    setPreviewing(true);
    try {
      await postForWordDownload(
        '/procedure-templates/preview-word',
        { accent_color: accentColor, visual_options: visualOptions },
        'apercu-gabarit-procedures.docx'
      );
    } catch {
      setPreviewError("Impossible de générer l'aperçu.");
    } finally {
      setPreviewing(false);
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Style des documents exportés</h2>
        <p className="mt-1 text-sm text-slate-500">
          S'applique à l'export Word de chaque procédure — neutre par défaut, personnalisable pour rester cohérent
          avec votre charte.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Couleur d'accent</label>
            <ProcedureAccentColorPicker
              value={accentColor}
              onChange={(color) => {
                setAccentColor(color);
                setDirty(true);
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updateVisualOption('band', !visualOptions.band)}
              className={`rounded-md border px-3 py-2 text-sm font-medium ${
                visualOptions.band ? 'border-primary bg-primary/5 text-primary-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Bandeau de couleur en page 1 {visualOptions.band ? '(activé)' : '(désactivé)'}
            </button>
            <button
              type="button"
              onClick={() => updateVisualOption('bulletStyle', visualOptions.bulletStyle === 'round' ? 'dash' : 'round')}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Puces : {visualOptions.bulletStyle === 'round' ? 'rondes' : 'tirets'}
            </button>
            <button
              type="button"
              onClick={() => updateVisualOption('calloutStyle', visualOptions.calloutStyle === 'full-tint' ? 'left-border' : 'full-tint')}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Encadrés : {visualOptions.calloutStyle === 'full-tint' ? 'fond teinté' : 'bordure gauche'}
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
            {tenantLogoUrl ? (
              <img src={tenantLogoUrl} alt="Logo de l'entreprise" className="h-8 w-auto shrink-0 rounded bg-white object-contain p-0.5" />
            ) : (
              <span className="text-xs text-slate-400">Aucun logo configuré</span>
            )}
            <p className="text-xs text-slate-500">
              Le logo affiché dans l'export Word est celui de l'entreprise —{' '}
              <Link to="/settings?tab=company" className="font-medium text-primary hover:text-primary-700">
                le changer
              </Link>
              .
            </p>
          </div>

          {previewError && <p className="text-sm text-red-600">{previewError}</p>}

          <button
            type="button"
            onClick={handlePreview}
            disabled={previewing}
            className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {previewing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {previewing ? 'Génération...' : 'Aperçu Word'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Gabarit des procédures</h2>
        <p className="mt-1 text-sm text-slate-500">
          Les sections définies ici s'affichent, dans cet ordre, à la rédaction de chaque procédure — librement
          ajoutées/renommées/réordonnées/supprimées ensuite pour chaque procédure. Tant que rien n'a été enregistré,
          un point de départ minimal est proposé ci-dessous.
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
