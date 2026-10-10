import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function SharedProcedureEditor({ id }) {
  const [versions, setVersions] = useState([]);
  const [versionId, setVersionId] = useState('');
  const [content, setContent] = useState('{}');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api.get(`/procedures/${id}`).then(({ data }) => {
      if (active) setVersions(data.versions || []);
    }).catch((err) => { if (active) setError(err.response?.data?.error || 'Impossible de charger les versions.'); });
    return () => { active = false; };
  }, [id]);
  function select(value) {
    setVersionId(value);
    setContent(JSON.stringify(versions.find((version) => version.id === value)?.content || {}, null, 2));
  }
  async function save(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    let parsed;
    try { parsed = JSON.parse(content); }
    catch { setError('Le contenu doit être un objet JSON valide.'); return; }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setError('Le contenu doit être un objet JSON.'); return;
    }
    setBusy(true);
    try {
      const { data } = versionId
        ? await api.put(`/procedures/${id}/versions/${versionId}`, { content: parsed })
        : await api.post(`/procedures/${id}/versions`, { content: parsed });
      setVersions((previous) => [data, ...previous.filter((version) => version.id !== data.id)]);
      setVersionId(data.id);
      setMessage('Brouillon enregistré. La validation reste soumise au workflow habituel.');
    } catch (err) { setError(err.response?.data?.error || 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  }
  async function attach(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !versionId) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/procedures/${id}/versions/${versionId}/attachment`, form);
      setMessage('Pièce jointe du brouillon enregistrée.');
    } catch (err) { setError(err.response?.data?.error || 'Enregistrement du fichier impossible.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className="space-y-3 rounded border border-slate-200 p-3">
    <h4 className="font-medium">Modifier un brouillon de procédure</h4>
    <label className="block text-sm">Version
      <select value={versionId} onChange={(event) => select(event.target.value)} disabled={busy} className="mt-1 w-full rounded border p-2">
        <option value="">Créer une nouvelle version brouillon</option>
        {versions.filter((version) => version.status === 'draft').map((version) => <option key={version.id} value={version.id}>{version.version}</option>)}
      </select>
    </label>
    <label className="block text-sm">Contenu structuré (JSON)
      <textarea value={content} onChange={(event) => setContent(event.target.value)} disabled={busy} rows={10} className="mt-1 w-full rounded border p-2 font-mono" />
    </label>
    <div className="flex flex-wrap gap-3">
      <button disabled={busy} className="rounded bg-primary px-3 py-2 text-sm text-white">Enregistrer le brouillon</button>
      {versionId && <label className="cursor-pointer rounded border px-3 py-2 text-sm">Remplacer la pièce jointe<input type="file" className="hidden" disabled={busy} onChange={attach} /></label>}
    </div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
  </form>;
}
