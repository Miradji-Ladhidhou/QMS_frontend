import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Clock3, Eye, LockKeyhole } from 'lucide-react';
import { publicApi } from '../lib/publicApi.js';
import AppLogo from '../components/AppLogo.jsx';
import { openBlankTab } from '../lib/openInNewTab.js';

const INPUT_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary';

const FIELD_LABELS = {
  number: 'Numéro',
  title: 'Titre',
  description: 'Description',
  version: 'Version',
  status: 'Statut',
  review_date: 'Date de révision',
  file_name: 'Nom du fichier',
  created_at: 'Créé le',
  updated_at: 'Mis à jour le',
  origin: 'Origine',
  service: 'Service',
  priority: 'Priorité',
  severity: 'Gravité',
  due_date: 'Échéance',
  root_cause: 'Cause racine',
  corrective_action: 'Action corrective',
  preventive_action: 'Action préventive',
  effectiveness_verified: 'Efficacité vérifiée',
  effectiveness_notes: 'Notes d’efficacité',
  customer_name: 'Client',
  received_date: 'Date de réception',
  product_service: 'Produit / service',
  resolution: 'Résolution',
  resolution_date: 'Date de résolution',
  customer_satisfied: 'Client satisfait',
  qui: 'Qui',
  quoi: 'Quoi',
  ou_: 'Où',
  quand_: 'Quand',
  comment_: 'Comment',
  combien: 'Combien',
  pourquoi: 'Pourquoi',
  ai_synthesis: 'Synthèse',
  process: 'Processus',
  next_review_date: 'Prochaine révision',
  current_version: 'Version publiée',
  content: 'Contenu',
  validated_at: 'Validée le',
  findings: 'Constats',
  checklist: 'Checklist',
  actions: 'Actions décidées',
  evaluations: 'Évaluations',
  documents: 'Documents du fournisseur',
  steps: 'Étapes HACCP',
  hazards: 'Dangers',
  ccps: 'Points critiques (CCP)',
  monitoring_logs: 'Relevés de surveillance',
  evaluation_date: 'Date d’évaluation',
  quality_score: 'Qualité',
  delivery_score: 'Délais',
  price_score: 'Prix',
  responsiveness_score: 'Réactivité',
  overall_score: 'Score global',
  decision: 'Décision',
  comment: 'Commentaire',
  weighted_score: 'Score pondéré',
  suggested_decision: 'Décision suggérée',
  type: 'Type',
  planned_date: 'Date prévue',
  completed_date: 'Date de réalisation',
  audit_type: 'Type d’audit',
  scope: 'Périmètre',
  conclusion: 'Conclusion',
  period_start: 'Début de période',
  period_end: 'Fin de période',
  participants: 'Participants',
  previous_actions_status: 'État des actions précédentes',
  context_changes: 'Évolution du contexte',
  resource_adequacy: 'Adéquation des ressources',
  improvement_opportunities: 'Pistes d’amélioration',
  last_reviewed_at: 'Dernière revue',
  current_controls: 'Maîtrises existantes',
  treatment_plan: 'Plan de traitement',
  residual_score: 'Score résiduel',
  product_description: 'Description du produit',
  prerequisites: 'Programmes prérequis',
  intended_use: 'Utilisation prévue',
  consumer_groups: 'Groupes de consommateurs',
  hazard_type: 'Type de danger',
  existing_controls: 'Mesures existantes',
  likelihood: 'Probabilité',
  impact: 'Impact',
  risk_score: 'Score de risque',
  is_significant: 'Significatif',
  justification: 'Justification',
  control_type: 'Type de maîtrise',
  decision_justification: 'Justification de la décision',
  ccp_number: 'Numéro CCP',
  critical_limits: 'Limites critiques',
  validation_source: 'Source de validation',
  validation_evidence: 'Preuve de validation',
  limit_min: 'Limite minimale',
  limit_max: 'Limite maximale',
  limit_unit: 'Unité',
  monitoring_procedure: 'Procédure de surveillance',
  monitoring_frequency: 'Fréquence de surveillance',
  corrective_action_procedure: 'Procédure d’action corrective',
  verification_procedure: 'Procédure de vérification',
  verification_frequency: 'Fréquence de vérification',
  record_keeping_procedure: 'Enregistrements à conserver',
  recorded_value: 'Valeur relevée',
  numeric_value: 'Valeur numérique',
  within_limits: 'Dans les limites',
  corrective_action_taken: 'Action corrective appliquée',
  lot_reference: 'Référence du lot',
  product_disposition: 'Traitement du produit',
  disposition_decision: 'Décision de traitement',
  return_to_control: 'Retour à la maîtrise',
  effectiveness_verification: 'Vérification de l’efficacité',
  recorded_at: 'Relevé effectué le',
  full_name: 'Nom',
  job_title: 'Fonction',
  email: 'Email',
  is_active: 'Actif',
  location: 'Lieu',
  instructor: 'Formateur',
  duration: 'Durée',
  frequency_months: 'Fréquence (mois)',
  target: 'Objectif',
  target_direction: 'Sens de l’objectif',
  frequency: 'Fréquence',
  recurrence: 'Récurrence',
  recurrence_interval: 'Intervalle de récurrence',
  name: 'Nom',
  survey_date: 'Date de l’enquête',
  method: 'Méthode',
  score: 'Note',
  comments: 'Commentaires',
  occurred_at: 'Date de l’événement',
  occurred_time: 'Heure de l’événement',
  injury_type: 'Type de blessure',
  injury_location: 'Localisation de la blessure',
  witness_name: 'Témoin',
  immediate_cause: 'Cause immédiate',
  immediate_actions: 'Actions immédiates',
  with_lost_time: 'Arrêt de travail',
  lost_days: 'Jours d’arrêt',
  plan_content: 'Planifier',
  plan_completed_at: 'Planifier — terminé le',
  plan_due_date: 'Planifier — échéance',
  do_content: 'Déployer',
  do_completed_at: 'Déployer — terminé le',
  do_due_date: 'Déployer — échéance',
  check_content: 'Vérifier',
  check_completed_at: 'Vérifier — terminé le',
  check_due_date: 'Vérifier — échéance',
  act_content: 'Agir',
  act_completed_at: 'Agir — terminé le',
  act_due_date: 'Agir — échéance',
  target_date: 'Date cible',
  treatment: 'Traitement',
  treatment_owner: 'Responsable du traitement',
  treatment_due_date: 'Échéance du traitement',
  reference: 'Référence',
  detected_at: 'Date de détection',
  source: 'Origine',
  action_taken: 'Action réalisée',
  concession_reference: 'Référence de dérogation',
  customer_informed: 'Client informé',
  next_evaluation_date: 'Prochaine évaluation',
  category: 'Catégorie',
  criticality: 'Criticité',
  contact_name: 'Personne à contacter',
  contact_email: 'Email du contact',
  contact_phone: 'Téléphone du contact',
  training_exempt: 'Dispense de formation',
  training_exempt_reason: 'Motif de dispense',
  issuer: 'Émetteur',
  issued_on: 'Émis le',
  expires_on: 'Expire le',
};

