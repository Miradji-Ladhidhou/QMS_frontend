import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Cloud, Download, Loader2, Plus, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { STATUS_LABELS } from '../lib/documentStatus.js';
import { exportToCsv } from '../lib/csvExport.js';
import { exportToPdf, exportToXlsx, exportToDrive } from '../lib/pdfExport.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useTenant } from '../lib/useTenant.js';
import StatusBadge from '../components/StatusBadge.jsx';
import AiProcedureDraft from '../components/AiProcedureDraft.jsx';
import ProcedureSectionsEditor from '../components/ProcedureSectionsEditor.jsx';

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

function NewProcedureModal({ template, onClose, onCreated }) {
  const [number, setNumber] = useState('');
  const [title, setTitle] = useState('');
  const [process, setProcess] = useState('');
  const [nextReviewDate, setNextReviewDate] = useState('');
  const [content, setContent] = useState(EMPTY_CONTENT);
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

    let procedure;
    try {
      ({ data: procedure } = await api.post('/procedures', {
        number,
        title,
        process: process || undefined,
        next_review_date: nextReviewDate || undefined,
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

          <AiProcedureDraft title={title} process={process} onGenerated={handleAiGenerated} />

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

export default function Procedures() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const tenant = useTenant();
  const [procedures, setProcedures] = useState([]);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [processFilter, setProcessFilter] = useState('');
  const [search, setSearch] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportingDrive, setExportingDrive] = useState(false);
  const [driveSuccess, setDriveSuccess] = useState('');
  const [exportError, setExportError] = useState('');

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(loadProcedures, 300);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, processFilter, search]);

  function handleCreated(procedure) {
    setIsModalOpen(false);
    navigate(`/procedures/${procedure.id}`);
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

  function handleExportCsv() {
    const columns = buildExportColumns();
    const rows = buildExportRows().map((row) => columns.map((col) => row[col.key]));
    exportToCsv(
      `procedures-${new Date().toISOString().slice(0, 10)}.csv`,
      'Procédures',
      columns.map((col) => col.label),
      rows,
      { generatedBy: currentUser?.full_name, subtitle: `${procedures.length} procédures` }
    );
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
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={procedures.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            <Download size={18} />
            Exporter CSV
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exportingPdf || procedures.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            {exportingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter PDF
          </button>
          <button
            type="button"
            onClick={handleExportXlsx}
            disabled={exportingXlsx || procedures.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            {exportingXlsx ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter Excel
          </button>
          {tenant?.storage_provider === 'google_drive' && (
            <button
              type="button"
              onClick={handleExportDrive}
              disabled={exportingDrive || procedures.length === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
            >
              {exportingDrive ? <Loader2 size={18} className="animate-spin" /> : <Cloud size={18} />}
              Enregistrer sur Drive
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 sm:flex-none"
          >
            <Plus size={18} />
            Nouvelle procédure
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
            {procedures.map((procedure) => {
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
                    <div>
                      <p className="font-medium text-slate-900">{procedure.title}</p>
                      <p className="text-sm text-slate-500">
                        {procedure.number} · {procedure.process || 'Processus non précisé'}
                      </p>
                    </div>
                    <StatusBadge status={procedure.status} />
                  </div>
                  <p className={`mt-2 flex items-center gap-1 text-sm ${overdue ? 'font-medium text-red-600' : 'text-slate-500'}`}>
                    {overdue && <AlertTriangle size={14} />}
                    Prochaine révision : {formatDate(procedure.next_review_date)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Numéro</th>
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3">Processus</th>
                  <th className="px-4 py-3">Version en cours</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Prochaine révision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {procedures.map((procedure) => {
                  const overdue = isReviewOverdue(procedure);
                  return (
                    <tr
                      key={procedure.id}
                      onClick={() => navigate(`/procedures/${procedure.id}`)}
                      className={`cursor-pointer hover:bg-slate-50 ${overdue ? 'bg-red-50/50' : ''}`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">{procedure.number}</td>
                      <td className="px-4 py-3 text-slate-700">{procedure.title}</td>
                      <td className="px-4 py-3 text-slate-600">{procedure.process || '—'}</td>
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
              </tbody>
            </table>
          </div>
        </>
      )}

      {isModalOpen && (
        <NewProcedureModal template={template} onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
