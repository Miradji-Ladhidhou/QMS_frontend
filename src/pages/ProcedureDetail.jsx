import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Archive, ArrowLeft, Check, Download, Loader2, Pencil, Plus, Send, Sparkles, Trash2, X, XCircle } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { openBlankTab } from '../lib/openInNewTab.js';
import { postForWordDownload } from '../lib/pdfExport.js';
import StatusBadge from '../components/StatusBadge.jsx';
import ProcedureVersionStatusBadge from '../components/ProcedureVersionStatusBadge.jsx';
import AiProcedureDraft from '../components/AiProcedureDraft.jsx';
import AiFullProcedureDraft from '../components/AiFullProcedureDraft.jsx';
import ProcedureSectionsEditor from '../components/ProcedureSectionsEditor.jsx';
import ProcedureComplianceCheck from '../components/ProcedureComplianceCheck.jsx';
import ProcedureVersionComparison from '../components/ProcedureVersionComparison.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import CapaStatusBadge from '../components/CapaStatusBadge.jsx';
import AuditStatusBadge from '../components/AuditStatusBadge.jsx';
import LinkItemModal from '../components/LinkItemModal.jsx';
import ProcedureAttachment from '../components/ProcedureAttachment.jsx';
import ShareRecordPanel from '../components/ShareRecordPanel.jsx';

const EMPTY_CONTENT = { objet: '', domaine_application: '', responsabilites: '', sections: [], documents_associes: [] };

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fr-FR');
}