const TYPE_LABELS = {
  document: 'Document',
  capa: 'Action corrective et préventive (CAPA)',
  complaint: 'Réclamation',
  qqoqccp: 'Analyse QQOQCCP',
  procedure: 'Procédure',
  accident: 'Accident du travail',
  pdca: 'Projet PDCA',
  audit: 'Audit interne',
  management_review: 'Revue de direction',
  risk: 'Risque ou opportunité',
  haccp_plan: 'Plan HACCP',
  supplier: 'Fournisseur',
  nonconforming_output: 'Non-conformité produit/service',
  customer_satisfaction: 'Enquête de satisfaction',
  employee: 'Fiche du personnel',
  training: 'Formation',
  kpi: 'Indicateur KPI',
  task: 'Tâche de planning',
  service: 'Service',
  quality_policy: 'Politique qualité',
};

const BLOCKED = {
  expired: 'Ce lien de partage a expiré.',
  revoked: 'Cet accès a été révoqué par son propriétaire.',
  locked: 'Trop de codes erronés ont été saisis. Demandez un nouvel accès.',
  invalid: 'Ce lien de partage est invalide.',
  code_expired: 'Le code a expiré. Demandez un nouvel accès à son propriétaire.',
};

function Shell({ children }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-5 flex items-center gap-3">
          <AppLogo className="h-10 w-10 shrink-0 rounded-xl" />
          <p className="text-sm font-semibold text-slate-900">QMS <span className="font-normal text-slate-400">SaaS</span></p>
        </header>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">{children}</section>
      </div>
    </main>
  );
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function ResourceView({ data, onBack, token }) {
  const resource = data.resource || {};
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  async function exportResource(downloadFile = false, fileId = null) {
    const tab = downloadFile ? openBlankTab() : null;
    setExporting(true);
    setExportError('');
    try {
      const accessToken = sessionStorage.getItem(`guest-share-access:${token}`);
      const response = await publicApi.get(`/guest-shares/${token}/${downloadFile ? 'download' : 'export'}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { ...(data.item_id ? { item_id: data.item_id } : {}), ...(fileId ? { file_id: fileId } : {}) },
        responseType: downloadFile ? 'json' : 'blob',
      });
      if (downloadFile) { if (tab) tab.location.href = response.data.url; }
      else {
        const url = URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'donnees-partagees.json';
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      tab?.close();
      setExportError(err.response?.data?.error || 'Export ou téléchargement refusé ou indisponible.');
    } finally { setExporting(false); }
  }
  return (
    <Shell>
      {onBack && <button type="button" onClick={onBack} className="mb-4 text-sm font-medium text-primary">← Retour au lot partagé</button>}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{data.tenant_name} · {TYPE_LABELS[data.resource_type]}</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">{resource.title || resource.name || resource.full_name || resource.customer_name || resource.number || TYPE_LABELS[data.resource_type]}</h1>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
          <Eye size={14} /> Lecture seule
        </span>
      </div>
      <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {Object.entries(resource)
          .filter(([, value]) => value !== null && value !== '')
          .map(([key, value]) => (
            <div key={key} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(9rem,0.35fr)_1fr] sm:gap-4">
              <dt className="text-sm font-medium text-slate-600">{FIELD_LABELS[key] || key}</dt>
              <dd className="whitespace-pre-wrap break-words text-sm text-slate-800">{formatValue(value)}</dd>
            </div>
          ))}
      </dl>
      {data.can_export && <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={exporting} onClick={() => exportResource()} className="rounded border border-slate-300 px-3 py-2 text-sm">Exporter les données (JSON)</button>
        {['document', 'procedure'].includes(data.resource_type) &&
          <button type="button" disabled={exporting} onClick={() => exportResource(true)} className="rounded border border-slate-300 px-3 py-2 text-sm">Télécharger le fichier</button>}
        {data.resource_type === 'supplier' && resource.documents?.filter((file) => file.file_name).map((file) =>
          <button key={file.id} type="button" disabled={exporting} onClick={() => exportResource(true, file.id)} className="rounded border border-slate-300 px-3 py-2 text-sm">Télécharger {file.title}</button>)}
      </div>}
      {!data.can_export && <p className="mt-3 text-xs text-slate-500">Export et téléchargement interdits pour ce partage.</p>}
      {exportError && <p role="alert" className="mt-3 text-sm text-red-600">{exportError}</p>}
      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Clock3 size={14} />
        Accès valable jusqu’au {new Date(data.expires_at).toLocaleString('fr-FR')}. {onBack ? 'Seuls les éléments du lot sont accessibles.' : 'Seul cet élément est accessible.'}
      </p>
    </Shell>
  );
}

function BundleView({ data, token }) {
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  async function open(item) {
    setBusy(item.id);
    setError('');
    try {
      const accessToken = sessionStorage.getItem(`guest-share-access:${token}`);
      const { data: resource } = await publicApi.get(`/guest-shares/${token}/items/${item.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setDetail({ ...resource, item_id: item.id, tenant_name: data.tenant_name });
    } catch (err) {
      setError(BLOCKED[err.response?.data?.state] || err.response?.data?.error || 'Impossible de consulter cet élément.');
    } finally { setBusy(null); }
  }

  if (detail) return <ResourceView data={detail} token={token} onBack={() => setDetail(null)} />;
  const items = data.items.filter((item) =>
    `${item.label} ${TYPE_LABELS[item.resource_type]}`.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr'))
  );
  return <Shell>
    <p className="text-xs text-slate-500">{data.tenant_name} · Lecture seule</p>
    <h1 className="mt-1 text-xl font-semibold text-slate-900">{data.title}</h1>
    <p className="mt-2 text-sm text-slate-600">{data.items.length} élément(s) partagé(s). Aucun nouvel élément ne sera ajouté automatiquement.</p>
    <label htmlFor="guest-search" className="mb-1 mt-5 block text-sm font-medium text-slate-700">Rechercher dans le lot</label>
    <input id="guest-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} className={INPUT_CLASS} />
    {error && <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</p>}
    <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
      {items.map((item) => <li key={item.id}>
        <button type="button" disabled={!!busy} onClick={() => open(item)} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-50 disabled:opacity-50">
          <span><span className="block text-xs text-slate-500">{TYPE_LABELS[item.resource_type]}</span><span className="break-words text-sm font-medium text-slate-900">{item.label}</span></span>
          <span className="shrink-0 text-sm text-primary">{busy === item.id ? 'Chargement...' : 'Consulter'}</span>
        </button>
      </li>)}
    </ul>
    {!items.length && <p className="mt-3 text-sm text-slate-500">Aucun élément trouvé.</p>}
    <p className="mt-4 text-xs text-slate-500">Accès valable jusqu’au {new Date(data.expires_at).toLocaleString('fr-FR')}.</p>
  </Shell>;
}

export default function GuestShare() {
  const { token } = useParams();
  const [phase, setPhase] = useState('loading');
  const [tenantName, setTenantName] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [resourceData, setResourceData] = useState(null);
  const [blockedMessage, setBlockedMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const tags = [
      ['robots', 'noindex, nofollow'],
      ['referrer', 'no-referrer'],
    ].map(([name, content]) => {
      const tag = document.createElement('meta');
      tag.name = name;
      tag.content = content;
      document.head.appendChild(tag);
      return tag;
    });
    return () => tags.forEach((tag) => tag.remove());
  }, []);

  useEffect(() => {
    let active = true;
    const savedAccessToken = sessionStorage.getItem(`guest-share-access:${token}`);
    const request = savedAccessToken
      ? publicApi.get(`/guest-shares/${token}/data`, { headers: { Authorization: `Bearer ${savedAccessToken}` } })
      : publicApi.get(`/guest-shares/${token}`);
    request
      .then(({ data }) => {
        if (!active) return;
        if (data.resource || data.items) {
          setResourceData(data);
          setPhase('resource');
        } else {
          setTenantName(data.tenant_name);
          setExpiresAt(data.expires_at);
          setPhase('email');
        }
      })
      .catch((err) => {
        if (!active) return;
        setBlockedMessage(BLOCKED[err.response?.data?.state] || BLOCKED.invalid);
        setPhase('blocked');
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function sendCode(event) {
    event?.preventDefault();
    setError('');
    setBusy(true);
    try {
      await publicApi.post(`/guest-shares/${token}/send-code`, { email });
      setCode('');
      setCodeSent(true);
      setPhase('code');
    } catch (err) {
      if (err.response?.data?.state === 'locked') {
        setBlockedMessage(BLOCKED.locked);
        setPhase('blocked');
      } else if (err.response?.status === 410) {
        setBlockedMessage(BLOCKED[err.response?.data?.state] || BLOCKED.expired);
        setPhase('blocked');
      } else {
        setError(err.response?.data?.error || "Impossible d'envoyer le code de vérification.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await publicApi.post(`/guest-shares/${token}/verify`, { code });
      sessionStorage.setItem(`guest-share-access:${token}`, data.access_token);
      setTenantName(data.tenant_name);
      setResourceData(data);
      setPhase('resource');
    } catch (err) {
      const state = err.response?.data?.state;
      if (state === 'locked' || state === 'code_expired' || err.response?.status === 410) {
        setBlockedMessage(BLOCKED[state] || BLOCKED.code_expired);
        setPhase('blocked');
      } else {
        setError(err.response?.data?.error || 'Impossible de vérifier ce code. Réessayez.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (phase === 'resource' && resourceData) {
    return resourceData.items ? <BundleView key={token} data={resourceData} token={token} /> : <ResourceView data={resourceData} token={token} />;
  }

  if (phase === 'loading') {
    return <Shell><p className="py-8 text-center text-sm text-slate-500">Vérification du lien...</p></Shell>;
  }

  if (phase === 'email') {
      return (
        <Shell>
          <div className="mb-4 flex items-center gap-2 text-primary">
            <LockKeyhole size={20} />
            <h1 className="text-lg font-semibold text-slate-900">Vérifier votre adresse email</h1>
          </div>
          <p className="text-sm text-slate-600">
            {tenantName && <><strong>{tenantName}</strong> vous a partagé des données en lecture seule. </>}
            Saisissez l’adresse qui a reçu le lien. Nous vous enverrons un code séparé pour confirmer l’accès.
          </p>
          <form onSubmit={sendCode} className="mt-5 space-y-4">
            <div>
              <label htmlFor="guest-email" className="mb-1 block text-sm font-medium text-slate-700">Adresse email invitée</label>
              <input
                id="guest-email"
                type="email"
                autoComplete="email"
                required
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy || !email}
              className="w-full rounded-md bg-primary py-3 font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {busy ? 'Envoi...' : 'Recevoir mon code par email'}
            </button>
          </form>
          {expiresAt && <p className="mt-4 text-center text-xs text-slate-500">Ce partage expire le {new Date(expiresAt).toLocaleString('fr-FR')}.</p>}
        </Shell>
      );
  }
  if (phase === 'blocked') {
    return (
      <Shell>
        <div className="flex flex-col items-center py-5 text-center">
          <AlertCircle size={36} className="text-amber-600" />
          <h1 className="mt-3 text-lg font-semibold text-slate-900">Accès indisponible</h1>
          <p className="mt-1 text-sm text-slate-600">{blockedMessage}</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-4 flex items-center gap-2 text-primary">
        <LockKeyhole size={20} />
        <h1 className="text-lg font-semibold text-slate-900">Accès invité sécurisé</h1>
      </div>
      <p className="text-sm text-slate-600">
        {tenantName && <><strong>{tenantName}</strong> vous a partagé des données en lecture seule. </>}
        Saisissez le code à 8 chiffres envoyé séparément à {email} pour les consulter.
      </p>
      {codeSent && (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Le code a été envoyé séparément à {email}. Il est à usage unique et expire dans 15 minutes.
        </p>
      )}
      <form onSubmit={verifyCode} className="mt-5 space-y-4">
        <div>
          <label htmlFor="guest-code" className="mb-1 block text-sm font-medium text-slate-700">Code de vérification</label>
          <input
            id="guest-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{8}"
            maxLength={8}
            required
            autoFocus
            placeholder="12345678"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
            className={`${INPUT_CLASS} text-center text-xl tracking-[0.3em]`}
          />
        </div>
        {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy || code.length !== 8}
          className="w-full rounded-md bg-primary py-3 font-medium text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {busy ? 'Vérification...' : 'Consulter en lecture seule'}
        </button>
      </form>
      <button
        type="button"
        onClick={() => sendCode()}
        disabled={busy}
        className="mt-3 w-full rounded-md border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        Renvoyer un code
      </button>
      {expiresAt && <p className="mt-4 text-center text-xs text-slate-500">Ce partage expire le {new Date(expiresAt).toLocaleString('fr-FR')}.</p>}
    </Shell>
  );
}
