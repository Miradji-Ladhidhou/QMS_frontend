import { useEffect, useState } from 'react';
import { Camera, Image, Loader2, Trash2, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';

function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

async function normalizePhoto(file) {
  if (file.type === 'image/jpeg' || file.type === 'image/png') return file;
  if (!file.type.startsWith('image/')) throw new Error('Sélectionnez un fichier image.');

  let bitmap;
  let objectUrl;
  try {
    if (typeof createImageBitmap === 'function') {
      bitmap = await createImageBitmap(file);
    } else {
      objectUrl = URL.createObjectURL(file);
      bitmap = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Ce format photo ne peut pas être converti sur cet appareil.'));
        image.src = objectUrl;
      });
    }

    const scale = Math.min(1, 2400 / bitmap.width, 2400 / bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const jpeg = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Impossible de convertir cette photo.'))), 'image/jpeg', 0.86);
    });
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([jpeg], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified });
  } catch {
    throw new Error('Ce format photo ne peut pas être converti sur cet appareil. Choisissez une photo JPEG ou PNG.');
  } finally {
    bitmap?.close?.();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export default function DriveEvidencePanel({ moduleKey, recordId }) {
  const currentUser = useCurrentUser();
  const [items, setItems] = useState([]);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  async function loadEvidence() {
    setError('');
    try {
      const { data } = await api.get(`/evidence/${moduleKey}/${recordId}`);
      setItems(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de charger les photos de preuve.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvidence();
    // Component identity changes with the record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleKey, recordId]);

  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }, [preview]);

  async function uploadPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setError('La photo dépasse la limite de sélection de 25 Mo.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const photo = await normalizePhoto(file);
      if (photo.size > 10 * 1024 * 1024) throw new Error('La photo dépasse la limite de 10 Mo, même après compression.');
      const form = new FormData();
      form.append('file', photo);
      form.append('caption', caption);
      const { data } = await api.post(`/evidence/${moduleKey}/${recordId}`, form);
      setItems((current) => [...current, data]);
      setCaption('');
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Impossible d'envoyer cette photo sur Google Drive.");
    } finally {
      setUploading(false);
    }
  }

  async function openPhoto(item) {
    setError('');
    try {
      const { data } = await api.get(`/evidence/${moduleKey}/${recordId}/${item.id}/content`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      setPreview({ url, name: item.file_name });
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de lire cette photo depuis Google Drive.');
    }
  }

  async function deletePhoto(item) {
    if (!window.confirm(`Supprimer la photo « ${item.file_name} » de Google Drive ?`)) return;
    setError('');
    try {
      await api.delete(`/evidence/${moduleKey}/${recordId}/${item.id}`);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer cette photo.');
    }
  }

  return (
    <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2">
        <Image size={17} className="text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-900">Photos de preuve</h2>
        <span className="text-xs text-slate-500">({items.length}/10 · Google Drive)</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">Les photos sont stockées dans le Drive de l’entreprise; seules leurs métadonnées sont conservées dans QMS.</p>
      {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor={`evidence-caption-${recordId}`} className="mb-1 block text-xs font-medium text-slate-600">Légende (facultative)</label>
          <input
            id={`evidence-caption-${recordId}`}
            maxLength={300}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ex. Défaut constaté avant correction"
          />
        </div>
        <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 ${uploading || items.length >= 10 ? 'pointer-events-none opacity-60' : ''}`}>
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          {uploading ? 'Envoi sur Drive…' : 'Prendre ou choisir une photo'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={uploadPhoto}
            disabled={uploading || items.length >= 10}
            className="sr-only"
            aria-label="Prendre ou choisir une photo de preuve"
          />
        </label>
      </div>
      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Chargement des photos…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Aucune photo ajoutée.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2">
              <Image size={16} className="shrink-0 text-slate-400" />
              <button type="button" onClick={() => openPhoto(item)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-medium text-primary hover:underline">{item.caption || item.file_name}</span>
                <span className="text-xs text-slate-500">{item.file_name} · {formatSize(item.file_size)} · {new Date(item.created_at).toLocaleDateString('fr-FR')}</span>
              </button>
              {item.uploaded_by === currentUser?.id || currentUser?.role === 'admin' ? (
                <button type="button" onClick={() => deletePhoto(item)} aria-label={`Supprimer ${item.file_name}`} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 size={15} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {preview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label={`Photo ${preview.name}`}>
          <button type="button" onClick={() => setPreview(null)} aria-label="Fermer l’aperçu" className="absolute right-4 top-4 rounded-full bg-white p-2 text-slate-700">
            <X size={20} />
          </button>
          <img src={preview.url} alt={preview.name} className="max-h-[90vh] max-w-full rounded-lg object-contain" />
        </div>
      )}
    </section>
  );
}