// Nouvelle version : même principe que la création de procédure (Procedures.jsx) — un seul
// POST /:id/versions avec le contenu déjà rédigé, il n'existe pas de route pour modifier le
// contenu d'une version existante après coup (seulement submit/validate/reject).
function NewVersionModal({
  procedureId,
  procedureTitle,
  procedureProcess,
  template,
  previousContent,
  rationale,
  onClose,
  onCreated,
}) {
  const [content, setContent] = useState(previousContent || EMPTY_CONTENT);
  const [aiGenerated, setAiGenerated] = useState(false);
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

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post(`/procedures/${procedureId}/versions`, { content, ai_generated: aiGenerated });
      onCreated(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer cette version.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-2xl sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nouvelle version</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        {rationale && (
          <p className="mb-4 rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-800">
            <span className="font-medium">Suggéré depuis le CAPA lié</span> — {rationale}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <AiProcedureDraft title={procedureTitle} process={procedureProcess} onGenerated={handleAiGenerated} />
            <AiFullProcedureDraft title={procedureTitle} onGenerated={handleAiGenerated} />
          </div>
          <ProcedureSectionsEditor template={template} content={content} onChange={setContent} />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Enregistrement...' : 'Enregistrer cette version'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Modifier un brouillon existant : PUT /:id/versions/:versionId, refusé côté backend dès que
// le statut n'est plus "draft" — contrairement à NewVersionModal, préremplit avec le contenu
// PROPRE à cette version (jamais celui d'une autre), et ne crée rien de nouveau.
function EditVersionModal({ procedureId, procedureTitle, procedureProcess, template, version, onClose, onUpdated }) {
  const [content, setContent] = useState(version.content || EMPTY_CONTENT);
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
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.put(`/procedures/${procedureId}/versions/${version.id}`, { content });
      onUpdated(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de modifier ce brouillon.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-2xl sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Modifier le brouillon — v{version.version}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <AiProcedureDraft title={procedureTitle} process={procedureProcess} onGenerated={handleAiGenerated} />
            <AiFullProcedureDraft title={procedureTitle} onGenerated={handleAiGenerated} />
          </div>
          <ProcedureSectionsEditor template={template} content={content} onChange={setContent} />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </form>
      </div>
    </div>
  );
}

function RejectVersionModal({ onClose, onConfirm }) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onConfirm(comment);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible d\'enregistrer le rejet.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Rejeter cette version</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Motif du rejet</label>
            <AutoTextarea
              rows={3}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-red-600 py-3 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {submitting ? 'Envoi...' : 'Confirmer le rejet'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Motif optionnel (contrairement au rejet, la raison n'est pas obligatoire — "remplacée par
// une nouvelle version" se voit déjà dans l'historique) mais toujours demandée explicitement
// avant l'action : rendre une procédure obsolète n'est jamais annulable depuis l'UI.
function ObsoleteProcedureModal({ onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onConfirm(reason);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de marquer cette procédure comme obsolète.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Marquer comme obsolète</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          La procédure ne sera plus proposée comme active, mais reste consultable dans l'historique — elle n'est
          jamais supprimée.
        </p>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Motif (optionnel)</label>
            <AutoTextarea
              rows={3}
              placeholder="Remplacée par la version 2.0, processus supprimé..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-red-600 py-3 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {submitting ? 'Enregistrement...' : 'Confirmer'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ProcedureDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);

  const [procedure, setProcedure] = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [isEditVersionModalOpen, setIsEditVersionModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isObsoleteModalOpen, setIsObsoleteModalOpen] = useState(false);
  const [isLinkCapaModalOpen, setIsLinkCapaModalOpen] = useState(false);
  const [isLinkAuditModalOpen, setIsLinkAuditModalOpen] = useState(false);
  const [linksError, setLinksError] = useState('');
  const [unlinkingId, setUnlinkingId] = useState(null);
  const [acknowledging, setAcknowledging] = useState(false);
  const [acknowledgeError, setAcknowledgeError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actingVersionId, setActingVersionId] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [exportWordError, setExportWordError] = useState('');
  const [generatingSheet, setGeneratingSheet] = useState(false);
  const [sheetError, setSheetError] = useState('');
  const [suggestingRevisionFor, setSuggestingRevisionFor] = useState(null);
  const [suggestedRevisionContent, setSuggestedRevisionContent] = useState(null);
  const [suggestedRevisionRationale, setSuggestedRevisionRationale] = useState('');
  const [exportPdfError, setExportPdfError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function loadProcedure() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/procedures/${id}`);
      setProcedure(data);
    } catch {
      setError('Impossible de charger cette procédure.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProcedure();
    api
      .get('/procedure-templates')
      .then(({ data }) => setTemplate(data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAcknowledge() {
    setAcknowledgeError('');
    setAcknowledging(true);
    try {
      await api.post(`/procedures/${id}/acknowledge`);
      await loadProcedure();
    } catch (err) {
      setAcknowledgeError(err.response?.data?.error || "Impossible d'enregistrer l'accusé de lecture.");
    } finally {
      setAcknowledging(false);
    }
  }

  function handleVersionCreated() {
    setIsNewVersionModalOpen(false);
    setSuggestedRevisionContent(null);
    setSuggestedRevisionRationale('');
    loadProcedure();
  }

  function closeNewVersionModal() {
    setIsNewVersionModalOpen(false);
    setSuggestedRevisionContent(null);
    setSuggestedRevisionRationale('');
  }

  function handleVersionUpdated() {
    setIsEditVersionModalOpen(false);
    loadProcedure();
  }

  async function handleSubmit(versionId) {
    setActionError('');
    setActingVersionId(versionId);
    try {
      await api.post(`/procedures/${id}/versions/${versionId}/submit`);
      await loadProcedure();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Impossible de soumettre cette version.');
    } finally {
      setActingVersionId(null);
    }
  }

  async function handleValidate(versionId) {
    setActionError('');
    setActingVersionId(versionId);
    try {
      await api.post(`/procedures/${id}/versions/${versionId}/validate`);
      await loadProcedure();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Impossible de valider cette version.');
    } finally {
      setActingVersionId(null);
    }
  }

  async function handleReject(versionId, comment) {
    await api.post(`/procedures/${id}/versions/${versionId}/reject`, { comment });
    setIsRejectModalOpen(false);
    await loadProcedure();
  }

  async function handleObsolete(reason) {
    await api.post(`/procedures/${id}/obsolete`, { reason: reason || undefined });
    setIsObsoleteModalOpen(false);
    await loadProcedure();
  }

  async function handleExportPdf() {
    const tab = openBlankTab();
    setExportPdfError('');
    setExportingPdf(true);
    try {
      const response = await api.get(`/procedures/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      if (tab) tab.location.href = url;
    } catch {
      tab?.close();
      setExportPdfError("Impossible d'exporter cette procédure en PDF.");
    } finally {
      setExportingPdf(false);
    }
  }

  // Même repli que le backend pour choisir la version à exporter en l'absence de version
  // courante (voir routes/procedures.js#/:id/pdf) : la plus récente, quel que soit son statut —
  // contrairement à la fiche de diffusion, l'export Word est justement pensé pour un brouillon
  // "presque prêt", pas seulement une version déjà approuvée.
  async function handleExportWord() {
    const versionToExport = currentVersion || versions[0];
    if (!versionToExport) return;
    setExportWordError('');
    setExportingWord(true);
    try {
      await postForWordDownload(
        `/procedures/${id}/versions/${versionToExport.id}/export-word`,
        {},
        `${procedure.number}.docx`
      );
    } catch {
      setExportWordError('Impossible d\'exporter cette procédure en Word.');
    } finally {
      setExportingWord(false);
    }
  }

  async function handleGenerateDistributionSheet() {
    setSheetError('');
    setGeneratingSheet(true);
    try {
      await api.post(`/procedures/${id}/versions/${currentVersion.id}/distribution-sheet`, {});
      await loadProcedure();
    } catch (err) {
      setSheetError(err.response?.data?.error || 'Impossible de générer la fiche de diffusion.');
    } finally {
      setGeneratingSheet(false);
    }
  }

  // Fusionne les sections suggérées par l'IA (voir suggest-revision-from-capa) dans le
  // contenu de la version en vigueur — mêmes clés que la fusion d'un brouillon IA
  // (handleAiGenerated), mais la source est ici une CAPA liée plutôt qu'une génération libre.
  function applySuggestedChanges(baseContent, suggestedChanges) {
    const base = baseContent || EMPTY_CONTENT;
    const sections = (base.sections || []).map((section) => {
      const change = suggestedChanges.find((c) => c.section_key === section.key);
      return change ? { ...section, content: change.suggested_content } : section;
    });
    return { ...base, sections };
  }

  async function handleSuggestRevision(capaId) {
    setLinksError('');
    setSuggestingRevisionFor(capaId);
    try {
      const { data } = await api.post(`/procedures/${id}/suggest-revision-from-capa`, { capa_id: capaId });
      setSuggestedRevisionContent(applySuggestedChanges(currentVersion?.content, data.suggested_changes || []));
      setSuggestedRevisionRationale(data.rationale || '');
      setIsNewVersionModalOpen(true);
    } catch (err) {
      setLinksError(err.response?.data?.error || 'Impossible de générer une suggestion de révision.');
    } finally {
      setSuggestingRevisionFor(null);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer définitivement la procédure "${procedure.title}" ? Cette action est irréversible.`)) return;

    setDeleteError('');
    setDeleting(true);
    try {
      await api.delete(`/procedures/${id}`);
      navigate('/procedures');
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Impossible de supprimer cette procédure.');
      setDeleting(false);
    }
  }

  async function handleLinkCapa(capa) {
    await api.post(`/procedures/${id}/link-capa`, { capa_id: capa.id });
    setIsLinkCapaModalOpen(false);
    await loadProcedure();
  }

  async function handleUnlinkCapa(capaId) {
    setLinksError('');
    setUnlinkingId(capaId);
    try {
      await api.delete(`/procedures/${id}/link-capa/${capaId}`);
      await loadProcedure();
    } catch (err) {
      setLinksError(err.response?.data?.error || 'Impossible de retirer ce lien.');
    } finally {
      setUnlinkingId(null);
    }
  }

  async function handleLinkAudit(auditItem) {
    await api.post(`/procedures/${id}/link-audit`, { audit_id: auditItem.id });
    setIsLinkAuditModalOpen(false);
    await loadProcedure();
  }

  async function handleUnlinkAudit(auditId) {
    setLinksError('');
    setUnlinkingId(auditId);
    try {
      await api.delete(`/procedures/${id}/link-audit/${auditId}`);
      await loadProcedure();
    } catch (err) {
      setLinksError(err.response?.data?.error || 'Impossible de retirer ce lien.');
    } finally {
      setUnlinkingId(null);
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  if (error || !procedure) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
        {error || 'Procédure introuvable.'}
      </p>
    );
  }

  const versions = procedure.versions || [];
  const linkedCapas = procedure.linked_capas || [];
  const linkedAudits = procedure.linked_audits || [];
  const draftVersion = versions.find((v) => v.status === 'draft');
  const pendingVersion = versions.find((v) => v.status === 'pending');
  const currentVersion = versions.find((v) => v.id === procedure.current_version_id);
  // versions est trié plus récent d'abord (voir GET /:id) : le premier "rejected" trouvé est
  // donc la dernière version rejetée. Repartir de son contenu — plutôt que de la version
  // approuvée — pour que "Nouvelle version" reprenne le travail déjà fait, pas seulement le
  // motif du rejet déjà affiché dans l'historique.
  const lastRejectedVersion = versions.find((v) => v.status === 'rejected');
  // Suppression réelle réservée aux procédures jamais soumises (voir DELETE /:id côté
  // backend) — auteur ou admin uniquement, jamais manager : contrairement à
  // valider/rejeter/obsolète, ce n'est pas une décision qualité mais une correction d'erreur
  // de saisie.
  const canDelete =
    currentUser &&
    (currentUser.role === 'admin' || procedure.created_by === currentUser.id) &&
    versions.every((v) => v.status === 'draft');
  const canActOnDraft = draftVersion && currentUser && (canManage || draftVersion.author_id === currentUser.id);

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/procedures')}
        className="mb-4 flex items-center gap-2 text-sm text-slate-600 hover:text-primary"
      >
        <ArrowLeft size={16} />
        Retour aux procédures
      </button>

      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{procedure.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {procedure.number} · {procedure.process || 'Processus non précisé'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={procedure.status} />
              <span className="text-sm text-slate-500">Prochaine révision : {formatDate(procedure.next_review_date)}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {exportingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Exporter PDF
            </button>
            <button
              type="button"
              onClick={handleExportWord}
              disabled={exportingWord || !(currentVersion || versions[0])}
              className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {exportingWord ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Exporter Word
            </button>
            {!draftVersion && procedure.status !== 'obsolete' && (
              <button
                type="button"
                onClick={() => setIsNewVersionModalOpen(true)}
                className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                <Plus size={16} />
                Nouvelle version
              </button>
            )}
            {canManage && procedure.status !== 'obsolete' && (
              <button
                type="button"
                onClick={() => setIsObsoleteModalOpen(true)}
                className="flex items-center gap-2 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                <Archive size={16} />
                Marquer comme obsolète
              </button>
            )}
            {canManage && <ShareRecordPanel resourceType="procedure" resourceId={procedure.id} />}
            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 size={16} />
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            )}
          </div>
        </div>

        {procedure.status === 'obsolete' && (
          <div className="mt-4 rounded-md border border-slate-300 bg-slate-50 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Archive size={16} />
              Procédure obsolète depuis le {formatDateTime(procedure.obsoleted_at)}
              {procedure.obsoleted_by_user?.full_name && ` (par ${procedure.obsoleted_by_user.full_name})`}
            </p>
            {procedure.obsolete_reason && <p className="mt-1 text-sm text-slate-600">Motif : {procedure.obsolete_reason}</p>}
          </div>
        )}

        {procedure.current_version_id && (
          <div className="mt-4 rounded-md border border-sky-200 bg-sky-50 p-4">
            {/* Fiche de diffusion en priorité, quand elle existe : c'est exactement son rôle
                — un résumé condensé pour quelqu'un qui doit connaître la procédure sans
                nécessairement la lire en entier, voir generateProcedureDistributionSheet. */}
            {currentVersion?.distribution_sheet ? (
              <div className="mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Fiche de diffusion</p>
                <p className="mt-1 text-sm text-sky-900">{currentVersion.distribution_sheet.summary}</p>
                {currentVersion.distribution_sheet.key_points?.length > 0 && (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-sky-800">
                    {currentVersion.distribution_sheet.key_points.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              canManage && (
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={handleGenerateDistributionSheet}
                    disabled={generatingSheet}
                    className="text-sm font-medium text-sky-700 hover:text-sky-900 disabled:opacity-60"
                  >
                    {generatingSheet ? 'Génération...' : 'Générer une fiche de diffusion avec l\'IA'}
                  </button>
                  {sheetError && <p className="mt-1 text-sm text-red-600">{sheetError}</p>}
                </div>
              )
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {procedure.my_acknowledgment ? (
                <p className="text-sm text-sky-800">
                  Lu et accusé réception le {formatDateTime(procedure.my_acknowledgment.acknowledged_at)}.
                </p>
              ) : (
                <>
                  <p className="text-sm text-sky-800">Merci de confirmer avoir lu la version en vigueur de cette procédure.</p>
                  <button
                    type="button"
                    onClick={handleAcknowledge}
                    disabled={acknowledging}
                    className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    <Check size={16} />
                    {acknowledging ? 'Enregistrement...' : "J'ai lu et compris"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        {acknowledgeError && (
          <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{acknowledgeError}</p>
        )}
        {exportPdfError && (
          <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{exportPdfError}</p>
        )}
        {exportWordError && (
          <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{exportWordError}</p>
        )}
        {deleteError && (
          <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{deleteError}</p>
        )}
        {actionError && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{actionError}</p>
        )}
      </div>

      {currentVersion && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-slate-900">Version en vigueur — v{currentVersion.version}</h2>
          {currentVersion.attachment_file_name && (
            <div className="mt-3">
              <ProcedureAttachment procedureId={procedure.id} version={currentVersion} editable={false} />
            </div>
          )}
          <div className="mt-3 space-y-3 text-sm text-slate-700">
            {currentVersion.content?.objet && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Objet</p>
                <p className="mt-0.5 whitespace-pre-wrap">{currentVersion.content.objet}</p>
              </div>
            )}
            {currentVersion.content?.domaine_application && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Domaine d'application</p>
                <p className="mt-0.5 whitespace-pre-wrap">{currentVersion.content.domaine_application}</p>
              </div>
            )}
            {currentVersion.content?.responsabilites && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Responsabilités</p>
                <p className="mt-0.5 whitespace-pre-wrap">{currentVersion.content.responsabilites}</p>
              </div>
            )}
            {(currentVersion.content?.sections || []).map((section) => (
              <div key={section.key}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{section.label}</p>
                <p className="mt-0.5 whitespace-pre-wrap">{section.content}</p>
              </div>
            ))}
            {currentVersion.content?.documents_associes?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documents associés</p>
                <ul className="mt-0.5 list-disc space-y-0.5 pl-5">
                  {currentVersion.content.documents_associes.map((doc, i) => (
                    <li key={i}>{doc}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {draftVersion && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Brouillon en cours — v{draftVersion.version}</h2>
            <ProcedureVersionStatusBadge status={draftVersion.status} />
          </div>

          <div className="mt-3">
            <ProcedureComplianceCheck procedureId={procedure.id} versionId={draftVersion.id} />
          </div>

          <div className="mt-3">
            <ProcedureAttachment
              procedureId={procedure.id}
              version={draftVersion}
              editable={canActOnDraft}
              onChanged={loadProcedure}
            />
          </div>

          {canActOnDraft && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsEditVersionModalOpen(true)}
                className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Pencil size={16} />
                Modifier
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(draftVersion.id)}
                disabled={actingVersionId === draftVersion.id}
                className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                <Send size={16} />
                {actingVersionId === draftVersion.id ? 'Envoi...' : 'Soumettre pour validation'}
              </button>
            </div>
          )}
        </div>
      )}

      {pendingVersion && canManage && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Validation requise — v{pendingVersion.version}</h2>
            <ProcedureVersionStatusBadge status={pendingVersion.status} />
          </div>

          <div className="mt-3">
            <ProcedureVersionComparison procedureId={procedure.id} versionId={pendingVersion.id} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleValidate(pendingVersion.id)}
              disabled={actingVersionId === pendingVersion.id}
              className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              <Check size={16} />
              Approuver
            </button>
            <button
              type="button"
              onClick={() => setIsRejectModalOpen(true)}
              disabled={actingVersionId === pendingVersion.id}
              className="flex items-center gap-2 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              <X size={16} />
              Rejeter
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900">Historique des versions</h2>
        {versions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Aucune version pour l'instant.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {versions.map((version) => (
              <li key={version.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <span className="font-medium text-slate-800">v{version.version}</span>
                  <span className="ml-2 text-slate-500">
                    {version.author?.full_name || 'Auteur inconnu'} · {formatDate(version.created_at)}
                  </span>
                  {version.validator?.full_name && (
                    <span className="ml-2 text-slate-400">
                      · {version.status === 'rejected' ? 'Rejetée' : 'Validée'} par {version.validator.full_name}
                    </span>
                  )}
                  {version.comment && <p className="mt-0.5 text-xs text-red-600">Motif : {version.comment}</p>}
                </div>
                <ProcedureVersionStatusBadge status={version.status} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {linksError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{linksError}</p>
      )}

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">CAPA liés</h2>
          <button
            type="button"
            onClick={() => setIsLinkCapaModalOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-700"
          >
            <Plus size={14} />
            Rattacher un CAPA
          </button>
        </div>

        {linkedCapas.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Aucun CAPA rattaché pour l'instant.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {linkedCapas.map((capa) => (
              <li key={capa.id} className="flex items-center justify-between gap-2 py-2.5">
                <Link to={`/capas/${capa.id}`} className="flex items-center gap-2 text-sm hover:text-primary">
                  <span className="font-medium text-slate-800">{capa.number}</span>
                  <span className="text-slate-600">{capa.title}</span>
                  <CapaStatusBadge status={capa.status} />
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  {!draftVersion && procedure.status !== 'obsolete' && (
                    <button
                      type="button"
                      onClick={() => handleSuggestRevision(capa.id)}
                      disabled={suggestingRevisionFor === capa.id}
                      aria-label="Suggérer une révision depuis ce CAPA"
                      title="Suggérer une révision depuis ce CAPA"
                      className="rounded-md p-1.5 text-purple-500 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-50"
                    >
                      {suggestingRevisionFor === capa.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Sparkles size={16} />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleUnlinkCapa(capa.id)}
                    disabled={unlinkingId === capa.id}
                    aria-label="Retirer ce lien"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-50"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Audits liés</h2>
          <button
            type="button"
            onClick={() => setIsLinkAuditModalOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-700"
          >
            <Plus size={14} />
            Rattacher un audit
          </button>
        </div>

        {linkedAudits.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Aucun audit rattaché pour l'instant.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {linkedAudits.map((auditItem) => (
              <li key={auditItem.id} className="flex items-center justify-between gap-2 py-2.5">
                <Link to={`/audits/${auditItem.id}`} className="flex items-center gap-2 text-sm hover:text-primary">
                  <span className="font-medium text-slate-800">{auditItem.title}</span>
                  <AuditStatusBadge status={auditItem.status} />
                </Link>
                <button
                  type="button"
                  onClick={() => handleUnlinkAudit(auditItem.id)}
                  disabled={unlinkingId === auditItem.id}
                  aria-label="Retirer ce lien"
                  className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-50"
                >
                  <XCircle size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isNewVersionModalOpen && (
        <NewVersionModal
          procedureId={procedure.id}
          procedureTitle={procedure.title}
          procedureProcess={procedure.process}
          template={template}
          previousContent={suggestedRevisionContent ?? lastRejectedVersion?.content ?? currentVersion?.content}
          rationale={suggestedRevisionRationale}
          onClose={closeNewVersionModal}
          onCreated={handleVersionCreated}
        />
      )}

      {isEditVersionModalOpen && draftVersion && (
        <EditVersionModal
          procedureId={procedure.id}
          procedureTitle={procedure.title}
          procedureProcess={procedure.process}
          template={template}
          version={draftVersion}
          onClose={() => setIsEditVersionModalOpen(false)}
          onUpdated={handleVersionUpdated}
        />
      )}

      {isRejectModalOpen && pendingVersion && (
        <RejectVersionModal
          onClose={() => setIsRejectModalOpen(false)}
          onConfirm={(comment) => handleReject(pendingVersion.id, comment)}
        />
      )}

      {isObsoleteModalOpen && (
        <ObsoleteProcedureModal onClose={() => setIsObsoleteModalOpen(false)} onConfirm={handleObsolete} />
      )}

      {isLinkCapaModalOpen && (
        <LinkItemModal
          title="Rattacher un CAPA"
          fetchUrl="/capas"
          excludeIds={linkedCapas.map((capa) => capa.id)}
          getSearchText={(capa) => `${capa.number} ${capa.title}`}
          renderItem={(capa) => (
            <span className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 font-medium text-slate-800">{capa.number}</span>
              <span className="truncate text-slate-600">{capa.title}</span>
            </span>
          )}
          onClose={() => setIsLinkCapaModalOpen(false)}
          onSelect={handleLinkCapa}
        />
      )}

      {isLinkAuditModalOpen && (
        <LinkItemModal
          title="Rattacher un audit"
          fetchUrl="/audits"
          excludeIds={linkedAudits.map((auditItem) => auditItem.id)}
          getSearchText={(auditItem) => auditItem.title}
          renderItem={(auditItem) => <span className="truncate text-slate-800">{auditItem.title}</span>}
          onClose={() => setIsLinkAuditModalOpen(false)}
          onSelect={handleLinkAudit}
        />
      )}
    </div>
  );
}
