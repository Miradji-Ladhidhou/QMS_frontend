import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Check, Download, Upload, X, XCircle } from 'lucide-react';
import { api } from '../lib/api.js';
import { getDocumentPublicUrl } from '../lib/storage.js';
import StatusBadge from '../components/StatusBadge.jsx';
import CategoryBadge from '../components/CategoryBadge.jsx';
import DecisionModal from '../components/DecisionModal.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fr-FR');
}

function NewVersionModal({ documentId, onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [changeNote, setChangeNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      setError('Un fichier est requis.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (changeNote) formData.append('change_note', changeNote);

      const { data } = await api.post(`/documents/${documentId}/versions`, formData);
      onUploaded(data);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'ajouter la version.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nouvelle version</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

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
            <textarea
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
            {submitting ? 'Envoi...' : 'Ajouter la version'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [decisionModal, setDecisionModal] = useState(null);
  const [certificateError, setCertificateError] = useState('');

  async function loadDocument() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/documents/${id}`);
      setDoc(data);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleUploaded() {
    setIsModalOpen(false);
    loadDocument();
  }

  function handleDecided() {
    setDecisionModal(null);
    loadDocument();
  }

  async function handleViewCertificate() {
    setCertificateError('');
    try {
      const response = await api.get(`/documents/${doc.id}/certificate`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank', 'noopener');
    } catch {
      setCertificateError('Impossible de générer le certificat.');
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

  const currentFileUrl = getDocumentPublicUrl(doc.file_path);

  const myPendingApproval =
    doc.workflow?.status === 'pending' && currentUser
      ? doc.workflow.approvals.find((approval) => approval.approver_id === currentUser.id && approval.decision === 'pending')
      : null;

  const isSigned = doc.status === 'approved' && doc.workflow?.status === 'approved';

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/documents')}
        className="mb-4 flex items-center gap-2 text-sm text-slate-600 hover:text-primary"
      >
        <ArrowLeft size={16} />
        Retour aux documents
      </button>

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
            {currentFileUrl && (
              <a
                href={currentFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download size={16} />
                Télécharger
              </a>
            )}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Upload size={16} />
              Nouvelle version
            </button>
          </div>
        </div>

        {doc.description && <p className="mt-4 text-sm text-slate-600">{doc.description}</p>}

        {doc.review_date && (
          <p className="mt-4 text-sm text-slate-500">Date de révision : {formatDate(doc.review_date)}</p>
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
            <ul className="space-y-1">
              {doc.workflow.approvals.map((approval) => (
                <li key={approval.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{approval.approver?.full_name || 'Utilisateur'}</span>
                  <span
                    className={
                      approval.decision === 'approved'
                        ? 'text-emerald-600'
                        : approval.decision === 'rejected'
                          ? 'text-red-600'
                          : 'text-slate-400'
                    }
                  >
                    {approval.decision === 'approved' ? 'Approuvé' : approval.decision === 'rejected' ? 'Rejeté' : 'En attente'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900 sm:text-base">Historique des versions</h2>

        {doc.versions.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune version archivée pour l'instant.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {doc.versions.map((version) => {
              const versionUrl = getDocumentPublicUrl(version.file_path);
              return (
                <li key={version.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      v{version.version}
                      {version.changed_by_user?.full_name ? ` · ${version.changed_by_user.full_name}` : ''}
                    </p>
                    <p className="text-xs text-slate-500">{formatDateTime(version.created_at)}</p>
                    {version.change_note && <p className="mt-1 text-sm text-slate-600">{version.change_note}</p>}
                  </div>
                  {versionUrl && (
                    <a
                      href={versionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex shrink-0 items-center gap-2 self-start rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:self-auto"
                    >
                      <Download size={14} />
                      Télécharger
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isModalOpen && (
        <NewVersionModal documentId={doc.id} onClose={() => setIsModalOpen(false)} onUploaded={handleUploaded} />
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
