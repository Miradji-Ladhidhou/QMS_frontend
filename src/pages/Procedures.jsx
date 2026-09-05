import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Folder,
  FolderPlus,
  List,
  Loader2,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { STATUS_LABELS } from '../lib/documentStatus.js';
import { exportTableCsv, exportToPdf, exportToXlsx, exportToWord, exportToDrive } from '../lib/pdfExport.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useTenant } from '../lib/useTenant.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import StatusBadge from '../components/StatusBadge.jsx';
import CategoryBadge from '../components/CategoryBadge.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import BulkSelectionBar from '../components/BulkSelectionBar.jsx';
import SelectAllToggle from '../components/SelectAllToggle.jsx';
import BulkMoveCategoryModal from '../components/BulkMoveCategoryModal.jsx';
import AiProcedureDraft from '../components/AiProcedureDraft.jsx';
import AiFullProcedureDraft from '../components/AiFullProcedureDraft.jsx';
import NewProcedureFullDraftModal from '../components/NewProcedureFullDraftModal.jsx';
import ProcedureSectionsEditor from '../components/ProcedureSectionsEditor.jsx';
import ExportMenu from '../components/ExportMenu.jsx';

const EMPTY_CONTENT = { objet: '', domaine_application: '', responsabilites: '', sections: [], documents_associes: [] };

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

// Pas de statut "overdue" dédié côté procédures (contrairement aux CAPA, où c'est une vraie
// valeur de statut recalculée par un job) — juste une date dépassée, calculée ici à
// l'affichage. Une procédure déjà obsolète n'a plus de revue "en retard" à signaler : elle est
// retirée de la circulation, pas simplement en attente de révision.
function isReviewOverdue(procedure) {
  if (!procedure.next_review_date || procedure.status === 'obsolete') return false;
  return procedure.next_review_date < new Date().toISOString().slice(0, 10);
}

