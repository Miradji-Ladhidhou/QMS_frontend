import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Columns3,
  FileSpreadsheet,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  TableProperties,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { isManagerRole } from '../lib/roles.js';
import FolderTile from './FolderTile.jsx';

function sanitizeFilename(name) {
  return (name || 'registre').toLowerCase().replace(/[^a-z0-9à-ÿ_-]/gi, '-');
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '—';
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [y, m, d] = dateStr.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

export default function DocumentRegisters({ selectedRegisterId, onSelectRegisterId }) {
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);

  const [registers, setRegisters] = useState([]);
  const [activeRegister, setActiveRegister] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [importingXlsx, setImportingXlsx] = useState(false);
  const importInput = useRef(null);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Modales
  const [isNewRegisterOpen, setIsNewRegisterOpen] = useState(false);
  const [isEditRegisterOpen, setIsEditRegisterOpen] = useState(false);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [rowModal, setRowModal] = useState(null); // null | 'new' | row object

  // Tri du tableau
  const [sortColId, setSortColId] = useState('line');
  const [sortDirection, setSortDirection] = useState('asc');

  // Chargement de la liste des registres
  async function loadRegisters(ignoreSelection = false) {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/registers');
      setRegisters(data || []);
      if (!ignoreSelection && selectedRegisterId && data?.some((r) => r.id === selectedRegisterId)) {
        setCurrentFolder(data.find((r) => r.id === selectedRegisterId).folder || null);
        loadRegisterDetail(selectedRegisterId);
      } else {
        setActiveRegister(null);
      }
    } catch {
      setError('Impossible de charger les registres.');
    } finally {
      setLoading(false);
    }
  }

  // Chargement du registre actif et de ses lignes
  async function loadRegisterDetail(id) {
    if (!id) return;
    setSearchFilter('');
    setImportedCount(0);
    setLoadingRows(true);
    try {
      const { data } = await api.get(`/registers/${id}`);
      setActiveRegister(data);
      if (onSelectRegisterId) onSelectRegisterId(id);
    } catch {
      setError('Impossible de charger le registre sélectionné.');
    } finally {
      setLoadingRows(false);
    }
  }

  useEffect(() => {
    loadRegisters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedRegisterId && (!activeRegister || activeRegister.id !== selectedRegisterId)) {
      loadRegisterDetail(selectedRegisterId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegisterId]);

  // Export Excel identique au tableur historique
  async function handleExportXlsx() {
    if (!activeRegister) return;
    setExportingXlsx(true);
    try {
      const response = await api.get(`/registers/${activeRegister.id}/export-xlsx`, {
        responseType: 'blob',
      });
      const filename = `${sanitizeFilename(activeRegister.title)}-tableur-registre-${new Date().toISOString().slice(0, 10)}.xlsx`;
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      setError("Impossible d'exporter le registre vers Excel.");
    } finally {
      setExportingXlsx(false);
    }
  }

  async function handleImportXlsx(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !activeRegister) return;
    setImportingXlsx(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(`/registers/${activeRegister.id}/import`, formData);
      await loadRegisterDetail(activeRegister.id);
      setImportedCount(data.imported);
      setRegisters((prev) => prev.map((register) => register.id === activeRegister.id
        ? { ...register, rows_count: (register.rows_count || 0) + data.imported } : register));
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'importer le fichier Excel.");
    } finally {
      setImportingXlsx(false);
    }
  }

  // Suppression d'une ligne
  async function handleDeleteRow(rowId) {
    if (!window.confirm('Supprimer cette entrée du registre ?')) return;
    try {
      await api.delete(`/registers/${activeRegister.id}/rows/${rowId}`);
      setActiveRegister((prev) => ({
        ...prev,
        rows: (prev.rows || []).filter((r) => r.id !== rowId),
        rows_count: Math.max(0, (prev.rows_count || 1) - 1),
      }));
    } catch {
      setError('Impossible de supprimer la ligne.');
    }
  }

  // Tri dynamique
  function handleToggleSort(colId) {
    if (sortColId === colId) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColId(colId);
      setSortDirection('asc');
    }
  }

  const columns = activeRegister?.columns || [];
  const rows = activeRegister?.rows || [];

  // Filtrage par texte
  const filteredRows = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const dataObj = r.data || {};
      return Object.values(dataObj).some((val) => String(val || '').toLowerCase().includes(q));
    });
  }, [rows, searchFilter]);

  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    if (sortColId === 'line') {
      if (sortDirection === 'desc') list.reverse();
      return list;
    }

    list.sort((a, b) => {
      const valA = a.data?.[sortColId];
      const valB = b.data?.[sortColId];

      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      const numA = Number(valA);
      const numB = Number(valB);
      if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      const cmp = String(valA).localeCompare(String(valB), 'fr', { numeric: true });
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [filteredRows, sortColId, sortDirection]);

  // Suppression du registre courant
  async function handleDeleteRegister() {
    if (!activeRegister) return;
    if (
      !window.confirm(
        `Supprimer définitivement le registre « ${activeRegister.title} » et toutes ses entrées ?`
      )
    ) {
      return;
    }
    try {
      await api.delete(`/registers/${activeRegister.id}`);
      setActiveRegister(null);
      onSelectRegisterId?.(null);
      await loadRegisters(true);
    } catch {
      setError('Impossible de supprimer ce registre.');
    }
  }

  if (loading) {
    return (
      <div className="mt-4 space-y-3">
        {[0, 1].map((key) => (
          <div key={key} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
    );
  }

  const folders = [...new Set(registers.map((register) => register.folder).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
  const visibleRegisters = registers.filter((register) => (register.folder || null) === currentFolder);

  function openFolder(folder) {
    setCurrentFolder(folder);
    setActiveRegister(null);
    onSelectRegisterId?.(null);
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="p-1 hover:text-red-800">
            <X size={16} />
          </button>
        </div>
      )}
      {importedCount > 0 && (
        <div role="status" className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {importedCount} ligne{importedCount > 1 ? 's' : ''} importée{importedCount > 1 ? 's' : ''}.
          <button type="button" onClick={() => setImportedCount(0)} aria-label="Fermer la confirmation" className="p-1"><X size={16} /></button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <button type="button" onClick={() => openFolder(null)} className="font-medium text-primary hover:underline">Registres</button>
          {currentFolder && <><span className="text-slate-400">/</span><span className="text-slate-700">{currentFolder}</span></>}
          {activeRegister && <><span className="text-slate-400">/</span><span className="text-slate-700">{activeRegister.title}</span></>}
        </div>
        {canManage && !activeRegister && <button type="button" onClick={() => setIsNewRegisterOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"><Plus size={16} /> Nouveau registre</button>}
      </div>

      {!activeRegister && <>
        {!currentFolder && folders.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {folders.map((folder) => <FolderTile key={folder} folder={{ name: folder }} canManage={false} onOpen={() => openFolder(folder)} />)}
        </div>}
        {visibleRegisters.length > 0 && <div className="overflow-hidden rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
          {visibleRegisters.map((register) => <button key={register.id} type="button" onClick={() => loadRegisterDetail(register.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"><TableProperties size={19} className="text-emerald-700" /><span className="flex-1 text-sm font-medium text-slate-800">{register.title}</span><span className="text-xs text-slate-500">{register.rows_count || 0} entrée(s)</span></button>)}
        </div>}
      </>}

      {/* Contenu principal du registre sélectionné */}
      {activeRegister ? (
        <div className="space-y-3">
          {/* Barre d'outils et actions du registre */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{activeRegister.title}</h2>
                {activeRegister.description && (
                  <p className="text-sm text-slate-500">{activeRegister.description}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {canManage && <>
                  <input ref={importInput} type="file" accept=".xlsx" onChange={handleImportXlsx} className="hidden" aria-label="Fichier Excel à importer" />
                  <button type="button" disabled={importingXlsx} onClick={() => importInput.current?.click()} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Upload size={16} />{importingXlsx ? 'Import en cours…' : 'Importer'}</button>
                </>}
              <button
                type="button"
                onClick={handleExportXlsx}
                disabled={exportingXlsx}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                title="Exporter le registre vers Excel"
              >
                <FileSpreadsheet size={16} />
                <span>{exportingXlsx ? 'Export en cours…' : 'Exporter'}</span>
              </button>

              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={() => setRowModal('new')}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                  >
                    <Plus size={15} />
                    <span>Ajouter une ligne</span>
                  </button>
                  <details className="relative">
                    <summary title="Options du registre" className="flex cursor-pointer list-none items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><MoreHorizontal size={17} /> Options</summary>
                    <div className="absolute right-0 z-30 mt-1 w-52 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                      <button type="button" onClick={(event) => { event.currentTarget.closest('details').open = false; setIsManageColumnsOpen(true); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"><Columns3 size={16} /> Gérer les colonnes</button>
                      <button type="button" onClick={(event) => { event.currentTarget.closest('details').open = false; setIsEditRegisterOpen(true); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"><Pencil size={16} /> Modifier le registre</button>
                      <button type="button" onClick={(event) => { event.currentTarget.closest('details').open = false; handleDeleteRegister(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"><Trash2 size={16} /> Supprimer le registre</button>
                    </div>
                  </details>
                </>
              )}
            </div>
          </div>

          <div className="relative max-w-sm">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="search" placeholder="Rechercher une entrée..." value={searchFilter} onChange={(event) => setSearchFilter(event.target.value)} className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              {loadingRows ? (
                <p className="py-20 text-center text-sm text-slate-400">Chargement des entrées...</p>
              ) : columns.length === 0 ? (
                <div className="py-20 text-center">
                  <Columns3 size={36} className="mx-auto text-slate-300" />
                  <p className="mt-2 text-sm font-medium text-slate-700">Aucune colonne définie dans ce registre.</p>
                  <p className="mt-1 text-xs text-slate-400">Configurez les colonnes pour commencer à saisir vos données.</p>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setIsManageColumnsOpen(true)}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-primary-700"
                    >
                      <Plus size={14} />
                      Ajouter des colonnes
                    </button>
                  )}
                </div>
              ) : (
                <table className={`w-full text-sm ${columns.length > 4 ? 'min-w-[700px]' : ''}`}>
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                      <th className="sticky top-0 z-20 w-12 bg-slate-50 px-3 py-3 text-center font-semibold text-slate-600">
                        <button
                          type="button"
                          onClick={() => handleToggleSort('line')}
                          className="mx-auto flex items-center justify-center gap-0.5 text-slate-600 hover:text-primary"
                          title="Trier par ligne"
                        >
                          <span>Ligne</span>
                          {sortColId === 'line' ? (
                            sortDirection === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />
                          ) : (
                            <ChevronsUpDown size={12} className="text-slate-400" />
                          )}
                        </button>
                      </th>

                      {columns.map((col) => (
                        <th
                          key={col.id}
                          className="sticky top-0 z-20 bg-slate-50 px-3 py-3 text-left font-semibold"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleSort(col.id)}
                            className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-primary"
                            title={`Trier par ${col.name}`}
                          >
                            <span>{col.name}</span>
                            {col.is_planning && (
                              <span
                                className="inline-flex items-center gap-0.5 rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800"
                                title="Suivi dans le planning unifié"
                              >
                                <Calendar size={10} />
                                Planning
                              </span>
                            )}
                            {sortColId === col.id ? (
                              sortDirection === 'asc' ? <ChevronUp size={13} className="text-primary" /> : <ChevronDown size={13} className="text-primary" />
                            ) : (
                              <ChevronsUpDown size={13} className="text-slate-400" />
                            )}
                          </button>
                        </th>
                      ))}

                      {canManage && (
                        <th className="sticky top-0 z-20 bg-slate-50 px-3 py-3 text-center font-semibold text-slate-600">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {sortedRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={columns.length + (canManage ? 2 : 1)}
                          className="py-10 text-center text-sm text-slate-500"
                        >
                          {searchFilter ? 'Aucune entrée ne correspond à votre recherche.' : 'Aucune entrée dans ce registre.'}
                          {canManage && !searchFilter && (
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={() => setRowModal('new')}
                                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                              >
                                <Plus size={14} />
                                Ajouter la première ligne
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      sortedRows.map((rowItem, rowIdx) => (
                        <tr key={rowItem.id} className="hover:bg-slate-50">
                          {/* Numéro de ligne */}
                          <td className="w-12 px-3 py-3 text-center text-xs text-slate-400">
                            {rowIdx + 1}
                          </td>

                          {/* Données des colonnes */}
                          {columns.map((col) => {
                            const val = rowItem.data?.[col.id];
                            const isDateCol = col.type === 'date';
                            const isNumCol = col.type === 'number';

                            return (
                              <td
                                key={col.id}
                                className={`px-3 py-3 text-slate-800 ${
                                  isNumCol ? 'text-right font-mono font-medium' : isDateCol ? 'text-center font-mono' : ''
                                }`}
                              >
                                {isDateCol ? (
                                  <span className={col.is_planning && val ? 'font-medium text-teal-900' : ''}>
                                    {formatDateDisplay(val)}
                                  </span>
                                ) : isNumCol ? (
                                  val !== null && val !== undefined && val !== '' ? (
                                    Number(val).toLocaleString('fr-FR')
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )
                                ) : col.type === 'select' ? (
                                  val ? (
                                    <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                      {val}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )
                                ) : (
                                  val || <span className="text-slate-300">—</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Actions ligne */}
                          {canManage && (
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setRowModal(rowItem)}
                                  aria-label="Modifier la ligne"
                                  title="Modifier cette entrée"
                                  className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-primary"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(rowItem.id)}
                                  aria-label="Supprimer la ligne"
                                  title="Supprimer cette entrée"
                                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-700">
                  {sortedRows.length} entrée{sortedRows.length > 1 ? 's' : ''}
                  {searchFilter && ` trouvée(s) sur ${rows.length}`}
                </span>
                <span>·</span>
                <span>{columns.length} colonne{columns.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>
      ) : registers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <TableProperties size={36} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">Aucun registre configuré</p>
          <p className="mt-1 text-xs text-slate-500">
            Créez votre premier registre personnalisé pour gérer vos exigences réglementaires, dérogations ou suivis qualité.
          </p>
          {canManage && (
            <button
              type="button"
              onClick={() => setIsNewRegisterOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Plus size={16} />
              Nouveau registre
            </button>
          )}
        </div>
      ) : null}

      {/* Modale création nouveau registre */}
      {isNewRegisterOpen && (
        <RegisterFormModal
          folders={folders}
          initialFolder={currentFolder}
          onClose={() => setIsNewRegisterOpen(false)}
          onSaved={(newReg) => {
            setIsNewRegisterOpen(false);
            setRegisters((prev) => [newReg, ...prev]);
            setCurrentFolder(newReg.folder || null);
            loadRegisterDetail(newReg.id);
          }}
        />
      )}

      {/* Modale édition registre */}
      {isEditRegisterOpen && activeRegister && (
        <RegisterFormModal
          register={activeRegister}
          folders={folders}
          onClose={() => setIsEditRegisterOpen(false)}
          onSaved={(updated) => {
            setIsEditRegisterOpen(false);
            setCurrentFolder(updated.folder || null);
            setActiveRegister((prev) => ({ ...prev, title: updated.title, description: updated.description, folder: updated.folder }));
            setRegisters((prev) =>
              prev.map((r) => (r.id === updated.id ? { ...r, title: updated.title, description: updated.description, folder: updated.folder } : r))
            );
          }}
        />
      )}

      {/* Modale gestion des colonnes */}
      {isManageColumnsOpen && activeRegister && (
        <ManageColumnsModal
          register={activeRegister}
          onClose={() => setIsManageColumnsOpen(false)}
          onSaved={(updatedColumns) => {
            setIsManageColumnsOpen(false);
            setActiveRegister((prev) => ({ ...prev, columns: updatedColumns }));
            loadRegisterDetail(activeRegister.id);
          }}
        />
      )}

      {/* Modale ajout / édition de ligne */}
      {rowModal && activeRegister && (
        <RegisterRowModal
          register={activeRegister}
          row={rowModal === 'new' ? null : rowModal}
          onClose={() => setRowModal(null)}
          onSaved={(savedRow, isEditing) => {
            setRowModal(null);
            setActiveRegister((prev) => {
              const currentRows = prev.rows || [];
              const updatedRows = isEditing
                ? currentRows.map((r) => (r.id === savedRow.id ? savedRow : r))
                : [...currentRows, savedRow];
              return {
                ...prev,
                rows: updatedRows,
                rows_count: isEditing ? prev.rows_count : (prev.rows_count || 0) + 1,
              };
            });
          }}
        />
      )}
    </div>
  );
}

// Formulaire création / modification de registre
function RegisterFormModal({ register, folders = [], initialFolder, onClose, onSaved }) {
  const isEditing = Boolean(register);
  const [title, setTitle] = useState(register?.title || '');
  const [description, setDescription] = useState(register?.description || '');
  const [folder, setFolder] = useState(register?.folder || initialFolder || '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Le titre est requis.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const response = isEditing
        ? await api.patch(`/registers/${register.id}`, { title: title.trim(), description: description.trim() || null, folder: folder.trim() || null })
        : await api.post('/registers', { title: title.trim(), description: description.trim() || null, folder: folder.trim() || null });
      onSaved(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer le registre.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEditing ? 'Modifier le registre' : 'Nouveau registre'}
          </h2>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Titre du registre</label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Registre des exigences légales, Registre des dérogations..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description (optionnelle)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex : Suivi périodique des textes réglementaires applicables..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label htmlFor="register-folder" className="mb-1 block text-sm font-medium text-slate-700">Dossier (optionnel)</label>
            <input id="register-folder" list="register-folders" value={folder} maxLength={120} onChange={(event) => setFolder(event.target.value)} placeholder="Choisir ou créer un dossier" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <datalist id="register-folders">{folders.map((name) => <option key={name} value={name} />)}</datalist>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modale de gestion des colonnes d'un registre
function ManageColumnsModal({ register, onClose, onSaved }) {
  const [columns, setColumns] = useState(register.columns || []);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Nouvelle colonne
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState('text');
  const [newColIsPlanning, setNewColIsPlanning] = useState(false);
  const [newColOptions, setNewColOptions] = useState('');

  function handleAddColumn(e) {
    e.preventDefault();
    const name = newColName.trim();
    if (!name) return;

    const id = `col_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newCol = {
      id,
      name,
      type: newColType,
      is_planning: newColType === 'date' ? newColIsPlanning : false,
      options:
        newColType === 'select'
          ? newColOptions
              .split(',')
              .map((o) => o.trim())
              .filter(Boolean)
          : undefined,
    };

    setColumns((prev) => [...prev, newCol]);
    setNewColName('');
    setNewColType('text');
    setNewColIsPlanning(false);
    setNewColOptions('');
  }

  function handleRemoveColumn(id) {
    if (columns.length <= 1) {
      alert('Un registre doit contenir au moins une colonne.');
      return;
    }
    setColumns((prev) => prev.filter((c) => c.id !== id));
  }

  function handleTogglePlanning(id) {
    setColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_planning: !c.is_planning } : c))
    );
  }

  async function handleSave() {
    setError('');
    setSubmitting(true);
    try {
      const response = await api.patch(`/registers/${register.id}`, { columns });
      onSaved(response.data.columns);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer les colonnes.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Gérer les colonnes</h2>
            <p className="text-xs text-slate-500">{register.title}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {/* Colonnes actuelles */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Colonnes existantes</label>
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {columns.map((col, index) => (
              <div key={col.id} className="flex items-center justify-between gap-3 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 font-mono text-[10px] text-slate-500">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{col.name}</p>
                    <p className="text-[11px] text-slate-400">
                      Type : {col.type === 'text' ? 'Texte' : col.type === 'number' ? 'Nombre' : col.type === 'date' ? 'Date' : 'Sélection'}
                      {col.options && ` (${col.options.join(', ')})`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {col.type === 'date' && (
                    <button
                      type="button"
                      onClick={() => handleTogglePlanning(col.id)}
                      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                        col.is_planning
                          ? 'border border-teal-300 bg-teal-50 text-teal-800'
                          : 'border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                      title="Activer ou désactiver le suivi de cette date dans le planning"
                    >
                      <Calendar size={12} />
                      {col.is_planning ? 'Suivi planning activé' : 'Activer planning'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveColumn(col.id)}
                    className="p-1 text-slate-400 hover:text-red-600"
                    title="Supprimer la colonne"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formulaire ajout de colonne */}
        <form onSubmit={handleAddColumn} className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-3">
          <p className="mb-2 text-xs font-semibold text-slate-700">+ Ajouter une nouvelle colonne</p>
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600">Nom de la colonne</label>
              <input
                type="text"
                required
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="Ex: Date de révision, Organisme, Statut..."
                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600">Type de donnée</label>
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
                >
                  <option value="text">Texte</option>
                  <option value="number">Nombre</option>
                  <option value="date">Date</option>
                  <option value="select">Sélection / Statut</option>
                </select>
              </div>

              {newColType === 'date' && (
                <div className="flex items-center gap-2 pt-4">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={newColIsPlanning}
                      onChange={(e) => setNewColIsPlanning(e.target.checked)}
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <span>Suivre dans le planning</span>
                  </label>
                </div>
              )}
            </div>

            {newColType === 'select' && (
              <div>
                <label className="block text-[11px] font-medium text-slate-600">Options possibles (séparées par des virgules)</label>
                <input
                  type="text"
                  value={newColOptions}
                  onChange={(e) => setNewColOptions(e.target.value)}
                  placeholder="Ex: En cours, Conforme, Non conforme, Clôturé"
                  className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>
            )}

            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
            >
              <Plus size={13} />
              Ajouter la colonne
            </button>
          </div>
        </form>

        <div className="mt-5 flex gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? 'Enregistrement...' : 'Valider les colonnes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Formulaire ajout / modification d'une ligne du registre
function RegisterRowModal({ register, row, onClose, onSaved }) {
  const isEditing = Boolean(row);
  const columns = register.columns || [];

  const [formData, setFormData] = useState(() => {
    const init = {};
    columns.forEach((c) => {
      init[c.id] = row?.data?.[c.id] ?? '';
    });
    return init;
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(colId, val) {
    setFormData((prev) => ({ ...prev, [colId]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = isEditing
        ? await api.patch(`/registers/${register.id}/rows/${row.id}`, { data: formData })
        : await api.post(`/registers/${register.id}/rows`, { data: formData });
      onSaved(response.data, isEditing);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer cette ligne.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isEditing ? 'Modifier la ligne' : 'Nouvelle entrée du registre'}
            </h2>
            <p className="text-xs text-slate-500">{register.title}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {columns.map((col) => {
            const val = formData[col.id] ?? '';

            return (
              <div key={col.id}>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-700">{col.name}</label>
                  {col.is_planning && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-teal-700">
                      <Calendar size={11} />
                      Suivi planning
                    </span>
                  )}
                </div>

                {col.type === 'date' ? (
                  <input
                    type="date"
                    value={val}
                    onChange={(e) => handleChange(col.id, e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                ) : col.type === 'number' ? (
                  <input
                    type="number"
                    step="any"
                    value={val}
                    onChange={(e) => handleChange(col.id, e.target.value)}
                    placeholder="0"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                ) : col.type === 'select' && col.options && col.options.length > 0 ? (
                  <select
                    value={val}
                    onChange={(e) => handleChange(col.id, e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Choisir une option --</option>
                    {col.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => handleChange(col.id, e.target.value)}
                    placeholder={`Saisir ${col.name}...`}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                )}
              </div>
            );
          })}

          <div className="flex gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
