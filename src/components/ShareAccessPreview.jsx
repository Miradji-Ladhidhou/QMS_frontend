import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function ShareAccessPreview({ recipientType, subjectId, items, canEdit, canExport }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const payload = JSON.stringify({
    recipient_type: recipientType, subject_id: subjectId, can_edit: canEdit, can_export: canExport,
    items: items.map(({ resource_type, resource_id }) => ({ resource_type, resource_id })),
  });
  useEffect(() => {
    setPreview(null);
    setError('');
    if (recipientType === 'guest' || !subjectId || !items.length) { setLoading(false); return; }
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      api.post('/shares/bundles/preview', JSON.parse(payload), { signal: controller.signal })
        .then(({ data }) => { if (active) setPreview(data); })
        .catch((err) => { if (active) setError(err.response?.data?.error || 'Impossible de vérifier l’effet du partage.'); })
        .finally(() => { if (active) setLoading(false); });
    }, 300);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [payload, recipientType, subjectId, items.length]);

  if (recipientType === 'guest') return <p className="rounded bg-blue-50 p-3 text-sm text-blue-800">
    Sans compte : seules les fiches sélectionnées seront accessibles via le lien et le code email.
    Aucun accès au menu ni au reste des modules ne sera accordé.
  </p>;
  if (!subjectId || !items.length) return <p className="text-xs text-slate-500">Sélectionnez un destinataire et des éléments pour voir l’effet du partage.</p>;
  return <section aria-label="Aperçu des droits du partage" className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
    <h3 className="font-semibold text-slate-900">Accès habituel et effet du partage</h3>
    <p className="text-xs text-slate-600">L’accès habituel indiqué concerne le module. Les catégories, droits du rôle et workflows continuent de contrôler ses fiches.
      Le partage proposé ne modifie pas les paramètres de navigation.</p>
    {loading && <p role="status">Vérification des droits...</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {preview && !preview.recipients.length && <p>Aucun membre actuel de ce rôle. Le partage s’appliquera aux membres qui auront ce rôle.</p>}
    {preview && <div className="max-h-80 space-y-3 overflow-y-auto">{preview.recipients.map((recipient) =>
      <div key={recipient.id}>
        <h4 className="font-medium">{recipient.name || 'Membre'} · {recipient.role === 'manager' ? 'Gestionnaire' : 'Membre'}</h4>
        <ul className="mt-1 space-y-2">{recipient.items.map((item) =>
          <li key={`${item.resource_type}:${item.resource_id}`} className="rounded border border-blue-100 bg-white p-2">
            <p className="font-medium">{item.label}</p>
            <p>Accès habituel : {item.module_visible ? 'module accessible (selon les droits des fiches)' : 'module masqué, accès normal bloqué'}.</p>
            {!item.module_enabled ? <p className="text-red-700">Module exclu du forfait : le partage ne le réactive pas.</p> : <>
              <p>Avec ce partage : {item.proposed.can_edit ? 'lecture et modification' : 'lecture seule'} · {item.proposed.can_export ? 'export et téléchargement autorisés' : 'export et téléchargement interdits'}.</p>
              {!item.module_visible && <p className="text-xs text-slate-600">Accessible dans « Mes partages reçus » uniquement, sans ouvrir le reste du module.</p>}
              {item.duplicate && <p className="text-slate-600">Ce partage existe déjà avec les mêmes droits : aucun droit supplémentaire.</p>}
              {item.limited_by_other_share && <p className="text-amber-800">Un autre partage applicable reste plus restrictif et limite les droits proposés.</p>}
              {!item.duplicate && (!canEdit || !canExport) && <p className="text-amber-800">
                Ce partage interdira {!canEdit && !canExport ? 'la modification et l’export' : !canEdit ? 'la modification' : 'l’export'} de cet élément, même si les droits habituels les permettent.
              </p>}
            </>}
          </li>)}</ul>
      </div>)}</div>}
    <p className="text-xs text-slate-600">Retirer un partage rétablit les droits habituels et les autres partages applicables. Les validations et suppressions ne sont pas accordées ici.</p>
  </section>;
}