// initialTitle/initialContent/initialAiGenerated : préremplissage venu du parcours de
// génération complète (voir NewProcedureFullDraftModal.jsx) — la génération a déjà eu lieu
// avant l'ouverture de cette modale, donc on se contente de seeder l'état local une fois, comme
// pour n'importe quel autre point de départ (gabarit vide, ou déclenché depuis une analyse
// QQOQCCP via qqoqccpId). Jamais republié automatiquement : reste un brouillon normal tant que
// "Créer la procédure" n'a pas été soumis.
function NewProcedureModal({ template, categories, qqoqccpId, initialTitle, initialContent, initialAiGenerated, onClose, onCreated }) {
  const [number, setNumber] = useState('');
  const [title, setTitle] = useState(initialTitle || '');
  const [process, setProcess] = useState('');
  const [nextReviewDate, setNextReviewDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [content, setContent] = useState(initialContent || EMPTY_CONTENT);
  const [aiGenerated, setAiGenerated] = useState(Boolean(initialAiGenerated));
  const [generatingFromQqoqccp, setGeneratingFromQqoqccp] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleAiGenerated(draft) {
    setContent((prev) => ({
      ...prev,
      objet: draft.objet || prev.objet,
      domaine_application: draft.domaine_application || prev.domaine_application,
      responsabilites: draft.responsabilites || prev.responsabilites,
      sections: draft.sections?.length
        ? prev.sections.map((section) => {
            const generated = draft.sections.find((s) => s.key === section.key);
            return generated ? { ...section, content: generated.content, subsections: generated.subsections } : section;
          })
        : prev.sections,
    }));
    setAiGenerated(true);
  }

  // Déclenché automatiquement à l'ouverture quand la procédure naît d'une analyse QQOQCCP
  // (voir QqoqccpDetail.jsx) : préremplit le titre depuis l'analyse elle-même (pas besoin que
  // l'IA en invente un) et le contenu depuis un brouillon informé par le diagnostic complet.
  async function generateFromQqoqccp() {
    setError('');
    setGeneratingFromQqoqccp(true);
    try {
      const { data } = await api.post('/procedures/generate-draft-from-qqoqccp', { qqoqccp_id: qqoqccpId });
      if (data.title) setTitle(data.title);
      handleAiGenerated(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de générer un brouillon depuis cette analyse.');
    } finally {
      setGeneratingFromQqoqccp(false);
    }
  }

  useEffect(() => {
    if (qqoqccpId) generateFromQqoqccp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qqoqccpId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    let finalCategoryId = categoryId || undefined;
    if (isPrivate) {
      try {
        finalCategoryId = await resolvePersonalCategoryId('procedure');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    let procedure;
    try {
      ({ data: procedure } = await api.post('/procedures', {
        number,
        title,
        process: process || undefined,
        next_review_date: nextReviewDate || undefined,
        category_id: finalCategoryId,
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer la procédure.');
      setSubmitting(false);
      return;
    }

    try {
      await api.post(`/procedures/${procedure.id}/versions`, { content, ai_generated: aiGenerated });
    } catch (err) {
      setError(err.response?.data?.error || 'Procédure créée, mais la première version n\'a pas pu être enregistrée.');
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onCreated(procedure);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-2xl sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nouvelle procédure</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Numéro</label>
              <input
                type="text"
                required
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Processus</label>
              <input
                type="text"
                value={process}
                onChange={(e) => setProcess(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Titre</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Prochaine date de révision</label>
            <input
              type="date"
              value={nextReviewDate}
              onChange={(e) => setNextReviewDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <CategoryVisibilityField
            categories={categories}
            categoryId={categoryId}
            onCategoryIdChange={setCategoryId}
            isPrivate={isPrivate}
            onIsPrivateChange={setIsPrivate}
          />

          {qqoqccpId ? (
            <div>
              <button
                type="button"
                onClick={generateFromQqoqccp}
                disabled={generatingFromQqoqccp}
                className="flex items-center gap-2 rounded-md border border-purple-300 px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-50 disabled:opacity-50"
              >
                {generatingFromQqoqccp ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                {generatingFromQqoqccp
                  ? 'Génération depuis l\'analyse en cours...'
                  : aiGenerated
                    ? 'Régénérer depuis l\'analyse QQOQCCP'
                    : 'Générer depuis l\'analyse QQOQCCP'}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <AiProcedureDraft title={title} process={process} onGenerated={handleAiGenerated} />
              <AiFullProcedureDraft title={title} onGenerated={handleAiGenerated} />
            </div>
          )}

          <ProcedureSectionsEditor template={template} content={content} onChange={setContent} />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Création...' : 'Créer la procédure'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Raccourci de création de dossier directement depuis la page Procédures, sans passer par
// Paramètres > Catégories — même modale que Capas.jsx/Documents.jsx, adaptée à
// POST /module-categories (resource_type: 'procedure').
function NewFolderModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#1F3864');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    let data;
    try {
      ({ data } = await api.post('/module-categories', { resource_type: 'procedure', name, color }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer ce dossier.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onCreated(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-sm sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nouveau dossier</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex : Procédures qualité, Procédures RH..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Couleur</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-11 w-16 rounded-md border border-slate-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Création...' : 'Créer le dossier'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Procedures() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const qqoqccpId = searchParams.get('fromQqoqccp');
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const tenant = useTenant();
  const [procedures, setProcedures] = useState([]);
  const [template, setTemplate] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(Boolean(qqoqccpId));
  const [isFullDraftModalOpen, setIsFullDraftModalOpen] = useState(false);
  const [fullDraftSeed, setFullDraftSeed] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [processFilter, setProcessFilter] = useState('');
  const [search, setSearch] = useState('');
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [exportingDrive, setExportingDrive] = useState(false);
  const [driveSuccess, setDriveSuccess] = useState('');
  const [exportError, setExportError] = useState('');
  const [viewMode, setViewMode] = useState('folder');
  const [expandedFolders, setExpandedFolders] = useState(() => new Set());
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [updatingCategoryId, setUpdatingCategoryId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleBulkMoved() {
    setIsBulkMoveModalOpen(false);
    setSelectedIds([]);
    loadProcedures();
  }

  async function handleBulkDelete() {
    if (
      !window.confirm(`Supprimer définitivement ${selectedIds.length} procédure(s) sélectionnée(s) ? Cette action est irréversible.`)
    ) {
      return;
    }
    try {
      await api.delete('/procedures/bulk', { data: { ids: selectedIds } });
      setSelectedIds([]);
      await loadProcedures();
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer ces procédures.');
    }
  }

  function toggleFolder(key) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleFolderCreated(category) {
    setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)));
    setIsNewFolderModalOpen(false);
    setExpandedFolders((prev) => new Set(prev).add(category.id));
  }

  async function handleCategoryChange(event, procedure) {
    event.stopPropagation();
    const categoryId = event.target.value || null;
    setUpdatingCategoryId(procedure.id);
    try {
      const { data } = await api.patch(`/procedures/${procedure.id}/category`, { category_id: categoryId });
      setProcedures((prev) => prev.map((item) => (item.id === procedure.id ? data : item)));
    } catch {
      setError('Impossible de changer le dossier de cette procédure.');
    } finally {
      setUpdatingCategoryId(null);
    }
  }

  async function loadProcedures() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/procedures', {
        params: {
          status: statusFilter || undefined,
          process: processFilter || undefined,
          search: search || undefined,
        },
      });
      setProcedures(data);
    } catch {
      setError('Impossible de charger les procédures.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api
      .get('/procedure-templates')
      .then(({ data }) => setTemplate(data))
      .catch(() => {});
    api
      .get('/module-categories', { params: { resource_type: 'procedure' } })
      .then(({ data }) => setCategories(data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(loadProcedures, 300);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, processFilter, search]);

  // Un dossier par catégorie, plus un dossier "Sans dossier" en dernier pour les procédures non
  // classées — jamais affiché s'il est vide. Même principe que Capas.jsx/Documents.jsx.
  const groupedByFolder = useMemo(() => {
    const byCategory = new Map(categories.map((category) => [category.id, []]));
    const unfiled = [];
    for (const procedure of procedures) {
      if (procedure.category_id && byCategory.has(procedure.category_id)) byCategory.get(procedure.category_id).push(procedure);
      else unfiled.push(procedure);
    }
    const groups = categories
      .map((category) => ({ key: category.id, category, procedures: byCategory.get(category.id) || [] }))
      .filter((group) => group.procedures.length > 0);
    if (unfiled.length > 0) groups.push({ key: 'unfiled', category: null, procedures: unfiled });
    return groups;
  }, [procedures, categories]);

  const isFolderView = viewMode === 'folder';
  const procedureGroups = isFolderView ? groupedByFolder : [{ key: 'all', category: null, procedures }];

  function handleCreated(procedure) {
    setIsModalOpen(false);
    navigate(`/procedures/${procedure.id}`);
  }

  // Efface fromQqoqccp de l'URL à la fermeture (annulée ou créée) : rouvrir "Nouvelle
  // procédure" ensuite ne doit pas redéclencher la génération informée par l'analyse.
  function closeModal() {
    setIsModalOpen(false);
    setFullDraftSeed(null);
    if (qqoqccpId) setSearchParams((prev) => { prev.delete('fromQqoqccp'); return prev; });
  }

  // Relais entre les deux modales : la génération complète (voir NewProcedureFullDraftModal.jsx)
  // se termine, on ferme cette modale et on ouvre directement l'éditeur manuel déjà existant,
  // préempli — jamais de publication automatique, l'utilisateur relit/corrige puis soumet
  // "Créer la procédure" comme n'importe quel autre brouillon.
  function handleFullDraftGenerated(subject, content) {
    setFullDraftSeed({ title: subject, content });
    setIsFullDraftModalOpen(false);
    setIsModalOpen(true);
  }

  // Colonnes communes aux 4 formats — même principe que Capas.jsx : le frontend envoie
  // exactement ce qu'il affiche (donc respecte les filtres actifs de la page), le backend ne
  // relit aucune table métier pour ces exports tabulaires (voir routes/reports.js).
  function buildExportColumns() {
    return [
      { key: 'number', label: 'Numéro' },
      { key: 'title', label: 'Titre' },
      { key: 'status', label: 'Statut' },
      { key: 'current_version', label: 'Version courante' },
      { key: 'validated_at', label: 'Date de validation' },
      { key: 'next_review_date', label: 'Date de prochaine révision' },
      { key: 'author', label: 'Auteur' },
      { key: 'validator', label: 'Validateur' },
    ];
  }

  function buildExportRows() {
    return procedures.map((procedure) => ({
      number: procedure.number,
      title: procedure.title,
      status: STATUS_LABELS[procedure.status] || procedure.status,
      current_version: procedure.current_version?.version || '',
      validated_at: formatDate(procedure.current_version?.validated_at),
      next_review_date: formatDate(procedure.next_review_date),
      author: procedure.current_version?.author?.full_name || '',
      validator: procedure.current_version?.validator?.full_name || '',
    }));
  }

  async function handleExportCsv() {
    setExportingCsv(true);
    setExportError('');
    try {
      await exportTableCsv(
        `procedures-${new Date().toISOString().slice(0, 10)}.csv`,
        'Procédures',
        buildExportColumns(),
        buildExportRows(),
        { generatedBy: currentUser?.full_name, subtitle: `${procedures.length} procédures` }
      );
    } catch {
      setExportError('Impossible de générer le CSV.');
    } finally {
      setExportingCsv(false);
    }
  }

  async function handleExportPdf() {
    setExportingPdf(true);
    setExportError('');
    try {
      await exportToPdf(
        `procedures-${new Date().toISOString().slice(0, 10)}.pdf`,
        'Procédures',
        buildExportColumns(),
        buildExportRows(),
        { subtitle: `${procedures.length} procédures`, generatedBy: currentUser?.full_name }
      );
    } catch {
      setExportError('Impossible de générer le PDF.');
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExportXlsx() {
    setExportingXlsx(true);
    setExportError('');
    try {
      await exportToXlsx(
        `procedures-${new Date().toISOString().slice(0, 10)}.xlsx`,
        'Procédures',
        buildExportColumns(),
        buildExportRows(),
        { subtitle: `${procedures.length} procédures`, generatedBy: currentUser?.full_name }
      );
    } catch {
      setExportError("Impossible de générer le fichier Excel.");
    } finally {
      setExportingXlsx(false);
    }
  }

  async function handleExportWord() {
    setExportingWord(true);
    setExportError('');
    try {
      await exportToWord(
        `procedures-${new Date().toISOString().slice(0, 10)}.docx`,
        'Procédures',
        buildExportColumns(),
        buildExportRows(),
        { subtitle: `${procedures.length} procédures`, generatedBy: currentUser?.full_name }
      );
    } catch {
      setExportError('Impossible de générer le document Word.');
    } finally {
      setExportingWord(false);
    }
  }

  async function handleExportDrive() {
    setExportingDrive(true);
    setExportError('');
    setDriveSuccess('');
    try {
      await exportToDrive('Procédures', 'Procédures', buildExportColumns(), buildExportRows(), {
        subtitle: `${procedures.length} procédures`,
        generatedBy: currentUser?.full_name,
      });
      setDriveSuccess('Enregistré sur le Drive partagé.');
    } catch (err) {
      setExportError(err.response?.data?.error || "Impossible d'enregistrer sur le Drive.");
    } finally {
      setExportingDrive(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Procédures</h1>
        <div className="flex flex-wrap gap-2">
          <ExportMenu
            disabled={procedures.length === 0}
            onExportCsv={handleExportCsv}
            exportingCsv={exportingCsv}
            onExportPdf={handleExportPdf}
            exportingPdf={exportingPdf}
            onExportXlsx={handleExportXlsx}
            exportingXlsx={exportingXlsx}
            onExportWord={handleExportWord}
            exportingWord={exportingWord}
            onExportDrive={tenant?.storage_provider === 'google_drive' ? handleExportDrive : undefined}
            exportingDrive={exportingDrive}
          />
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 sm:flex-none"
          >
            <Plus size={18} />
            Nouvelle procédure
          </button>
          <button
            type="button"
            onClick={() => setIsFullDraftModalOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-purple-300 px-4 py-2.5 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-50 sm:flex-none"
          >
            <FileText size={18} />
            Nouvelle procédure — génération complète
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          type="text"
          placeholder="Rechercher un numéro ou un titre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filtrer par processus..."
          value={processFilter}
          onChange={(e) => setProcessFilter(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setViewMode('folder')}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'folder' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Folder size={16} />
            Par dossier
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'list' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <List size={16} />
            Liste
          </button>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            type="button"
            onClick={() => setIsNewFolderModalOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <FolderPlus size={16} />
            Nouveau dossier
          </button>
        )}
      </div>

      {canManage && (
        <SelectAllToggle ids={procedures.map((procedure) => procedure.id)} selectedIds={selectedIds} onChange={setSelectedIds} />
      )}

      {canManage && (
        <BulkSelectionBar
          count={selectedIds.length}
          onMove={() => setIsBulkMoveModalOpen(true)}
          onDelete={handleBulkDelete}
          onClear={() => setSelectedIds([])}
        />
      )}

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {exportError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{exportError}</p>
      )}
      {driveSuccess && (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{driveSuccess}</p>
      )}

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : procedures.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Aucune procédure pour l'instant.</p>
      ) : (
        <>
          <div className="mt-4 space-y-3 md:hidden">
            {procedureGroups.map((group) => (
              <div key={group.key}>
                {isFolderView && (
                  <button
                    type="button"
                    onClick={() => toggleFolder(group.key)}
                    className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm font-medium text-slate-700"
                  >
                    {expandedFolders.has(group.key) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <Folder size={14} style={group.category?.color ? { color: group.category.color } : undefined} />
                    {group.category ? group.category.name : 'Sans dossier'}
                    <span className="font-normal text-slate-400">({group.procedures.length})</span>
                  </button>
                )}
                {(!isFolderView || expandedFolders.has(group.key)) && (
                  <div className={`space-y-3 ${isFolderView ? 'mt-2' : ''}`}>
                    {group.procedures.map((procedure) => {
                      const overdue = isReviewOverdue(procedure);
                      return (
                        <div
                          key={procedure.id}
                          onClick={() => navigate(`/procedures/${procedure.id}`)}
                          className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm ${
                            overdue ? 'border-red-300' : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2">
                              {canManage && (
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(procedure.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={() => toggleSelect(procedure.id)}
                                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                />
                              )}
                              <div>
                                <p className="font-medium text-slate-900">{procedure.title}</p>
                                <p className="text-sm text-slate-500">
                                  {procedure.number} · {procedure.process || 'Processus non précisé'}
                                </p>
                              </div>
                            </div>
                            <StatusBadge status={procedure.status} />
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <CategoryBadge category={procedure.category} />
                          </div>
                          <p className={`mt-2 flex items-center gap-1 text-sm ${overdue ? 'font-medium text-red-600' : 'text-slate-500'}`}>
                            {overdue && <AlertTriangle size={14} />}
                            Prochaine révision : {formatDate(procedure.next_review_date)}
                          </p>
                          {canManage && (
                            <select
                              value={procedure.category_id || ''}
                              disabled={updatingCategoryId === procedure.id}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleCategoryChange(e, procedure)}
                              className="mt-3 w-full rounded-md border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                            >
                              <option value="">Sans dossier</option>
                              {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {canManage && <th className="w-8 px-4 py-3" />}
                  <th className="px-4 py-3">Numéro</th>
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3">Processus</th>
                  <th className="px-4 py-3">Dossier</th>
                  <th className="px-4 py-3">Version en cours</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Prochaine révision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {procedureGroups.map((group) => (
                  <Fragment key={group.key}>
                    {isFolderView && (
                      <tr className="cursor-pointer bg-slate-50 hover:bg-slate-100" onClick={() => toggleFolder(group.key)}>
                        <td colSpan={canManage ? 8 : 7} className="px-4 py-2.5">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            {expandedFolders.has(group.key) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            <Folder size={14} style={group.category?.color ? { color: group.category.color } : undefined} />
                            {group.category ? group.category.name : 'Sans dossier'}
                            <span className="font-normal text-slate-400">({group.procedures.length})</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {(!isFolderView || expandedFolders.has(group.key)) &&
                      group.procedures.map((procedure) => {
                        const overdue = isReviewOverdue(procedure);
                        return (
                          <tr
                            key={procedure.id}
                            onClick={() => navigate(`/procedures/${procedure.id}`)}
                            className={`cursor-pointer hover:bg-slate-50 ${overdue ? 'bg-red-50/50' : ''}`}
                          >
                            {canManage && (
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(procedure.id)}
                                  onChange={() => toggleSelect(procedure.id)}
                                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                />
                              </td>
                            )}
                            <td className="px-4 py-3 font-medium text-slate-800">{procedure.number}</td>
                            <td className="px-4 py-3 text-slate-700">{procedure.title}</td>
                            <td className="px-4 py-3 text-slate-600">{procedure.process || '—'}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <CategoryBadge category={procedure.category} />
                                {canManage && (
                                  <select
                                    value={procedure.category_id || ''}
                                    disabled={updatingCategoryId === procedure.id}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => handleCategoryChange(e, procedure)}
                                    className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                  >
                                    <option value="">Sans dossier</option>
                                    {categories.map((category) => (
                                      <option key={category.id} value={category.id}>
                                        {category.name}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{procedure.current_version?.version || '—'}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={procedure.status} />
                            </td>
                            <td className={`px-4 py-3 ${overdue ? 'font-medium text-red-600' : 'text-slate-600'}`}>
                              <span className="flex items-center gap-1">
                                {overdue && <AlertTriangle size={14} />}
                                {formatDate(procedure.next_review_date)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isModalOpen && (
        <NewProcedureModal
          template={template}
          categories={categories}
          qqoqccpId={qqoqccpId}
          initialTitle={fullDraftSeed?.title}
          initialContent={fullDraftSeed?.content}
          initialAiGenerated={Boolean(fullDraftSeed)}
          onClose={closeModal}
          onCreated={handleCreated}
        />
      )}
      {isFullDraftModalOpen && (
        <NewProcedureFullDraftModal
          template={template}
          onClose={() => setIsFullDraftModalOpen(false)}
          onGenerated={handleFullDraftGenerated}
        />
      )}

      {isNewFolderModalOpen && (
        <NewFolderModal onClose={() => setIsNewFolderModalOpen(false)} onCreated={handleFolderCreated} />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType="procedure"
          endpoint="/procedures/bulk-category"
          categories={categories}
          selectedIds={selectedIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}
    </div>
  );
}
