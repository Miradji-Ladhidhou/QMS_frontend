import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Lock,
  Pencil,
  Send,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useTenant } from '../lib/useTenant.js';
import StatusBadge from '../components/StatusBadge.jsx';
import CategoryBadge from '../components/CategoryBadge.jsx';
import ApprovalStatusBadge from '../components/ApprovalStatusBadge.jsx';
import DecisionModal from '../components/DecisionModal.jsx';
import SubmitForApprovalModal from '../components/SubmitForApprovalModal.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import UploadErrorMessage from '../components/UploadErrorMessage.jsx';
import ShareRecordPanel from '../components/ShareRecordPanel.jsx';
import { openBlankTab } from '../lib/openInNewTab.js';

const AUDIT_ACTION_LABELS = {
  submitted_for_approval: 'Soumis pour approbation',
  approval_decided_approved: 'Approbation validée',
  approval_decided_rejected: 'Approbation rejetée',
  downloaded: 'Téléchargé',
  status_changed_manually: 'Statut modifié manuellement',
  certificate_generated: 'Certificat généré',
  metadata_edited_manually: 'Informations administratives modifiées manuellement',
  created_via_import: 'Créé par import en masse',
};

// yyyy-mm-ddThh:mm:ss... -> yyyy-mm-dd, pour un <input type="date">.
function toDateInputValue(dateStr) {
  return dateStr ? dateStr.slice(0, 10) : '';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fr-FR');
}

