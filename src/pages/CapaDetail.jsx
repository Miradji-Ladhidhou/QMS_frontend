import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, Save, Send, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { CAPA_EFFECTIVENESS_LABELS } from '../lib/capaStatus.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import CapaPriorityBadge from '../components/CapaPriorityBadge.jsx';
import CapaStatusBadge from '../components/CapaStatusBadge.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';

// Représente le tri-état effectiveness_verified (null/true/false) comme une chaîne pour
// un <select>, seul moyen simple de distinguer "non vérifiée" d'un false explicite.
function effectivenessToSelectValue(value) {
  if (value === true) return 'true';
  if (value === false) return 'false';
  return '';
}

function selectValueToEffectiveness(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

const TREATMENT_FIELDS = ['service_id', 'description', 'root_cause', 'corrective_action', 'preventive_action', 'comment'];

function buildTreatmentForm(capa) {
  return {
    service_id: capa.service_id || '',
    description: capa.description || '',
    root_cause: capa.root_cause || '',
    corrective_action: capa.corrective_action || '',
    preventive_action: capa.preventive_action || '',
    comment: capa.comment || '',
  };
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

// Délai de traitement (en jours) paramétré pour le niveau de gravité de cette CAPA
// (Paramètres > CAPA) — voir Capas.jsx pour le même calcul côté liste.
function getDelayDays(priority, priorityDelays) {
  return priorityDelays?.[priority] ?? null;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fr-FR');
}

export default function CapaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [capa, setCapa] = useState(null);
  const [services, setServices] = useState([]);
  const [priorityDelays, setPriorityDelays] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [treatmentForm, setTreatmentForm] = useState(null);
  const [savingTreatment, setSavingTreatment] = useState(false);
  const [treatmentSaved, setTreatmentSaved] = useState(false);
  const [treatmentError, setTreatmentError] = useState('');

  const [effectivenessVerified, setEffectivenessVerified] = useState('');
  const [effectivenessNotes, setEffectivenessNotes] = useState('');
  const [savingEffectiveness, setSavingEffectiveness] = useState(false);
  const [effectivenessSaved, setEffectivenessSaved] = useState(false);
  const [effectivenessError, setEffectivenessError] = useState('');

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function loadCapa() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/capas/${id}`);
      setCapa(data);
      setTreatmentForm(buildTreatmentForm(data));
      setEffectivenessVerified(effectivenessToSelectValue(data.effectiveness_verified));
      setEffectivenessNotes(data.effectiveness_notes || '');
    } catch {
      setError('Impossible de charger cette CAPA.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCapa();
    api
      .get('/capas/priority-delays')
      .then(({ data }) => setPriorityDelays(data))
      .catch(() => {});
    api
      .get('/services')
      // GET /services renvoie aussi les services désactivés (nécessaire à la page de
      // gestion) — ce formulaire ne doit proposer que les actifs.
      .then(({ data }) => setServices(data.filter((service) => service.is_active)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSaveTreatment(event) {
    event.preventDefault();
    setTreatmentError('');
    setTreatmentSaved(false);
    setSavingTreatment(true);

    try {
      const payload = {};
      for (const field of TREATMENT_FIELDS) {
        payload[field] = treatmentForm[field] || null;
      }
      const { data } = await api.patch(`/capas/${id}`, payload);
      // PATCH ne renvoie pas les commentaires de suivi (contrairement à GET /capas/:id) —
      // on les préserve pour ne pas faire planter le rendu de la section commentaires.
      setCapa((prev) => ({ ...prev, ...data, comments: prev.comments }));
      setTreatmentSaved(true);
    } catch (err) {
      setTreatmentError(err.response?.data?.error || 'Impossible d’enregistrer ces informations.');
    } finally {
      setSavingTreatment(false);
    }
  }

  async function handleSaveEffectiveness(event) {
    event.preventDefault();
    setEffectivenessError('');
    setEffectivenessSaved(false);
    setSavingEffectiveness(true);

    try {
      const { data } = await api.patch(`/capas/${id}`, {
        effectiveness_verified: selectValueToEffectiveness(effectivenessVerified),
        effectiveness_notes: effectivenessNotes || null,
      });
      setCapa((prev) => ({ ...prev, ...data, comments: prev.comments }));
      setEffectivenessSaved(true);
    } catch (err) {
      setEffectivenessError(err.response?.data?.error || 'Impossible d’enregistrer la vérification.');
    } finally {
      setSavingEffectiveness(false);
    }
  }

  async function handleAddComment(event) {
    event.preventDefault();
    if (!commentText.trim()) return;

    setCommentError('');
    setSubmittingComment(true);

    try {
      const { data } = await api.post(`/capas/${id}/comments`, { comment: commentText.trim() });
      setCapa((prev) => ({ ...prev, comments: [...prev.comments, data] }));
      setCommentText('');
    } catch (err) {
      setCommentError(err.response?.data?.error || "Impossible d'ajouter le commentaire.");
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer définitivement la CAPA "${capa.title}" ? Cette action est irréversible.`)) return;

    setDeleteError('');
    setDeleting(true);

    try {
      await api.delete(`/capas/${id}`);
      navigate('/capas');
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Impossible de supprimer cette CAPA.');
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  if (error || !capa) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
        {error || 'CAPA introuvable.'}
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/capas')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary"
        >
          <ArrowLeft size={16} />
          Retour aux CAPA
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

      {currentUser?.role === 'member' && (
        <p className="mb-4 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <Lock size={14} className="shrink-0" />
          Cette CAPA est en lecture seule. Contactez un manager pour toute modification.
        </p>
      )}

      <div className={`rounded-xl border bg-white p-5 sm:p-6 ${capa.status === 'overdue' ? 'border-red-300' : 'border-slate-200'}`}>
        <div>
          <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{capa.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{capa.number}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CapaPriorityBadge priority={capa.priority} />
            <CapaStatusBadge status={capa.status} />
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Date</dt>
            <dd className="mt-1 text-sm text-slate-800">{formatDate(capa.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Origine</dt>
            <dd className="mt-1 text-sm text-slate-800">{capa.origin || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Responsable assigné</dt>
            <dd className="mt-1 text-sm text-slate-800">{capa.assigned?.full_name || 'Non assigné'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Délai de traitement</dt>
            <dd className="mt-1 text-sm text-slate-800">
              {getDelayDays(capa.priority, priorityDelays) ?? '—'} jours
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Échéance</dt>
            <dd className="mt-1 text-sm text-slate-800">{formatDate(capa.due_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Clôturée le</dt>
            <dd className="mt-1 text-sm text-slate-800">{formatDate(capa.closed_at)}</dd>
          </div>
        </dl>
      </div>

      <form
        onSubmit={handleSaveTreatment}
        className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Traitement de la non-conformité</h2>
          {!canManage && <span className="text-xs text-slate-400">Lecture seule</span>}
        </div>

        {treatmentError && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {treatmentError}
          </p>
        )}
        {treatmentSaved && (
          <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Informations enregistrées.
          </p>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Service</label>
            <select
              value={treatmentForm.service_id}
              onChange={(e) => setTreatmentForm((prev) => ({ ...prev, service_id: e.target.value }))}
              disabled={!canManage}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="">Aucun service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description de la non-conformité</label>
            <AutoTextarea
              rows={3}
              value={treatmentForm.description}
              onChange={(e) => setTreatmentForm((prev) => ({ ...prev, description: e.target.value }))}
              disabled={!canManage}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cause identifiée</label>
            <AutoTextarea
              rows={2}
              value={treatmentForm.root_cause}
              onChange={(e) => setTreatmentForm((prev) => ({ ...prev, root_cause: e.target.value }))}
              disabled={!canManage}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Action corrective</label>
            <AutoTextarea
              rows={2}
              value={treatmentForm.corrective_action}
              onChange={(e) => setTreatmentForm((prev) => ({ ...prev, corrective_action: e.target.value }))}
              disabled={!canManage}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Action préventive</label>
            <AutoTextarea
              rows={2}
              value={treatmentForm.preventive_action}
              onChange={(e) => setTreatmentForm((prev) => ({ ...prev, preventive_action: e.target.value }))}
              disabled={!canManage}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Commentaire</label>
            <AutoTextarea
              rows={2}
              value={treatmentForm.comment}
              onChange={(e) => setTreatmentForm((prev) => ({ ...prev, comment: e.target.value }))}
              disabled={!canManage}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          {canManage && (
            <button
              type="submit"
              disabled={savingTreatment}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              <Save size={16} />
              {savingTreatment ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          )}
        </div>
      </form>

      <form
        onSubmit={handleSaveEffectiveness}
        className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Vérification d'efficacité</h2>
          {!canManage && <span className="text-xs text-slate-400">Lecture seule</span>}
        </div>

        {effectivenessError && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {effectivenessError}
          </p>
        )}
        {effectivenessSaved && (
          <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Vérification enregistrée.
          </p>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Résultat</label>
            <select
              value={effectivenessVerified}
              onChange={(e) => setEffectivenessVerified(e.target.value)}
              disabled={!canManage}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500 sm:max-w-xs"
            >
              <option value="">{CAPA_EFFECTIVENESS_LABELS[null]}</option>
              <option value="true">{CAPA_EFFECTIVENESS_LABELS[true]}</option>
              <option value="false">{CAPA_EFFECTIVENESS_LABELS[false]}</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes de vérification</label>
            <AutoTextarea
              rows={2}
              value={effectivenessNotes}
              onChange={(e) => setEffectivenessNotes(e.target.value)}
              disabled={!canManage}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          {canManage && (
            <button
              type="submit"
              disabled={savingEffectiveness}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              <Save size={16} />
              {savingEffectiveness ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          )}
        </div>
      </form>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900 sm:text-base">Commentaires de suivi</h2>

        {capa.comments.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun commentaire pour l'instant.</p>
        ) : (
          <ul className="space-y-4">
            {capa.comments.map((comment) => (
              <li key={comment.id} className="rounded-md bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-800">{comment.author?.full_name || 'Utilisateur'}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(comment.created_at)}</p>
                </div>
                <p className="mt-1 text-sm text-slate-700">{comment.comment}</p>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAddComment} className="mt-5 space-y-2 border-t border-slate-100 pt-4">
          {commentError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{commentError}</p>
          )}
          <AutoTextarea
            rows={3}
            placeholder="Ajouter un commentaire de suivi..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <button
            type="submit"
            disabled={submittingComment || !commentText.trim()}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            <Send size={16} />
            {submittingComment ? 'Envoi...' : 'Ajouter le commentaire'}
          </button>
        </form>
      </div>
    </div>
  );
}
