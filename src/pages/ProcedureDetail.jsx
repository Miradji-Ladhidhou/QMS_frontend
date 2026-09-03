import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Plus, Send, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import StatusBadge from '../components/StatusBadge.jsx';
import ProcedureVersionStatusBadge from '../components/ProcedureVersionStatusBadge.jsx';
import AiProcedureDraft from '../components/AiProcedureDraft.jsx';
import ProcedureSectionsEditor from '../components/ProcedureSectionsEditor.jsx';
import ProcedureComplianceCheck from '../components/ProcedureComplianceCheck.jsx';
import ProcedureVersionComparison from '../components/ProcedureVersionComparison.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';

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
function NewVersionModal({ procedureId, procedureTitle, procedureProcess, template, previousContent, onClose, onCreated }) {
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
            return generated ? { ...section, content: generated.content } : section;
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <AiProcedureDraft title={procedureTitle} process={procedureProcess} onGenerated={handleAiGenerated} />
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
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [acknowledgeError, setAcknowledgeError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actingVersionId, setActingVersionId] = useState(null);

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
  const draftVersion = versions.find((v) => v.status === 'draft');
  const pendingVersion = versions.find((v) => v.status === 'pending');
  const currentVersion = versions.find((v) => v.id === procedure.current_version_id);
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

          {!draftVersion && (
            <button
              type="button"
              onClick={() => setIsNewVersionModalOpen(true)}
              className="flex shrink-0 items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Plus size={16} />
              Nouvelle version
            </button>
          )}
        </div>

        {procedure.current_version_id && (
          <div className="mt-4 flex flex-col gap-2 rounded-md border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-center sm:justify-between">
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
        )}
        {acknowledgeError && (
          <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{acknowledgeError}</p>
        )}
        {actionError && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{actionError}</p>
        )}
      </div>

      {currentVersion && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-slate-900">Version en vigueur — v{currentVersion.version}</h2>
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

          {canActOnDraft && (
            <button
              type="button"
              onClick={() => handleSubmit(draftVersion.id)}
              disabled={actingVersionId === draftVersion.id}
              className="mt-4 flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              <Send size={16} />
              {actingVersionId === draftVersion.id ? 'Envoi...' : 'Soumettre pour validation'}
            </button>
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

      {isNewVersionModalOpen && (
        <NewVersionModal
          procedureId={procedure.id}
          procedureTitle={procedure.title}
          procedureProcess={procedure.process}
          template={template}
          previousContent={currentVersion?.content}
          onClose={() => setIsNewVersionModalOpen(false)}
          onCreated={handleVersionCreated}
        />
      )}

      {isRejectModalOpen && pendingVersion && (
        <RejectVersionModal
          onClose={() => setIsRejectModalOpen(false)}
          onConfirm={(comment) => handleReject(pendingVersion.id, comment)}
        />
      )}
    </div>
  );
}
