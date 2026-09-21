import { useRef, useState } from 'react';
import { Download, FileText, Paperclip, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { api } from '../../lib/api.js';
import { DOCUMENT_KIND_LABELS, DOCUMENT_STATE_LABELS, DOCUMENT_STATE_STYLES, formatIsoDate } from '../../lib/supplierPolicy.js';

const FIELD_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:py-2 sm:text-sm';
const MAX_FILE_MB = 15;

// Ajout ou modification d'un certificat / d'une pièce. Le fichier est facultatif (une référence et une échéance
// suffisent à suivre un certificat) ; 15 Mo au plus.
function DocumentModal({ supplierId, document, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: document?.title || '',
    kind: document?.kind || 'quality_certificate',
    reference: document?.reference || '',
    issuer: document?.issuer || '',
    issued_on: document?.issued_on || '',
    expires_on: document?.expires_on || '',
    notes: document?.notes || '',
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (file && file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Le fichier dépasse ${MAX_FILE_MB} Mo.`);
      return;
    }
    setSaving(true);
    let saved;
    try {
      if (document) {
        ({ data: saved } = await api.patch(`/suppliers/${supplierId}/documents/${document.id}`, form));
        if (file) {
          const body = new FormData();
          body.append('file', file);
          ({ data: saved } = await api.put(`/suppliers/${supplierId}/documents/${document.id}/file`, body));
        }
      } else {
        const body = new FormData();
        Object.entries(form).forEach(([key, value]) => value && body.append(key, value));
        if (file) body.append('file', file);
        ({ data: saved } = await api.post(`/suppliers/${supplierId}/documents`, body));
      }
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer ce document.");
      setSaving(false);
      return;
    }
    setSaving(false);
    onSaved(saved, Boolean(document));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{document ? 'Modifier le document' : 'Nouveau certificat ou pièce'}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="-m-2 shrink-0 p-2.5 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Titre</label>
            <input type="text" required maxLength={200} placeholder="Ex : Certificat FSSC 22000" value={form.title} onChange={(e) => update('title', e.target.value)} className={FIELD_CLASS} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
            <select value={form.kind} onChange={(e) => update('kind', e.target.value)} className={FIELD_CLASS}>
              {Object.entries(DOCUMENT_KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Référence</label>
              <input type="text" maxLength={100} value={form.reference} onChange={(e) => update('reference', e.target.value)} className={FIELD_CLASS} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Organisme</label>
              <input type="text" maxLength={200} placeholder="Bureau Veritas, SGS…" value={form.issuer} onChange={(e) => update('issuer', e.target.value)} className={FIELD_CLASS} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Délivré le</label>
              <input type="date" value={form.issued_on} onChange={(e) => update('issued_on', e.target.value)} className={FIELD_CLASS} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Expire le</label>
              <input type="date" value={form.expires_on} onChange={(e) => update('expires_on', e.target.value)} className={FIELD_CLASS} />
            </div>
          </div>
          <p className="text-xs text-slate-400">Avec une date d'expiration, le responsable du suivi est prévenu 30 jours avant, 7 jours avant, le jour même puis chaque semaine.</p>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea rows={2} value={form.notes} onChange={(e) => update('notes', e.target.value)} className={FIELD_CLASS} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{document?.has_file ? 'Remplacer le fichier (facultatif)' : 'Fichier (facultatif)'}</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:min-h-[40px] file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:text-sm file:font-medium file:text-slate-700"
            />
            <p className="mt-1 text-xs text-slate-400">{MAX_FILE_MB} Mo au plus.{document?.file_name ? ` Actuel : ${document.file_name}.` : ''}</p>
          </div>
          {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving} className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Certificats et pièces d'un fournisseur (qualité, sécurité des aliments, agrément sanitaire, assurance, contrat…) avec
// leur échéance : valide, expire bientôt (30 jours), expiré. Le fichier se télécharge par un lien à durée de vie courte.
export default function SupplierDocumentsCard({ supplierId, documents, canManage, onChange }) {
  const [modal, setModal] = useState(null); // { document? } | null
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const listRef = useRef(null);

  async function handleDownload(document) {
    setBusyId(document.id);
    setError('');
    try {
      const { data } = await api.get(`/suppliers/${supplierId}/documents/${document.id}/download`);
      window.open(data.url, '_blank', 'noopener');
    } catch {
      setError('Impossible de télécharger ce fichier.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(document) {
    if (!window.confirm(`Supprimer « ${document.title} » et son fichier ?`)) return;
    try {
      await api.delete(`/suppliers/${supplierId}/documents/${document.id}`);
      onChange(documents.filter((item) => item.id !== document.id));
    } catch {
      setError('Impossible de supprimer ce document.');
    }
  }

  function handleSaved(saved, isUpdate) {
    setModal(null);
    onChange(isUpdate ? documents.map((item) => (item.id === saved.id ? saved : item)) : [...documents, saved]);
  }

  if (documents.length === 0 && !canManage) return null;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" ref={listRef}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Paperclip size={15} className="text-slate-400" />
          Certificats et pièces ({documents.length})
        </h2>
        {canManage && (
          <button type="button" onClick={() => setModal({})} className="flex min-h-[40px] items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:min-h-0">
            <Plus size={14} />
            Ajouter
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {documents.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">Aucun certificat ni pièce. Ajoutez un certificat ISO, un agrément sanitaire ou une assurance avec sa date d'expiration.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {documents.map((document) => (
            <li key={document.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-slate-900">{document.title}</p>
                  <p className="break-words text-xs text-slate-500">
                    {DOCUMENT_KIND_LABELS[document.kind]}
                    {document.reference ? ` · ${document.reference}` : ''}
                    {document.issuer ? ` · ${document.issuer}` : ''}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${DOCUMENT_STATE_STYLES[document.state]}`}>
                  {DOCUMENT_STATE_LABELS[document.state]}
                  {document.expires_on ? ` · ${formatIsoDate(document.expires_on)}` : ''}
                </span>
              </div>
              {document.notes && <p className="mt-1 break-words text-xs text-slate-600">{document.notes}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {document.has_file ? (
                  <button type="button" onClick={() => handleDownload(document)} disabled={busyId === document.id} className="flex min-h-[40px] items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:min-h-0">
                    <Download size={13} />
                    <span className="max-w-[12rem] truncate">{document.file_name || 'Télécharger'}</span>
                  </button>
                ) : (
                  canManage && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <FileText size={13} />
                      Aucun fichier
                    </span>
                  )
                )}
                {canManage && (
                  <>
                    <button type="button" onClick={() => setModal({ document })} aria-label={`Modifier ${document.title}`} className="rounded-md p-3 text-slate-500 hover:bg-slate-100 hover:text-primary sm:p-1.5">
                      {document.has_file ? <Pencil size={14} /> : <Upload size={14} />}
                    </button>
                    <button type="button" onClick={() => handleDelete(document)} aria-label={`Supprimer ${document.title}`} className="rounded-md p-3 text-slate-500 hover:bg-slate-100 hover:text-red-600 sm:p-1.5">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {modal && <DocumentModal supplierId={supplierId} document={modal.document} onClose={() => setModal(null)} onSaved={handleSaved} />}
    </div>
  );
}
