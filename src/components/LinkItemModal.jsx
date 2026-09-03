import { useEffect, useMemo, useState } from 'react';
import { Link2, Loader2, X } from 'lucide-react';
import { api } from '../lib/api.js';

// Modale de recherche générique pour rattacher un élément existant à une fiche — traçabilité
// inverse (Procédures <-> CAPA/audits, voir procedure_capa_links/procedure_audit_links). Ne
// fait QUE choisir l'élément : c'est l'appelant (onSelect) qui décide de l'appel POST .../link-*
// et de la mise à jour de son propre état, cette modale reste indépendante du sens du lien.
export default function LinkItemModal({ title, fetchUrl, excludeIds = [], getSearchText, renderItem, onClose, onSelect }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [linkingId, setLinkingId] = useState(null);

  useEffect(() => {
    api
      .get(fetchUrl)
      .then(({ data }) => setItems(data))
      .catch(() => setError('Impossible de charger la liste.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUrl]);

  const results = useMemo(() => {
    const excluded = new Set(excludeIds);
    const query = search.trim().toLowerCase();
    return items
      .filter((item) => !excluded.has(item.id))
      .filter((item) => !query || getSearchText(item).toLowerCase().includes(query))
      .slice(0, 30);
  }, [items, excludeIds, search, getSearchText]);

  async function handleSelect(item) {
    setLinkingId(item.id);
    setError('');
    try {
      await onSelect(item);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer ce lien.');
    } finally {
      setLinkingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[85vh] w-full overflow-hidden rounded-t-xl bg-white sm:max-w-lg sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <input
            type="text"
            autoFocus
            placeholder="Rechercher par numéro ou titre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />

          {error && (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto">
            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((key) => (
                  <div key={key} className="h-14 animate-pulse rounded-md bg-slate-100" />
                ))}
              </div>
            ) : results.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">Aucun résultat.</p>
            ) : (
              results.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  disabled={linkingId === item.id}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50 disabled:opacity-60"
                >
                  {renderItem(item)}
                  {linkingId === item.id ? (
                    <Loader2 size={16} className="shrink-0 animate-spin text-slate-400" />
                  ) : (
                    <Link2 size={16} className="shrink-0 text-slate-400" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
