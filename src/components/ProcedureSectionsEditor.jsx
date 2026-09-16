import { useEffect, useRef } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import AutoTextarea from './AutoTextarea.jsx';
import TableBlockEditor from './TableBlockEditor.jsx';
import { buildSommaireItems, ensureSommaireSection } from '../lib/procedureBlocks.js';

const FIELD_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

function makeId() {
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(label) {
  return (
    (label || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'section'
  );
}

function makeSectionKey(label, existingKeys) {
  const base = slugify(label);
  let key = base;
  let n = 2;
  while (existingKeys.includes(key)) {
    key = `${base}_${n}`;
    n += 1;
  }
  return key;
}

const BLOCK_TYPES = [
  { type: 'paragraphe', label: '+ Paragraphe' },
  { type: 'liste_puces', label: '+ Liste à puces' },
  { type: 'tableau', label: '+ Tableau' },
  { type: 'encadre', label: '+ Encadré' },
  { type: 'sous_titre', label: '+ Sous-titre' },
];

function emptyBlock(type) {
  switch (type) {
    case 'liste_puces':
      return { type, id: makeId(), items: [''] };
    case 'tableau':
      return { type, id: makeId(), headers: ['Colonne 1', 'Colonne 2'], rows: [['', '']] };
    case 'encadre':
      return { type, id: makeId(), text: '' };
    case 'sous_titre':
      return { type, id: makeId(), text: '' };
    case 'paragraphe':
    default:
      return { type: 'paragraphe', id: makeId(), text: '' };
  }
}

// Barre de contrôles up/down/suppression, factorisée entre sections et blocs (même motif visuel
// pour les deux niveaux de réordonnancement, sans bibliothèque de drag-and-drop).
function ReorderControls({ onMoveUp, onMoveDown, onRemove, canMoveUp, canMoveDown, removeLabel }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={onMoveUp}
        disabled={!canMoveUp}
        aria-label="Déplacer vers le haut"
        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
      >
        <ArrowUp size={14} />
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={!canMoveDown}
        aria-label="Déplacer vers le bas"
        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
      >
        <ArrowDown size={14} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// Éditeur d'UN bloc, quel que soit son type — le pendant manuel du walker de rendu (voir
// services/procedureWord.js#blocksToDocxParagraphs / services/procedurePdf.js#drawBlocks, même
// schéma de blocs des deux côtés).
function BlockEditor({ block, onChange }) {
  if (block.type === 'liste_puces') {
    const items = block.items || [];
    return (
      <div className="space-y-1.5">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => onChange({ ...block, items: items.map((it, i) => (i === index ? e.target.value : it)) })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <button
              type="button"
              onClick={() => onChange({ ...block, items: items.filter((_, i) => i !== index) })}
              aria-label="Supprimer cette puce"
              className="p-2 text-slate-400 hover:text-red-600"
            >
              <X size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ ...block, items: [...items, ''] })}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-700"
        >
          <Plus size={12} /> Ajouter une puce
        </button>
      </div>
    );
  }

  if (block.type === 'tableau') {
    return <TableBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === 'sous_titre') {
    return (
      <input
        type="text"
        value={block.text || ''}
        onChange={(e) => onChange({ ...block, text: e.target.value })}
        placeholder="Sous-titre"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
      />
    );
  }

  if (block.type === 'photo_placeholder') {
    // Bloc issu de la génération IA (voir services/procedureFullDraftJob.js) — sa légende
    // reste modifiable, mais ce type n'est volontairement pas proposé dans la barre d'outils
    // ci-dessous : le rédacteur insère lui-même une vraie photo dans Word à cet emplacement.
    return (
      <input
        type="text"
        value={block.caption || ''}
        onChange={(e) => onChange({ ...block, caption: e.target.value })}
        placeholder="Légende de la photo à insérer"
        className="w-full rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm italic text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
      />
    );
  }

  // encadre / paragraphe : même éditeur, un texte libre — aucun sélecteur de sévérité pour
  // l'encadré (un seul traitement visuel, voir le plan de refonte).
  return (
    <AutoTextarea
      rows={block.type === 'encadre' ? 2 : 3}
      value={block.text || ''}
      onChange={(e) => onChange({ ...block, text: e.target.value })}
      className={FIELD_CLASS}
    />
  );
}

