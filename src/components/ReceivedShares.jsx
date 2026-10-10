import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { openBlankTab } from '../lib/openInNewTab.js';
import SharedProcedureEditor from './SharedProcedureEditor.jsx';
import SharedSupplierFiles from './SharedSupplierFiles.jsx';

const PATHS = {
  document: 'documents', capa: 'capas', complaint: 'complaints', qqoqccp: 'qqoqccp',
  procedure: 'procedures', accident: 'accidents', pdca: 'pdca', audit: 'audits',
  management_review: 'management-reviews', risk: 'risks', haccp_plan: 'haccp/plans',
  supplier: 'suppliers', nonconforming_output: 'nonconforming-outputs',
  customer_satisfaction: 'customer-satisfaction', employee: 'employees',
  training: 'trainings', kpi: 'kpis', task: 'tasks', service: 'services', quality_policy: 'quality-policy',
};
const BASIC_FIELDS = {
  document: ['version', 'review_date'],
  capa: ['title', 'description', 'root_cause', 'corrective_action', 'preventive_action'],
  pdca: ['title', 'description', 'plan_content', 'do_content', 'check_content', 'act_content'],
  risk: ['title', 'description', 'current_controls', 'treatment_plan'],
  accident: ['title', 'description', 'immediate_cause', 'immediate_actions', 'root_cause'],
  nonconforming_output: ['title', 'description', 'containment_action', 'action_taken'],
  employee: ['full_name', 'job_title', 'email'],
  service: ['name', 'description'],
  kpi: ['name', 'unit'],
  customer_satisfaction: ['customer_name', 'comments'],
  complaint: ['customer_name', 'description', 'root_cause', 'resolution'],
  supplier: ['name', 'contact_name', 'contact_email', 'contact_phone'],
  qqoqccp: ['title', 'qui', 'quoi', 'ou_', 'quand_', 'comment_', 'combien', 'pourquoi'],
  haccp_plan: ['title', 'product_description', 'scope'],
  audit: ['title', 'scope', 'conclusion'],
  management_review: ['title', 'participants', 'conclusions'],
  training: ['title', 'description', 'location', 'instructor'],
};
const LABELS = {
  title: 'Titre', description: 'Description', version: 'Version', review_date: 'Date de révision',
  full_name: 'Nom complet', job_title: 'Fonction', email: 'Email', name: 'Nom', unit: 'Unité',
  customer_name: 'Client', comments: 'Commentaires', root_cause: 'Cause racine', resolution: 'Résolution',
  contact_name: 'Contact', contact_email: 'Email du contact', contact_phone: 'Téléphone du contact',
  qui: 'Qui', quoi: 'Quoi', ou_: 'Où', quand_: 'Quand', comment_: 'Comment', combien: 'Combien', pourquoi: 'Pourquoi',
  product_description: 'Description du produit', scope: 'Périmètre', conclusion: 'Conclusion',
  participants: 'Participants', conclusions: 'Conclusions', location: 'Lieu', instructor: 'Formateur',
};

