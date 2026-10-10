import { useEffect, useState } from 'react';
import { Eye, Share2, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useRole } from '../lib/useRole.js';
import { useUsers } from '../lib/useUsers.js';
import { Link, useSearchParams } from 'react-router-dom';
import ReceivedShares from '../components/ReceivedShares.jsx';
import ShareAccessPreview from '../components/ShareAccessPreview.jsx';

const INPUT_CLASS = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary';
const itemKey = (item) => `${item.resource_type}:${item.resource_id}`;

export default function Shares() {
  const role = useRole();
  const users = useUsers();
  const [params] = useSearchParams();
  const allowed = role === 'admin' || role === 'manager';
  const [catalog, setCatalog] = useState([]);
  const [module, setModule] = useState(params.get('resource_type') || '');
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(new Map());
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [days, setDays] = useState(7);
  const [recipientType, setRecipientType] = useState(params.get('recipient_type') === 'user' ? 'user' : 'guest');
  const [subjectId, setSubjectId] = useState(params.get('recipient_type') === 'user' ? params.get('subject_id') || '' : '');
  const [canEdit, setCanEdit] = useState(false);
  const [canExport, setCanExport] = useState(false);
  const [internalShares, setInternalShares] = useState([]);
  const [internalOffset, setInternalOffset] = useState(0);
  const [internalNext, setInternalNext] = useState(null);
  const [internalError, setInternalError] = useState('');
  const [updating, setUpdating] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [shares, setShares] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [nextOffset, setNextOffset] = useState(null);
  const [revision, setRevision] = useState(0);
  const [revoking, setRevoking] = useState(null);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    api.get('/shares/bundles/catalog').then(({ data }) => {
      if (!active) return;
      setCatalog(data);
      setModule((current) => current || data[0]?.resource_type || '');
    }).catch((err) => {
      if (active) setLoadError(err.response?.data?.error || 'Impossible de charger les modules.');
    });
    return () => { active = false; };
  }, [allowed, revision]);

  useEffect(() => {
    if (!allowed || !module) return;
    let active = true;
    setLoading(true);
    setLoadError('');
    setRecords([]);
    setSearch('');
    async function load() {
      try {
        const all = [];
        let cursor = 0;
        do {
          const { data } = await api.get('/shares/bundles/resources', { params: { resource_type: module, offset: cursor } });
          if (!active) return;
          all.push(...data.items);
          cursor = data.next_offset;
        } while (cursor !== null);
        setRecords(all);
        const preselected = all.find((item) => item.resource_id === params.get('resource_id'));
        if (preselected) setSelected((previous) => new Map(previous).set(itemKey(preselected), preselected));
      } catch (err) {
        if (active) setLoadError(err.response?.data?.error || 'Impossible de charger les éléments.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [allowed, module, revision, params]);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setInternalError('');
    api.get('/shares/internal', { params: { offset: internalOffset } }).then(({ data }) => {
      if (active) { setInternalShares(data.items); setInternalNext(data.next_offset); }
    }).catch((err) => {
      if (active) setInternalError(err.response?.data?.error || 'Impossible de charger les partages internes.');
    });
    return () => { active = false; };
  }, [allowed, revision, internalOffset]);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setHistoryLoading(true);
    setHistoryError('');
    api.get('/shares/bundles', { params: { offset } }).then(({ data }) => {
      if (!active) return;
      setShares(data.items);
      setNextOffset(data.next_offset);
    }).catch((err) => {
      if (active) setHistoryError(err.response?.data?.error || 'Impossible de charger les invitations.');
    }).finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [allowed, offset, revision]);

  function toggle(item) {
    setSelected((previous) => {
      const next = new Map(previous);
      if (next.has(itemKey(item))) next.delete(itemKey(item));
      else next.set(itemKey(item), item);
      return next;
    });
  }

  function selectModule() {
    setSelected((previous) => {
      const next = new Map(previous);
      records.forEach((item) => next.set(itemKey(item), item));
      return next;
    });
  }

  async function invite(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.post('/shares/bundles', {
        title, email, expires_in_days: days, recipient_type: recipientType, subject_id: subjectId,
        can_edit: recipientType === 'guest' ? false : canEdit, can_export: canExport,
        items: [...selected.values()].map(({ resource_type, resource_id }) => ({ resource_type, resource_id })),
      });
      setMessage(recipientType === 'guest'
        ? `Une invitation unique a été envoyée à ${data.email} pour ${data.item_count} élément(s).`
        : `Les droits ont été enregistrés pour ${data.item_count} élément(s). Le destinataire les retrouve dans ses partages reçus.`);
      setSelected(new Map());
      setTitle('');
      setEmail('');
      setOffset(0);
      setInternalOffset(0);
      setRevision((value) => value + 1);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'envoyer l'invitation.");
    } finally { setBusy(false); }
  }

  async function changeRights(share, patch, internal = false) {
    setUpdating(share.id);
    const setFailure = internal ? setInternalError : setHistoryError;
    setFailure('');
    try {
      if (internal) {
        const next = { can_edit: share.can_edit === true, can_export: share.can_export !== false, ...patch };
        await api.patch(`/shares/internal/${share.id}`, next);
        setInternalShares((current) => current.map((item) => item.id === share.id ? { ...item, ...next } : item));
      } else {
        await api.patch(`/shares/bundles/${share.id}`, patch);
        setShares((current) => current.map((item) => item.id === share.id ? { ...item, ...patch } : item));
      }
    } catch (err) { setFailure(err.response?.data?.error || 'Impossible de modifier les droits.'); }
    finally { setUpdating(null); }
  }

  async function removeInternal(share) {
    if (!window.confirm('Retirer ce partage ? Les permissions habituelles du membre redeviendront applicables.')) return;
    setUpdating(share.id);
    setInternalError('');
    try {
      await api.delete(`/shares/${share.id}`);
      setRevision((value) => value + 1);
    } catch (err) { setInternalError(err.response?.data?.error || 'Impossible de retirer le partage.'); }
    finally { setUpdating(null); }
  }

  async function revoke(share) {
    if (!window.confirm(`Révoquer l'accès de ${share.email} à tout le lot « ${share.title} » ?`)) return;
    setRevoking(share.id);
    setHistoryError('');
    try {
      await api.delete(`/shares/guest/${share.id}`);
      setShares((current) => current.map((item) => item.id === share.id ? { ...item, revoked_at: new Date().toISOString() } : item));
    } catch (err) {
      setHistoryError(err.response?.data?.error || 'Impossible de révoquer cet accès.');
    } finally { setRevoking(null); }
  }

  if (!role) return <p className="text-sm text-slate-500">Chargement...</p>;
  if (!allowed) return <ReceivedShares />;

  const filtered = records.filter((item) => item.label.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')));
  const moduleLabel = (type) => catalog.find((item) => item.resource_type === type)?.label || type;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Share2 size={24} /> Partages</h1>
        <p className="mt-1 text-sm text-slate-600">Tous les partages internes et invités, les droits de modification et les autorisations d’export au même endroit.</p>
        {role === 'admin' && <Link to="/settings?tab=visibility" className="mt-2 inline-block text-sm font-medium text-primary underline">Configurer les accès habituels aux modules</Link>}
      </header>
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <Eye className="mr-2 inline" size={17} /> Sans compte : lecture seule. Avec compte : lecture ou modification.
        Le lot est figé à l’envoi : les nouveaux éléments d’un module ne sont jamais ajoutés automatiquement.
        Les données des éléments choisis restent consultées dans leur état actuel.
        Les restrictions du partage priment sur les droits habituels, sauf pour les administrateurs.
        En cas de partages multiples, la règle la plus restrictive s’applique.
      </div>
      {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-900">1. Choisir les éléments</h2>
          <label htmlFor="share-module" className="mb-1 block text-sm font-medium text-slate-700">Module</label>
          <select id="share-module" value={module} onChange={(event) => setModule(event.target.value)} disabled={busy} className={INPUT_CLASS}>
            {!catalog.length && <option value="">Aucun module disponible</option>}
            {catalog.map((item) => <option key={item.resource_type} value={item.resource_type}>{item.label}</option>)}
          </select>
          <label htmlFor="share-search" className="mb-1 mt-3 block text-sm font-medium text-slate-700">Rechercher dans ce module</label>
          <input id="share-search" value={search} onChange={(event) => setSearch(event.target.value)} className={INPUT_CLASS} type="search" />
          <div className="my-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-slate-500">{records.length} élément(s) accessible(s)</span>
            <button type="button" onClick={selectModule} disabled={loading || busy || !!loadError || !records.length} className="font-medium text-primary disabled:opacity-50">
              Tout sélectionner dans ce module
            </button>
          </div>
          {loadError && <div role="alert" className="mb-3 text-sm text-red-600">{loadError} <button type="button" onClick={() => setRevision((value) => value + 1)} className="underline">Réessayer</button></div>}
          <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-200">
            {loading ? <p className="p-4 text-sm text-slate-500">Chargement de tous les éléments du module...</p>
              : !filtered.length ? <p className="p-4 text-sm text-slate-500">Aucun élément à afficher.</p>
                : filtered.map((item) => (
                  <label key={itemKey(item)} className="flex cursor-pointer items-start gap-3 border-b border-slate-100 px-3 py-3 last:border-0 hover:bg-slate-50">
                    <input type="checkbox" checked={selected.has(itemKey(item))} onChange={() => toggle(item)} disabled={busy} className="mt-1" />
                    <span className="min-w-0 break-words text-sm text-slate-800">{item.label}</span>
                  </label>
                ))}
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-slate-900">2. Destinataire et droits</h2>
          <div className="mb-4 rounded-lg bg-slate-50 p-3">
            <div className="mb-2 flex justify-between gap-2 text-sm">
              <strong>{selected.size} élément(s) sélectionné(s)</strong>
              <button type="button" disabled={busy || !selected.size} onClick={() => setSelected(new Map())} className="text-slate-600 disabled:opacity-50">Tout retirer</button>
            </div>
            <ul className="max-h-48 space-y-2 overflow-y-auto">
              {[...selected.values()].map((item) => <li key={itemKey(item)} className="flex items-start justify-between gap-2 text-sm">
                <span className="break-words"><span className="text-slate-500">{moduleLabel(item.resource_type)} · </span>{item.label}</span>
                <button type="button" disabled={busy} onClick={() => toggle(item)} aria-label={`Retirer ${item.label}`} className="shrink-0 text-slate-500"><X size={16} /></button>
              </li>)}
            </ul>
          </div>
          <form onSubmit={invite} className="space-y-4">
            <div><label htmlFor="share-recipient" className="mb-1 block text-sm font-medium text-slate-700">Type de destinataire</label>
              <select id="share-recipient" value={recipientType} disabled={busy} className={INPUT_CLASS}
                onChange={(event) => { setRecipientType(event.target.value); setSubjectId(''); setCanEdit(false); }}>
                <option value="guest">Invité sans compte (email et code)</option>
                <option value="user">Membre avec compte</option>
                <option value="role">Tous les membres d’un rôle</option>
              </select></div>
            <div><label htmlFor="share-title" className="mb-1 block text-sm font-medium text-slate-700">Titre du partage</label>
              <input id="share-title" required maxLength={160} value={title} disabled={busy} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Dossier pour l’audit qualité" className={INPUT_CLASS} /></div>
            {recipientType === 'guest' ? <><div><label htmlFor="share-email" className="mb-1 block text-sm font-medium text-slate-700">Email de l’invité</label>
              <input id="share-email" type="email" required value={email} disabled={busy} onChange={(event) => setEmail(event.target.value)} className={INPUT_CLASS} /></div>
            <div><label htmlFor="share-days" className="mb-1 block text-sm font-medium text-slate-700">Durée de l’accès</label>
              <select id="share-days" value={days} disabled={busy} onChange={(event) => setDays(Number(event.target.value))} className={INPUT_CLASS}>
                {[1, 7, 30].map((value) => <option key={value} value={value}>{value} jour(s)</option>)}
              </select></div></> : <div><label htmlFor="share-subject" className="mb-1 block text-sm font-medium text-slate-700">Destinataire</label>
              <select id="share-subject" required value={subjectId} disabled={busy} onChange={(event) => setSubjectId(event.target.value)} className={INPUT_CLASS}>
                <option value="">Choisir...</option>
                {recipientType === 'role' ? <><option value="member">Membres</option><option value="manager">Gestionnaires</option></>
                  : users.filter((user) => user.role !== 'admin').map((user) => <option key={user.id} value={user.id}>{user.full_name || user.email}</option>)}
              </select></div>}
            <div><label htmlFor="share-edit" className="mb-1 block text-sm font-medium text-slate-700">Accès</label>
              <select id="share-edit" value={canEdit ? 'edit' : 'read'} disabled={busy || recipientType === 'guest'}
                onChange={(event) => setCanEdit(event.target.value === 'edit')} className={INPUT_CLASS}>
                <option value="read">Lecture seule</option><option value="edit">Lecture et modification des fiches / fichiers</option>
              </select></div>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={canExport} disabled={busy} onChange={(event) => setCanExport(event.target.checked)} className="mt-1" />
              Autoriser l’export des données et le téléchargement des fichiers
            </label>
            <p className="text-xs text-slate-500">Une interdiction n’empêche pas les captures d’écran, la copie manuelle ni l’utilisation de fichiers déjà téléchargés.
              Les validations, approbations et suppressions conservent leurs règles propres.</p>
            <ShareAccessPreview recipientType={recipientType} subjectId={subjectId} items={[...selected.values()]} canEdit={canEdit} canExport={canExport} />
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={busy || loading || !selected.size || !title.trim() || (recipientType === 'guest' ? !email.trim() : !subjectId)} className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-white disabled:opacity-50">
              {busy ? 'Enregistrement...' : recipientType === 'guest' ? 'Envoyer une seule invitation' : 'Enregistrer le partage interne'}
            </button>
          </form>
        </section>
      </div>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-slate-900">Tous les accès invités (individuels et groupés)</h2>
        {historyError && <p role="alert" className="mb-3 text-sm text-red-600">{historyError} <button type="button" onClick={() => setRevision((value) => value + 1)} className="underline">Réessayer</button></p>}
        {historyLoading ? <p className="text-sm text-slate-500">Chargement...</p> : !shares.length ? <p className="text-sm text-slate-500">Aucune invitation groupée.</p> :
          <ul className="divide-y divide-slate-100">{shares.map((share) => {
            const expired = new Date(share.expires_at) <= new Date();
            return <li key={share.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div><p className="font-medium text-slate-800">{share.title}</p>
                <p className="text-sm text-slate-600">{share.email} · {share.item_count} élément(s)</p>
                <p className="text-xs text-slate-500">{share.revoked_at ? 'Révoqué' : expired ? 'Expiré' : 'Actif'} · Expiration : {new Date(share.expires_at).toLocaleString('fr-FR')}</p></div>
              {!share.revoked_at && !expired && <button type="button" onClick={() => revoke(share)} disabled={!!revoking} className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 disabled:opacity-50">{revoking === share.id ? 'Révocation...' : 'Révoquer tout le lot'}</button>}
              {!share.revoked_at && !expired && <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={share.can_export} disabled={!!updating} onChange={(event) => changeRights(share, { can_export: event.target.checked })} />
                Export et fichiers autorisés
              </label>}
            </li>;
          })}</ul>}
        <div className="mt-3 flex justify-end gap-3 text-sm">
          {offset > 0 && <button type="button" disabled={historyLoading} onClick={() => setOffset(Math.max(0, offset - 20))} className="text-primary">Précédent</button>}
          {nextOffset !== null && <button type="button" disabled={historyLoading} onClick={() => setOffset(nextOffset)} className="text-primary">Suivant</button>}
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-slate-900">Tous les partages internes</h2>
        {internalError && <p role="alert" className="mb-3 text-sm text-red-600">{internalError}</p>}
        {!internalShares.length && <p className="text-sm text-slate-500">Aucun partage interne.</p>}
        <ul className="divide-y divide-slate-100">{internalShares.map((share) => <li key={share.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div><p className="font-medium text-slate-800">{share.title || moduleLabel(share.resource_type)}</p>
            <p className="text-sm text-slate-600">{moduleLabel(share.resource_type)} · {share.subject_type === 'role'
              ? share.subject_id === 'member' ? 'Membres' : 'Gestionnaires'
              : users.find((user) => user.id === share.subject_id)?.full_name || 'Membre supprimé'}</p>
            {share.can_edit === null && <p className="text-xs text-slate-500">Ancien partage : permissions habituelles, sans restriction supplémentaire.</p>}</div>
          <label className="text-sm text-slate-600">Accès <select value={share.can_edit === null ? 'legacy' : share.can_edit ? 'edit' : 'read'}
            disabled={!!updating} onChange={(event) => changeRights(share, { can_edit: event.target.value === 'edit' }, true)} className="ml-2 rounded border border-slate-300 p-2">
            {share.can_edit === null && <option value="legacy">Habituel</option>}
            <option value="read">Lecture seule</option><option value="edit">Modification autorisée</option>
          </select></label>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={share.can_export !== false} disabled={!!updating}
            onChange={(event) => changeRights(share, { can_export: event.target.checked }, true)} />Export et fichiers autorisés</label>
          <button type="button" disabled={!!updating} onClick={() => removeInternal(share)} className="text-sm text-red-600">Retirer</button>
        </li>)}</ul>
        <div className="mt-3 flex justify-end gap-3 text-sm">
          {internalOffset > 0 && <button type="button" onClick={() => setInternalOffset(Math.max(0, internalOffset - 50))} className="text-primary">Précédent</button>}
          {internalNext !== null && <button type="button" onClick={() => setInternalOffset(internalNext)} className="text-primary">Suivant</button>}
        </div>
      </section>
      <ReceivedShares revision={revision} />
    </div>
  );
}
