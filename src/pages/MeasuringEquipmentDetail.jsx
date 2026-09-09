import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, Pencil, Trash2, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { CAPA_PRIORITY_LABELS } from '../lib/capaStatus.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import CalibrationResultBadge from '../components/CalibrationResultBadge.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function EditEquipmentModal({ equipment, services, categories, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name: equipment.name,
    identifier: equipment.identifier || '',
    category: equipment.category || '',
    service_id: equipment.service_id || '',
    is_active: equipment.is_active,
    next_calibration_date: equipment.next_calibration_date || '',
    category_id: equipment.category_id || '',
  });
  const [isPrivate, setIsPrivate] = useState(Boolean(equipment.is_private_to_me));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    let categoryId = form.category_id || null;
    if (isPrivate) {
      try {
        categoryId = await resolvePersonalCategoryId('measuring_equipment');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    // onUpdated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le parent ne doit jamais se faire passer pour un échec de la modification.
    let data;
    try {
      ({ data } = await api.patch(`/measuring-equipment/${equipment.id}`, {
        name: form.name,
        identifier: form.identifier || null,
        category: form.category || null,
        service_id: form.service_id || null,
        is_active: form.is_active,
        next_calibration_date: form.next_calibration_date || null,
        category_id: categoryId,
      }));
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de modifier l'équipement.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onUpdated(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Modifier l'équipement</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Identifiant / N° de série</label>
              <input
                type="text"
                value={form.identifier}
                onChange={(e) => updateField('identifier', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Service</label>
              <select
                value={form.service_id}
                onChange={(e) => updateField('service_id', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Aucun</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Prochain étalonnage</label>
              <input
                type="date"
                value={form.next_calibration_date}
                onChange={(e) => updateField('next_calibration_date', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => updateField('is_active', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            Équipement actif
          </label>

          <CategoryVisibilityField
            categories={categories}
            categoryId={form.category_id}
            onCategoryIdChange={(value) => updateField('category_id', value)}
            isPrivate={isPrivate}
            onIsPrivateChange={setIsPrivate}
          />

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

function CreateCapaFromCalibrationModal({ equipmentId, calibrationId, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', priority: 'medium', due_date: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    let response;
    try {
      response = await api.post(`/measuring-equipment/${equipmentId}/calibrations/${calibrationId}/create-capa`, {
        title: form.title,
        priority: form.priority,
        due_date: form.due_date || undefined,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer la CAPA.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onCreated(response.data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Créer une CAPA depuis cet étalonnage</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Objet de la CAPA</label>
            <input
              type="text"
              required
              placeholder="Ex : Réétalonner et réviser les mesures affectées"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Priorité</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.entries(CAPA_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Échéance</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Création...' : 'Créer la CAPA'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function MeasuringEquipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [equipment, setEquipment] = useState(null);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [capaModalCalibration, setCapaModalCalibration] = useState(null);

  const [calibrationDate, setCalibrationDate] = useState('');
  const [result, setResult] = useState('conform');
  const [performedBy, setPerformedBy] = useState('');
  const [certificateReference, setCertificateReference] = useState('');
  const [comment, setComment] = useState('');
  const [calibrationError, setCalibrationError] = useState('');
  const [submittingCalibration, setSubmittingCalibration] = useState(false);

  async function loadEquipment() {
    setLoading(true);
    try {
      const { data } = await api.get(`/measuring-equipment/${id}`);
      setEquipment(data);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de charger l'équipement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEquipment();
    api.get('/services').then(({ data }) => setServices(data.filter((service) => service.is_active))).catch(() => {});
    api
      .get('/module-categories', { params: { resource_type: 'measuring_equipment' } })
      .then(({ data }) => setCategories(data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDelete() {
    if (!window.confirm(`Supprimer définitivement l'équipement "${equipment.name}" ?`)) return;
    try {
      await api.delete(`/measuring-equipment/${id}`);
      navigate('/measuring-equipment');
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de supprimer cet équipement.");
    }
  }

  async function handleAddCalibration(event) {
    event.preventDefault();
    setCalibrationError('');
    setSubmittingCalibration(true);
    try {
      const { data } = await api.post(`/measuring-equipment/${id}/calibrations`, {
        calibration_date: calibrationDate,
        result,
        performed_by: performedBy || undefined,
        certificate_reference: certificateReference || undefined,
        comment: comment || undefined,
      });
      setEquipment((prev) => ({ ...prev, calibrations: [data, ...prev.calibrations] }));
      setCalibrationDate('');
      setResult('conform');
      setPerformedBy('');
      setCertificateReference('');
      setComment('');
    } catch (err) {
      setCalibrationError(err.response?.data?.error || "Impossible d'enregistrer cet étalonnage.");
    } finally {
      setSubmittingCalibration(false);
    }
  }

  async function handleDeleteCalibration(calibration) {
    if (!window.confirm('Supprimer cet étalonnage ?')) return;
    try {
      await api.delete(`/measuring-equipment/${id}/calibrations/${calibration.id}`);
      setEquipment((prev) => ({ ...prev, calibrations: prev.calibrations.filter((c) => c.id !== calibration.id) }));
    } catch {
      setError('Impossible de supprimer cet étalonnage.');
    }
  }

  function handleCapaCreated(calibration, capa) {
    setEquipment((prev) => ({
      ...prev,
      calibrations: prev.calibrations.map((c) => (c.id === calibration.id ? { ...c, linked_capa: capa } : c)),
    }));
    setCapaModalCalibration(null);
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  if (error && !equipment) {
    return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  }

  if (!equipment) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/measuring-equipment')}
        className="mb-3 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
          {equipment.name}
          {!equipment.is_active && <span className="ml-2 text-sm font-normal text-slate-400">(inactif)</span>}
        </h1>
        {canManage && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              aria-label="Modifier"
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-primary"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Supprimer"
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4 sm:p-5">
        <div>
          <p className="text-xs text-slate-500">Identifiant</p>
          <p className="text-sm font-medium text-slate-800">{equipment.identifier || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Type</p>
          <p className="text-sm font-medium text-slate-800">{equipment.category || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Service</p>
          <p className="text-sm font-medium text-slate-800">{equipment.service?.name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Prochain étalonnage</p>
          <p className="text-sm font-medium text-slate-800">{formatDate(equipment.next_calibration_date)}</p>
        </div>
      </div>

      {canManage && (
        <form onSubmit={handleAddCalibration} className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Nouvel étalonnage</p>

          {calibrationError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{calibrationError}</p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                required
                value={calibrationDate}
                onChange={(e) => setCalibrationDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Résultat</label>
              <select
                value={result}
                onChange={(e) => setResult(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="conform">Conforme</option>
                <option value="non_conform">Non conforme</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Réalisé par</label>
              <input
                type="text"
                placeholder="Prestataire externe, ou nom en interne"
                value={performedBy}
                onChange={(e) => setPerformedBy(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Référence du certificat</label>
              <input
                type="text"
                value={certificateReference}
                onChange={(e) => setCertificateReference(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          {result === 'non_conform' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Commentaire <span className="font-normal text-slate-400">(impact sur les mesures depuis le dernier étalonnage valide)</span>
              </label>
              <AutoTextarea
                required
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={submittingCalibration}
            className="w-full rounded-md bg-primary py-2.5 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60 sm:w-auto sm:px-6"
          >
            {submittingCalibration ? 'Enregistrement...' : "Enregistrer l'étalonnage"}
          </button>
        </form>
      )}

      <h2 className="mt-6 text-sm font-semibold text-slate-900 sm:text-base">Historique des étalonnages ({equipment.calibrations.length})</h2>

      {equipment.calibrations.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Aucun étalonnage pour l'instant.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {equipment.calibrations.map((calibration) => (
            <div key={calibration.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">{formatDate(calibration.calibration_date)}</p>
                  <p className="text-xs text-slate-500">
                    {calibration.performed_by || 'Réalisé en interne'}
                    {calibration.recorder ? ` · enregistré par ${calibration.recorder.full_name}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <CalibrationResultBadge result={calibration.result} />
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCalibration(calibration)}
                      aria-label="Supprimer l'étalonnage"
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              {calibration.certificate_reference && (
                <p className="mt-2 text-xs text-slate-500">Certificat : {calibration.certificate_reference}</p>
              )}
              {calibration.comment && <p className="mt-2 text-sm text-slate-700">{calibration.comment}</p>}

              {calibration.result === 'non_conform' && (
                <div className="mt-3">
                  {calibration.linked_capa ? (
                    <Link
                      to={`/capas/${calibration.linked_capa.id}`}
                      className="inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      <ClipboardCheck size={14} />
                      Voir la CAPA liée — {calibration.linked_capa.number}
                    </Link>
                  ) : (
                    canManage && (
                      <button
                        type="button"
                        onClick={() => setCapaModalCalibration(calibration)}
                        className="inline-flex items-center gap-2 rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
                      >
                        <ClipboardCheck size={14} />
                        Créer une CAPA
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isEditModalOpen && (
        <EditEquipmentModal
          equipment={equipment}
          services={services}
          categories={categories}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={(data) => {
            setEquipment((prev) => ({ ...prev, ...data }));
            setIsEditModalOpen(false);
          }}
        />
      )}

      {capaModalCalibration && (
        <CreateCapaFromCalibrationModal
          equipmentId={id}
          calibrationId={capaModalCalibration.id}
          onClose={() => setCapaModalCalibration(null)}
          onCreated={(capa) => handleCapaCreated(capaModalCalibration, capa)}
        />
      )}
    </div>
  );
}
