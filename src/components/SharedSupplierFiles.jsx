import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { openBlankTab } from '../lib/openInNewTab.js';

export default function SharedSupplierFiles({ id, canEdit, canExport }) {
  const [files, setFiles] = useState([]);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.get(`/suppliers/${id}`).then(({ data }) => {
      if (active) setFiles(data.documents || []);
    }).catch((err) => { if (active) setError(err.response?.data?.error || 'Impossible de charger les fichiers fournisseur.'); });
    return () => { active = false; };
  }, [id, revision]);
  async function upload(event, fileId = null) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      if (fileId) await api.put(`/suppliers/${id}/documents/${fileId}/file`, form);
      else {
        form.append('title', file.name);
        form.append('kind', 'other');
        await api.post(`/suppliers/${id}/documents`, form);
      }
      setRevision((value) => value + 1);
    } catch (err) { setError(err.response?.data?.error || 'Enregistrement du fichier impossible.'); }
    finally { setBusy(false); }
  }
  async function download(fileId) {
    const tab = openBlankTab();
    setError('');
    try {
      const { data } = await api.get(`/suppliers/${id}/documents/${fileId}/download`);
      if (tab) tab.location.href = data.url;
    } catch (err) { tab?.close(); setError(err.response?.data?.error || 'Téléchargement impossible.'); }
  }
  return <section className="space-y-3 rounded border border-slate-200 p-3">
    <h4 className="font-medium">Pièces jointes fournisseur</h4>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {files.map((file) => <div key={file.id} className="flex flex-wrap items-center gap-3 text-sm">
      <span>{file.title}</span>
      {canExport && file.has_file && <button type="button" disabled={busy} onClick={() => download(file.id)} className="text-primary">Télécharger</button>}
      {canEdit && <label className="cursor-pointer text-primary">Remplacer le fichier<input type="file" className="hidden" disabled={busy} onChange={(event) => upload(event, file.id)} /></label>}
    </div>)}
    {canEdit && <label className="inline-block cursor-pointer rounded border px-3 py-2 text-sm">Ajouter une pièce jointe<input type="file" className="hidden" disabled={busy} onChange={upload} /></label>}
  </section>;
}
