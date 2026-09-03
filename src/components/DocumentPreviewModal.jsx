import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { api } from '../lib/api.js';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);

function getExtension(fileName) {
  const match = /\.([a-z0-9]+)$/i.exec(fileName || '');
  return match ? match[1].toLowerCase() : '';
}

export default function DocumentPreviewModal({ documentId, fileName, title, onClose }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/documents/${documentId}/preview-url`)
      .then(({ data }) => {
        if (cancelled) return;
        if (data.previewable) setUrl(data.url);
        else setError("Aperçu indisponible pour ce type de fichier.");
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger l'aperçu.");
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const isImage = IMAGE_EXTENSIONS.has(getExtension(fileName));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 p-4">
          <h2 className="truncate text-sm font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-100">
          {error ? (
            <p className="p-6 text-center text-sm text-red-600">{error}</p>
          ) : !url ? (
            <Loader2 size={24} className="animate-spin text-slate-400" />
          ) : isImage ? (
            <img src={url} alt={title} className="max-h-full max-w-full object-contain" />
          ) : (
            <iframe src={url} title={title} className="h-full w-full border-0" />
          )}
        </div>
      </div>
    </div>
  );
}
