import { useEffect, useRef, useState } from 'react';
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

function EvidencePhotoCard({ item, moduleKey, recordId, canDelete, selected, onToggleSelection, onOpen, onDelete }) {
  const imageRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let objectUrl;

    async function loadThumbnail() {
      setLoading(true);
      try {
        const { data } = await api.get(`/evidence/${moduleKey}/${recordId}/${item.id}/content`, {
          responseType: 'blob',
          signal: controller.signal,
        });
        if (!active) return;
        objectUrl = URL.createObjectURL(data);
        setImageUrl(objectUrl);
      } catch (error) {
        if (active && error.code !== 'ERR_CANCELED') setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    const target = imageRef.current;
    if (!target) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      loadThumbnail();
    } else {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          loadThumbnail();
        }
      }, { rootMargin: '0px 120px' });
      observer.observe(target);
      return () => {
        active = false;
        observer.disconnect();
        controller.abort();
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }

    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.id, moduleKey, recordId]);

  return (
    <li className="w-64 shrink-0 snap-start">
      <div className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
        <button
          ref={imageRef}
          type="button"
          onClick={() => imageUrl ? onOpen(item, imageUrl) : onOpen(item)}
          className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100 text-left focus-visible:outline-primary"
          aria-label={`Afficher la photo ${item.caption || item.file_name}`}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={item.caption || item.file_name} loading="lazy" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-500">
              {loading ? <Loader2 size={22} className="animate-spin" /> : <Image size={25} />}
              <span className="text-xs">{loadError ? 'Aperçu indisponible' : loading ? 'Chargement…' : 'Charger la photo'}</span>
            </span>
          )}
        </button>
        {canDelete && (
          <div className="absolute inset-x-2 top-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onToggleSelection(item.id)}
              aria-pressed={selected}
              aria-label={`${selected ? 'Désélectionner' : 'Sélectionner'} ${item.caption || item.file_name}`}
              className={`flex h-8 w-8 items-center justify-center rounded-md border text-sm font-bold shadow ${selected ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white/95 text-slate-700 hover:bg-white'}`}
            >
              {selected ? '✓' : ''}
            </button>
            <button
              type="button"
              onClick={() => onDelete(item)}
              aria-label={`Supprimer ${item.file_name}`}
              className="rounded-full bg-white/95 p-2 text-slate-600 shadow hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>
      <button type="button" onClick={() => imageUrl ? onOpen(item, imageUrl) : onOpen(item)} className="mt-2 block w-full min-w-0 text-left">
        <span className="block truncate text-sm font-medium text-slate-800">{item.caption || item.file_name}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">
          {formatSize(item.file_size)} · {new Date(item.created_at).toLocaleDateString('fr-FR')}
        </span>
      </button>
    </li>
  );
}

export default function DriveEvidencePanel({
  moduleKey,
  recordId,
  title = 'Photos de preuve',
  captionPlaceholder = 'Ex. Défaut constaté avant correction',
}) {
  const currentUser = useCurrentUser();
  const cameraInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deletingSelected, setDeletingSelected] = useState(false);

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
    setSelectedIds(new Set());
    loadEvidence();
    // Component identity changes with the record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleKey, recordId]);

  useEffect(() => () => {
    if (preview?.owned) URL.revokeObjectURL(preview.url);
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
      setPreview({ url, name: item.file_name, owned: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de lire cette photo depuis Google Drive.');
    }
  }

  function showPhoto(item, imageUrl) {
    if (imageUrl) {
      setPreview({ url: imageUrl, name: item.file_name, owned: false });
    } else {
      openPhoto(item);
    }
  }

  async function deletePhoto(item) {
    if (!window.confirm(`Supprimer la photo « ${item.file_name} » de Google Drive ?`)) return;
    setError('');
    try {
      await api.delete(`/evidence/${moduleKey}/${recordId}/${item.id}`);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer cette photo.');
    }
  }

  function togglePhotoSelection(itemId) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  async function deleteSelectedPhotos() {
    const selectedItems = items.filter((item) => selectedIds.has(item.id));
    if (selectedItems.length === 0 || deletingSelected) return;
    if (!window.confirm(`Supprimer ${selectedItems.length} photo${selectedItems.length > 1 ? 's' : ''} sélectionnée${selectedItems.length > 1 ? 's' : ''} de Google Drive ?`)) return;

    setDeletingSelected(true);
    setError('');
    const deletedIds = new Set();
    const failures = [];
    for (const item of selectedItems) {
      try {
        await api.delete(`/evidence/${moduleKey}/${recordId}/${item.id}`);
        deletedIds.add(item.id);
      } catch (err) {
        failures.push(`${item.file_name} : ${err.response?.data?.error || 'suppression impossible'}`);
      }
    }

    setItems((current) => current.filter((item) => !deletedIds.has(item.id)));
    setSelectedIds((current) => new Set([...current].filter((id) => !deletedIds.has(id))));
    if (failures.length > 0) {
      setError(`Certaines photos n’ont pas pu être supprimées : ${failures.join(' · ')}`);
    }
    setDeletingSelected(false);
  }

  return (
    <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2">
        <Image size={17} className="text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
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
            placeholder={captionPlaceholder}
          />
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading || items.length >= 10}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            {uploading ? 'Envoi sur Drive…' : 'Prendre une photo'}
          </button>
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={uploading || items.length >= 10}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Image size={16} />
            Choisir une photo
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={uploadPhoto}
            disabled={uploading || items.length >= 10}
            className="hidden"
            aria-label="Prendre une photo de preuve"
          />
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={uploadPhoto}
            disabled={uploading || items.length >= 10}
            className="hidden"
            aria-label="Choisir une photo de preuve"
          />
        </div>
      </div>
      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Chargement des photos…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Aucune photo ajoutée.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-600" aria-live="polite">
              {selectedIds.size > 0 ? `${selectedIds.size} photo${selectedIds.size > 1 ? 's' : ''} sélectionnée${selectedIds.size > 1 ? 's' : ''}` : 'Sélectionnez des photos pour les supprimer en lot.'}
            </p>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <button type="button" onClick={() => setSelectedIds(new Set())} disabled={deletingSelected} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                    Tout désélectionner
                  </button>
                  <button type="button" onClick={deleteSelectedPhotos} disabled={deletingSelected} className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60">
                    {deletingSelected ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    {deletingSelected ? 'Suppression…' : `Supprimer (${selectedIds.size})`}
                  </button>
                </>
              )}
            </div>
          </div>
          <ul className="mt-2 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3">
          {items.map((item) => (
            <EvidencePhotoCard
              key={item.id}
              item={item}
              moduleKey={moduleKey}
              recordId={recordId}
              canDelete={item.uploaded_by === currentUser?.id || currentUser?.role === 'admin'}
              selected={selectedIds.has(item.id)}
              onToggleSelection={togglePhotoSelection}
              onOpen={showPhoto}
              onDelete={deletePhoto}
            />
          ))}
          </ul>
        </>
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