function NewVersionModal({ documentId, onClose, onUploaded, isFirstUpload }) {
  const [file, setFile] = useState(null);
  const [changeNote, setChangeNote] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      setError({ message: 'Un fichier est requis.' });
      return;
    }

    setError(null);
    setSubmitting(true);

    const formData = new FormData();
    formData.append('file', file);
    if (changeNote) formData.append('change_note', changeNote);

    // onUploaded() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le handler du parent ne doit pas se faire passer pour un échec d'upload.
    let data;
    try {
      ({ data } = await api.post(`/documents/${documentId}/versions`, formData));
    } catch (err) {
      setError({ message: err.response?.data?.error || "Impossible d'ajouter la version.", code: err.response?.data?.code });
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onUploaded(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{isFirstUpload ? 'Ajouter un document' : 'Nouvelle version'}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <UploadErrorMessage error={error} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fichier</label>
            <input
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Commentaire (optionnel)</label>
            <AutoTextarea
              rows={3}
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Envoi...' : isFirstUpload ? 'Ajouter le document' : 'Ajouter la version'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Réservé à l'administration documentaire : version, date de création, révision — jamais
// titre/numéro/description/fichier, gérés par leurs propres flux (nouvelle version, statut).
function EditMetadataModal({ doc, onClose, onUpdated }) {
  const [version, setVersion] = useState(doc.version);
  const [createdAt, setCreatedAt] = useState(toDateInputValue(doc.created_at));
  const [reviewDate, setReviewDate] = useState(toDateInputValue(doc.review_date));
  const [reviewFrequencyMonths, setReviewFrequencyMonths] = useState(doc.review_frequency_months || '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    // onUpdated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence.
    let data;
    try {
      ({ data } = await api.patch(`/documents/${doc.id}/metadata`, {
        version,
        created_at: createdAt ? new Date(`${createdAt}T00:00:00`).toISOString() : undefined,
        review_date: reviewDate || null,
        review_frequency_months: reviewFrequencyMonths || null,
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de modifier ces informations.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onUpdated(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Informations administratives</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Version</label>
            <input
              type="text"
              required
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date de création</label>
            <input
              type="date"
              required
              value={createdAt}
              onChange={(e) => setCreatedAt(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Prochaine révision</label>
              <input
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Fréquence (mois)</label>
              <input
                type="number"
                min="1"
                placeholder="Défaut du tenant"
                value={reviewFrequencyMonths}
                onChange={(e) => setReviewFrequencyMonths(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            La fréquence propre à ce document remplace le défaut du tenant, et sert à recalculer la prochaine révision
            à chaque nouvelle version.
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tenant = useTenant();
  const [doc, setDoc] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMetadataModalOpen, setIsEditMetadataModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [decisionModal, setDecisionModal] = useState(null);
  const [certificateError, setCertificateError] = useState('');
  const [restrictedAccess, setRestrictedAccess] = useState(null);
  const [showRestrictedList, setShowRestrictedList] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [downloadingKey, setDownloadingKey] = useState(null);

  async function loadDocument() {
    setLoading(true);
    setError('');
    try {
      const [{ data }, { data: logData }] = await Promise.all([
        api.get(`/documents/${id}`),
        api.get(`/documents/${id}/audit-log`),
      ]);
      setDoc(data);
      setAuditLog(logData);
    } catch {
      setError('Impossible de charger ce document.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocument();
    api
      .get('/users/me')
      .then(({ data }) => setCurrentUser(data))
      .catch(() => {});
    api
      .get('/users')
      .then(({ data }) => setUsers(data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Liste des personnes/groupes autorisés sur la catégorie restreinte de ce document.
  // Réservée aux admins et à ceux ayant can_edit côté backend (403 pour les autres) —
  // on échoue silencieusement, sans message d'erreur, si l'utilisateur n'y a pas droit.
  useEffect(() => {
    if (!doc?.category?.is_restricted) {
      setRestrictedAccess(null);
      return;
    }

    api
      .get(`/categories/${doc.category_id}/permissions`)
      .then(({ data }) => setRestrictedAccess(data))
      .catch(() => setRestrictedAccess(null));
  }, [doc?.category_id, doc?.category?.is_restricted]);

  function handleUploaded() {
    setIsModalOpen(false);
    loadDocument();
  }

  function handleMetadataUpdated() {
    setIsEditMetadataModalOpen(false);
    loadDocument();
  }

  function handleSubmittedForApproval() {
    setIsSubmitModalOpen(false);
    loadDocument();
  }

  function handleDecided() {
    setDecisionModal(null);
    loadDocument();
  }

  // Le lien de téléchargement ne peut plus être construit directement côté frontend depuis
  // file_path (voir getDocumentPublicUrl, encore utilisé pour le logo tenant) : depuis B3, ce
  // champ peut être un chemin Supabase OU un id de fichier Google Drive selon le provider du
  // document — seul le backend sait lequel et sait construire l'URL correspondante (bug réel :
  // "Bucket not found" quand un id Drive était passé tel quel à getPublicUrl).
  async function handleDownload(path, key) {
    const tab = openBlankTab();
    setDownloadError('');
    setDownloadingKey(key);
    try {
      const { data } = await api.get(path);
      if (tab) tab.location.href = data.url;
    } catch (err) {
      tab?.close();
      setDownloadError(err.response?.data?.error || 'Impossible de télécharger ce fichier.');
    } finally {
      setDownloadingKey(null);
    }
  }

  async function handleViewCertificate() {
    const tab = openBlankTab();
    setCertificateError('');
    try {
      const response = await api.get(`/documents/${doc.id}/certificate`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      if (tab) tab.location.href = url;
    } catch {
      tab?.close();
      setCertificateError('Impossible de générer le certificat.');
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer définitivement le document "${doc.title}" ? Cette action est irréversible.`)) return;

    setDeleteError('');
    setDeleting(true);

    try {
      await api.delete(`/documents/${doc.id}`);
      navigate('/documents');
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Impossible de supprimer ce document.');
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  if (error || !doc) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
        {error || 'Document introuvable.'}
      </p>
    );
  }

  const myPendingApproval =
    doc.workflow?.status === 'pending' && currentUser
      ? doc.workflow.approvals.find((approval) => approval.approver_id === currentUser.id && approval.decision === 'pending')
      : null;

  const isSigned = doc.status === 'approved' && doc.workflow?.status === 'approved';
  const canSubmitForApproval = doc.status === 'draft' && currentUser && doc.created_by === currentUser.id;
  const otherUsers = users.filter((user) => user.id !== currentUser?.id);
  const canManage = isManagerRole(currentUser?.role);

  // Un document sans fréquence propre suit le défaut du tenant (voir Paramètres > Documents) —
  // le libellé doit refléter laquelle des deux s'applique, jamais dire "spécifique à ce
  // document" pour un réglage qui vient en réalité du défaut global.
  const usesOwnFrequency = Boolean(doc.review_frequency_months);
  const effectiveReviewFrequency = doc.review_frequency_months || tenant?.document_review_frequency_months || null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/documents')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary"
        >
          <ArrowLeft size={16} />
          Retour aux documents
        </button>

        {canManage && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            <Trash2 size={16} />
            {deleting ? 'Suppression...' : 'Supprimer'}
          </button>
        )}
      </div>

      {deleteError && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{deleteError}</p>
      )}
      {downloadError && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{downloadError}</p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{doc.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {doc.number} · v{doc.version}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <CategoryBadge category={doc.category} />
              <StatusBadge status={doc.status} />
              {doc.category?.is_restricted && (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <Lock size={12} />
                  Accès restreint
                </span>
              )}
              {isSigned && (
                <button
                  type="button"
                  onClick={handleViewCertificate}
                  className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                >
                  <BadgeCheck size={14} />
                  Signé électroniquement
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {doc.file_path && (
              <button
                type="button"
                onClick={() => handleDownload(`/documents/${doc.id}/download`, 'current')}
                disabled={downloadingKey === 'current'}
                className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <Download size={16} />
                {downloadingKey === 'current' ? 'Préparation...' : 'Télécharger'}
              </button>
            )}
            {canSubmitForApproval && (
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="flex items-center gap-2 rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary-50"
              >
                <Send size={16} />
                Soumettre pour approbation
              </button>
            )}
            {doc.can_edit && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                <Upload size={16} />
                {doc.file_path ? 'Nouvelle version' : 'Ajouter un document'}
              </button>
            )}
            {canManage && (
              <button
                type="button"
                onClick={() => setIsEditMetadataModalOpen(true)}
                aria-label="Modifier les informations administratives"
                title="Version, date de création, révision"
                className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Pencil size={16} />
                Modifier
              </button>
            )}
            {canManage && <ShareRecordPanel resourceType="document" resourceId={doc.id} />}
          </div>
        </div>

        {doc.description && <p className="mt-4 text-sm text-slate-600">{doc.description}</p>}

        <p className="mt-4 text-sm text-slate-500">
          Créé le {formatDate(doc.created_at)}
          {doc.review_date && ` · Prochaine révision : ${formatDate(doc.review_date)}`}
          {effectiveReviewFrequency &&
            ` (tous les ${effectiveReviewFrequency} mois, ${usesOwnFrequency ? 'spécifique à ce document' : 'réglage par défaut'})`}
        </p>

        {restrictedAccess && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
            <button
              type="button"
              onClick={() => setShowRestrictedList((prev) => !prev)}
              className="flex w-full items-center justify-between gap-2 text-sm font-medium text-amber-800"
            >
              <span>Personnes et groupes autorisés ({restrictedAccess.length})</span>
              {showRestrictedList ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showRestrictedList && (
              <ul className="mt-2 space-y-1">
                {restrictedAccess.length === 0 ? (
                  <li className="text-sm text-amber-700">Aucun accès accordé pour l'instant.</li>
                ) : (
                  restrictedAccess.map((permission) => (
                    <li key={permission.id} className="text-sm text-amber-700">
                      {permission.subject?.full_name || permission.subject?.name || 'Sujet supprimé'}
                      <span className="ml-1 text-xs text-amber-600">
                        ({permission.subject_type === 'user' ? 'utilisateur' : 'groupe'})
                      </span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        )}

        {certificateError && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {certificateError}
          </p>
        )}

        {myPendingApproval && (
          <div className="mt-4 flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-amber-800">Votre approbation est requise sur ce document.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDecisionModal('rejected')}
                className="flex items-center gap-2 rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                <XCircle size={16} />
                Rejeter
              </button>
              <button
                type="button"
                onClick={() => setDecisionModal('approved')}
                className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                <Check size={16} />
                Approuver
              </button>
            </div>
          </div>
        )}

        {doc.workflow && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Approbateurs ({doc.workflow.status === 'pending' ? 'en cours' : doc.workflow.status})
            </p>
            <ul className="space-y-1.5">
              {doc.workflow.approvals.map((approval) => (
                <li key={approval.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{approval.approver?.full_name || 'Utilisateur supprimé'}</span>
                  <ApprovalStatusBadge decision={approval.decision} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Détails
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Historique
        </button>
      </div>

      {activeTab === 'details' ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900 sm:text-base">Historique des versions</h2>

          {doc.versions.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune version archivée pour l'instant.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {doc.versions.map((version) => (
                <li key={version.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      v{version.version}
                      {version.changed_by_user?.full_name ? ` · ${version.changed_by_user.full_name}` : ''}
                    </p>
                    <p className="text-xs text-slate-500">{formatDateTime(version.created_at)}</p>
                    {version.change_note && <p className="mt-1 text-sm text-slate-600">{version.change_note}</p>}
                  </div>
                  {version.file_path && (
                    <button
                      type="button"
                      onClick={() => handleDownload(`/documents/${doc.id}/versions/${version.id}/download`, version.id)}
                      disabled={downloadingKey === version.id}
                      className="flex shrink-0 items-center gap-2 self-start rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:self-auto"
                    >
                      <Download size={14} />
                      {downloadingKey === version.id ? 'Préparation...' : 'Télécharger'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900 sm:text-base">Journal d'audit</h2>

          {auditLog.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun évènement enregistré pour l'instant.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {auditLog.map((entry) => (
                <li key={entry.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-800">
                      {AUDIT_ACTION_LABELS[entry.action] || entry.action}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">{formatDateTime(entry.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-500">{entry.user?.full_name || 'Système'}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isModalOpen && (
        <NewVersionModal
          documentId={doc.id}
          onClose={() => setIsModalOpen(false)}
          onUploaded={handleUploaded}
          isFirstUpload={!doc.file_path}
        />
      )}

      {isEditMetadataModalOpen && (
        <EditMetadataModal doc={doc} onClose={() => setIsEditMetadataModalOpen(false)} onUpdated={handleMetadataUpdated} />
      )}

      {isSubmitModalOpen && (
        <SubmitForApprovalModal
          documentId={doc.id}
          users={otherUsers}
          onClose={() => setIsSubmitModalOpen(false)}
          onSubmitted={handleSubmittedForApproval}
        />
      )}

      {decisionModal && (
        <DecisionModal
          workflowId={doc.workflow.id}
          decision={decisionModal}
          onClose={() => setDecisionModal(null)}
          onDecided={handleDecided}
        />
      )}
    </div>
  );
}
