import { useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import AutoTextarea from './AutoTextarea.jsx';

const FIELD_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

function sectionsMatchTemplate(sections, template) {
  const expectedKeys = (template?.section_structure || []).map((s) => s.key);
  const actualKeys = (sections || []).map((s) => s.key);
  return expectedKeys.length === actualKeys.length && expectedKeys.every((key, i) => key === actualKeys[i]);
}

// Éditeur réutilisé à la création ET à chaque nouvelle version — controlled (content/onChange),
// pour que le parent puisse aussi bien préremplir depuis AiProcedureDraft que gérer la
// soumission. Une seule zone de texte par section du gabarit du tenant (template.section_structure),
// jamais une structure inventée par ce composant.
export default function ProcedureSectionsEditor({ template, content, onChange }) {
  // Reconcilie content.sections avec le gabarit dès qu'il change (chargement initial, ou
  // gabarit modifié entre deux ouvertures) — en conservant le texte déjà saisi pour les clés
  // qui existent encore, jamais en écrasant silencieusement une saisie en cours.
  useEffect(() => {
    if (!template || sectionsMatchTemplate(content.sections, template)) return;
    const existingByKey = new Map((content.sections || []).map((s) => [s.key, s.content]));
    const reconciled = template.section_structure.map((s) => ({
      key: s.key,
      label: s.label,
      content: existingByKey.get(s.key) || '',
    }));
    onChange({ ...content, sections: reconciled });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  function updateField(field, value) {
    onChange({ ...content, [field]: value });
  }

  function updateSectionContent(index, value) {
    const sections = content.sections.map((s, i) => (i === index ? { ...s, content: value } : s));
    onChange({ ...content, sections });
  }

  function addDocument() {
    onChange({ ...content, documents_associes: [...(content.documents_associes || []), ''] });
  }

  function updateDocument(index, value) {
    const documents = content.documents_associes.map((d, i) => (i === index ? value : d));
    onChange({ ...content, documents_associes: documents });
  }

  function removeDocument(index) {
    onChange({ ...content, documents_associes: content.documents_associes.filter((_, i) => i !== index) });
  }

  if (!template) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
        Aucun gabarit de sections n'est configuré pour votre entreprise. Un administrateur peut en définir un depuis
        Paramètres &gt; Procédures.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Objet</label>
        <AutoTextarea rows={2} value={content.objet || ''} onChange={(e) => updateField('objet', e.target.value)} className={FIELD_CLASS} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Domaine d'application</label>
        <AutoTextarea
          rows={2}
          value={content.domaine_application || ''}
          onChange={(e) => updateField('domaine_application', e.target.value)}
          className={FIELD_CLASS}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Responsabilités</label>
        <AutoTextarea
          rows={2}
          value={content.responsabilites || ''}
          onChange={(e) => updateField('responsabilites', e.target.value)}
          className={FIELD_CLASS}
        />
      </div>

      {(content.sections || []).map((section, index) => (
        <div key={section.key}>
          <label className="mb-1 block text-sm font-medium text-slate-700">{section.label}</label>
          <AutoTextarea rows={4} value={section.content || ''} onChange={(e) => updateSectionContent(index, e.target.value)} className={FIELD_CLASS} />
        </div>
      ))}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Documents associés</label>
        <div className="space-y-2">
          {(content.documents_associes || []).map((doc, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={doc}
                onChange={(e) => updateDocument(index, e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <button
                type="button"
                onClick={() => removeDocument(index)}
                aria-label="Supprimer ce document associé"
                className="p-2 text-slate-400 hover:text-red-600"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addDocument}
          className="mt-2 flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-700"
        >
          <Plus size={14} />
          Ajouter un document associé
        </button>
      </div>
    </div>
  );
}