export default function ReceivedShares({ revision = 0 }) {
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);
  const [detail, setDetail] = useState(null);
  const [draft, setDraft] = useState({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    api.get('/shares/received').then(({ data }) => { if (current) setItems(data); })
      .catch((err) => { if (current) setError(err.response?.data?.error || 'Impossible de charger vos partages.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [revision]);

  async function open(item) {
    setBusy(true);
    setError('');
    setSuccess('');
    setEditing(false);
    setDetail(null);
    setActive(item);
    try {
      const { data } = await api.get(`/shares/received/${item.resource_type}/${item.resource_id}`);
      setDetail(data);
      const fields = BASIC_FIELDS[item.resource_type] || ['title', 'description'];
      setDraft(Object.fromEntries(fields.filter((field) => Object.hasOwn(data.resource, field))
        .map((field) => [field, data.resource[field] ?? ''])));
    } catch (err) { setError(err.response?.data?.error || 'Impossible de consulter cet élément.'); }
    finally { setBusy(false); }
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const type = active.resource_type;
      await api.patch(`/${PATHS[type]}/${active.resource_id}${type === 'document' ? '/metadata' : ''}`, draft);
      await open(active);
      setSuccess('Les modifications ont été enregistrées.');
    } catch (err) { setError(err.response?.data?.error || 'Impossible de modifier cet élément.'); }
    finally { setBusy(false); }
  }

  async function replaceDocument(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/documents/${active.resource_id}/versions`, form);
      await open(active);
      setSuccess('Nouvelle version du fichier enregistrée.');
    } catch (err) { setError(err.response?.data?.error || 'Impossible de remplacer le fichier.'); }
    finally { setBusy(false); }
  }

  async function downloadDocument() {
    const tab = openBlankTab();
    setError('');
    try {
      const { data } = await api.get(`/documents/${active.resource_id}/download`);
      if (tab) tab.location.href = data.url;
    } catch (err) { tab?.close(); setError(err.response?.data?.error || 'Téléchargement impossible.'); }
  }
  async function exportData() {
    setError('');
    try {
      const { data } = await api.get(`/shares/received/${active.resource_type}/${active.resource_id}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'donnees-partagees.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) { setError(err.response?.data?.error || 'Export impossible ou interdit.'); }
  }

  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="text-lg font-semibold text-slate-900">Mes partages reçus</h2>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {success && <p role="status" className="text-sm text-emerald-700">{success}</p>}
    {loading ? <p className="text-sm text-slate-500">Chargement...</p> : !items.length
      ? <p className="text-sm text-slate-500">Aucun élément partagé directement ou avec votre rôle.</p>
      : <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">{items.map((item) =>
        <li key={`${item.resource_type}:${item.resource_id}`} className="flex items-center justify-between gap-3 py-3">
          <div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-slate-500">{item.type_label} · {item.permissions.can_edit === true ? 'Modification autorisée' : item.permissions.restricted ? 'Lecture seule' : 'Droits habituels'}
            {' · '}{item.permissions.can_export ? 'Export autorisé' : 'Export interdit'}</p></div>
          <button type="button" disabled={busy} onClick={() => open(item)} className="text-sm text-primary">Consulter</button>
        </li>)}</ul>}
    {active && detail && <div className="space-y-4 border-t border-slate-200 pt-4">
      <h3 className="font-semibold">{active.label}</h3>
      <div className="flex flex-wrap gap-3 text-sm">
        {detail.permissions.can_export && <button type="button" onClick={exportData} className="rounded border border-slate-300 px-3 py-2">Exporter les données (JSON)</button>}
        {detail.permissions.can_edit && !['procedure', 'quality_policy'].includes(active.resource_type) &&
          <button type="button" onClick={() => setEditing((value) => !value)} className="rounded border border-slate-300 px-3 py-2" disabled={busy}>{editing ? 'Annuler' : 'Modifier la fiche'}</button>}
        {detail.permissions.can_edit && active.resource_type === 'document' &&
          <label className="cursor-pointer rounded border border-slate-300 px-3 py-2">Remplacer le fichier (nouvelle version)
            <input type="file" disabled={busy} onChange={replaceDocument} className="hidden" /></label>}
        {active.resource_type === 'document' && detail.permissions.can_export &&
          <button type="button" onClick={downloadDocument} className="rounded border border-slate-300 px-3 py-2">Télécharger le fichier</button>}
        {['procedure', 'quality_policy'].includes(active.resource_type) && <Link to={`/${PATHS[active.resource_type]}${active.resource_type === 'procedure' ? `/${active.resource_id}` : ''}`} className="text-primary">
          Ouvrir le module et son workflow de versions
        </Link>}
      </div>
      {detail.permissions.can_edit && active.resource_type === 'procedure' && <SharedProcedureEditor key={active.resource_id} id={active.resource_id} />}
      {active.resource_type === 'supplier' && <SharedSupplierFiles key={active.resource_id} id={active.resource_id} canEdit={detail.permissions.can_edit} canExport={detail.permissions.can_export} />}
      {active.resource_type === 'quality_policy' && <p className="text-sm text-slate-500">Une politique publiée reste immuable. Seul un administrateur peut publier une nouvelle version.</p>}
      {editing ? <form onSubmit={save} className="space-y-3">
        {Object.entries(draft).map(([field, value]) => <div key={field}>
          <label htmlFor={`received-${field}`} className="mb-1 block text-sm font-medium text-slate-700">{LABELS[field] || field}</label>
          <textarea id={`received-${field}`} value={value} disabled={busy} onChange={(event) => setDraft((previous) => ({ ...previous, [field]: event.target.value }))}
            className="w-full rounded border border-slate-300 p-2 text-sm" rows={field === 'description' ? 4 : 2} />
        </div>)}
        <button type="submit" disabled={busy} className="rounded bg-primary px-4 py-2 text-sm text-white disabled:opacity-50">Enregistrer</button>
      </form> : <dl className="divide-y divide-slate-100">{Object.entries(detail.resource).filter(([, value]) => value !== null && value !== '').map(([field, value]) =>
        <div key={field} className="grid gap-2 py-2 sm:grid-cols-[12rem_1fr]">
          <dt className="text-sm font-medium text-slate-600">{LABELS[field] || field}</dt>
          <dd className="whitespace-pre-wrap break-words text-sm">{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</dd>
        </div>)}</dl>}
    </div>}
  </section>;
}