// Éditeur réutilisé à la création ET à chaque nouvelle version — controlled (content/onChange),
// pour que le parent puisse aussi bien préremplir depuis AiProcedureDraft que gérer la
// soumission. content : { sections: [{key,label,blocks}], documents_associes } — le modèle à
// blocs canonique (voir le plan de refonte : objet/domaine d'application/responsabilités ne
// sont plus des champs séparés, ce sont des sections ordinaires comme les autres).
export default function ProcedureSectionsEditor({ template, content, onChange }) {
  // Amorce UNE SEULE FOIS les sections du gabarit du tenant si le contenu démarre vide (nouvelle
  // procédure) — jamais une reconciliation continue : contrairement à l'ancien comportement,
  // l'utilisateur peut ensuite ajouter/renommer/réordonner/supprimer librement sans que ce
  // composant ne réécrase sa saisie à chaque rendu.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !template) return;
    seededRef.current = true;
    if ((content.sections || []).length > 0) return;
    const seeded = (template.section_structure || []).map((s) => ({ key: s.key, label: s.label, blocks: [] }));
    // Sommaire pré-rempli par défaut (voir le plan de refonte, point 1) — une section "sommaire"
    // en tête, éditable/réécrivable librement ensuite comme n'importe quel autre bloc, jamais
    // recalculée automatiquement une fois créée.
    onChange({ ...content, sections: ensureSommaireSection(seeded) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  const sections = content.sections || [];

  function updateSections(nextSections) {
    onChange({ ...content, sections: nextSections });
  }

  function addSection() {
    const existingKeys = sections.map((s) => s.key);
    const label = `Nouvelle section ${sections.length + 1}`;
    updateSections([...sections, { key: makeSectionKey(label, existingKeys), label, blocks: [] }]);
  }

  function renameSection(index, label) {
    updateSections(sections.map((s, i) => (i === index ? { ...s, label } : s)));
  }

  function moveSection(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    updateSections(next);
  }

  function removeSection(index) {
    updateSections(sections.filter((_, i) => i !== index));
  }

  function updateSectionBlocks(sectionIndex, blocks) {
    updateSections(sections.map((s, i) => (i === sectionIndex ? { ...s, blocks } : s)));
  }

  // Régénère le SEUL bloc liste_puces de la section "sommaire" à partir des libellés actuels des
  // autres sections — une action explicite de l'utilisateur (bouton), jamais automatique : voir
  // le plan de refonte, le sommaire ne doit jamais être écrasé silencieusement une fois créé.
  function regenerateSommaire(sectionIndex) {
    const items = buildSommaireItems(sections);
    const blocks = sections[sectionIndex].blocks || [];
    const listIndex = blocks.findIndex((b) => b.type === 'liste_puces');
    const nextBlocks =
      listIndex >= 0
        ? blocks.map((b, i) => (i === listIndex ? { ...b, items } : b))
        : [...blocks, { type: 'liste_puces', id: makeId(), items }];
    updateSectionBlocks(sectionIndex, nextBlocks);
  }

  function addBlock(sectionIndex, type) {
    const section = sections[sectionIndex];
    updateSectionBlocks(sectionIndex, [...(section.blocks || []), emptyBlock(type)]);
  }

  function updateBlock(sectionIndex, blockIndex, nextBlock) {
    const blocks = sections[sectionIndex].blocks || [];
    updateSectionBlocks(sectionIndex, blocks.map((b, i) => (i === blockIndex ? nextBlock : b)));
  }

  function moveBlock(sectionIndex, blockIndex, direction) {
    const blocks = sections[sectionIndex].blocks || [];
    const target = blockIndex + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[blockIndex], next[target]] = [next[target], next[blockIndex]];
    updateSectionBlocks(sectionIndex, next);
  }

  function removeBlock(sectionIndex, blockIndex) {
    const blocks = sections[sectionIndex].blocks || [];
    updateSectionBlocks(sectionIndex, blocks.filter((_, i) => i !== blockIndex));
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

  return (
    <div className="space-y-4">
      {sections.map((section, sectionIndex) => {
        // Blocs "à compléter manuellement" issus d'un échec de génération IA (voir
        // services/procedureFullDraftJob.js) — ce badge les rend visibles sans avoir à tout
        // relire, en comptant les sous-titres suivis d'un tel paragraphe.
        const failedCount = (section.blocks || []).filter(
          (b) => b.type === 'paragraphe' && b.text?.startsWith('À compléter manuellement')
        ).length;
        const blocks = section.blocks || [];
        return (
          <div key={section.key} className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center gap-2">
              <input
                type="text"
                value={section.label}
                onChange={(e) => renameSection(sectionIndex, e.target.value)}
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
              {failedCount > 0 && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  <AlertTriangle size={12} />
                  {failedCount > 1 ? `${failedCount} passages` : '1 passage'}
                </span>
              )}
              {section.key === 'sommaire' && (
                <button
                  type="button"
                  onClick={() => regenerateSommaire(sectionIndex)}
                  title="Remplace la liste ci-dessous par les titres de section actuels — n'écrase rien d'autre"
                  className="flex shrink-0 items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <RefreshCw size={12} />
                  Régénérer
                </button>
              )}
              <ReorderControls
                onMoveUp={() => moveSection(sectionIndex, -1)}
                onMoveDown={() => moveSection(sectionIndex, 1)}
                onRemove={() => removeSection(sectionIndex)}
                canMoveUp={sectionIndex > 0}
                canMoveDown={sectionIndex < sections.length - 1}
                removeLabel="Supprimer cette section"
              />
            </div>

            <div className="space-y-2">
              {blocks.map((block, blockIndex) => (
                <div key={block.id} className="flex items-start gap-2 rounded-md bg-slate-50 p-2">
                  <div className="min-w-0 flex-1">
                    <BlockEditor block={block} onChange={(next) => updateBlock(sectionIndex, blockIndex, next)} />
                  </div>
                  <ReorderControls
                    onMoveUp={() => moveBlock(sectionIndex, blockIndex, -1)}
                    onMoveDown={() => moveBlock(sectionIndex, blockIndex, 1)}
                    onRemove={() => removeBlock(sectionIndex, blockIndex)}
                    canMoveUp={blockIndex > 0}
                    canMoveDown={blockIndex < blocks.length - 1}
                    removeLabel="Supprimer ce bloc"
                  />
                </div>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {BLOCK_TYPES.map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addBlock(sectionIndex, type)}
                  className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addSection}
        className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-700"
      >
        <Plus size={14} />
        Ajouter une section
      </button>

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
