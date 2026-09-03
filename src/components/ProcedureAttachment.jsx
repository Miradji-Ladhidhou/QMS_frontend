import { useState } from 'react';
import { Loader2, Paperclip, Trash2, Upload } from 'lucide-react';
import { api } from '../lib/api.js';
import { openBlankTab } from '../lib/openInNewTab.js';

// Pièce jointe EN COMPLÉMENT du contenu structuré d'une version (voir schema.sql) — le document
// officiel déjà mis en forme que le client possédait, joint tel quel plutôt que retranscrit
// dans l'éditeur. editable : false sur la version en vigueur (lecture seule, téléchargement
// uniquement) ; true sur le brouillon en cours, pour l'auteur/admin/manager (backend applique
// la même garde : brouillon uniquement).
export default function ProcedureAttachment({ procedureId, version, editable, onChanged }) {
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    const tab = openBlankTab();
    setError('');
    setDownloading(true);
    try {
      const { data } = await api.get(`/procedures/${procedureId}/versions/${version.id}/attachment`);
      if (tab) tab.location.href = data.url;
    } catch (err) {
      tab?.close();
      setError(err.response?.data?.error || 'Impossible de récupérer la pièce jointe.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/procedures/${procedureId}/versions/${version.id}/attachment`, form);
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'ajouter la pièce jointe.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setError('');
    setRemoving(true);
    try {
      await api.delete(`/procedures/${procedureId}/versions/${version.id}/attachment`);
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de retirer la pièce jointe.');
    } finally {
      setRemoving(false);
    }
  }

  if (!version.attachment_file_name) {
    if (!editable) return null;
    return (
      <div>
        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? 'Envoi...' : 'Joindre un fichier'}
          <input type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-sm">
        <Paperclip size={16} className="shrink-0 text-slate-400" />
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="font-medium text-primary hover:text-primary-700 disabled:opacity-60"
        >
          {downloading ? 'Préparation...' : version.attachment_file_name}
        </button>
        {editable && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            aria-label="Retirer la pièce jointe"
            className="text-slate-400 hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
