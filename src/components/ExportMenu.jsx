import { useId, useState } from 'react';
import { ChevronDown, Cloud, Download, FileSpreadsheet, FileText, FileType, Loader2 } from 'lucide-react';
import { useShareExportPermission } from '../lib/useShareExportPermission.js';

// Regroupe les 1-5 boutons "Exporter CSV/PDF/Excel/Word/Drive" — jusque-là posés côte à côte sur
// chaque page de liste — derrière un seul bouton "Exporter" et un petit menu déroulant, même
// esprit que le menu d'export déjà utilisé sur chaque carte KPI (Kpis.jsx). Chaque entrée
// (onExportCsv/Pdf/Xlsx/Word/Drive) absente plutôt que juste cachée omet complètement le
// bouton correspondant, comme les boutons qu'elle remplace — pas seulement Word/Drive : une
// page qui n'a que 2 formats (ex. CapaDetail.jsx : PDF + Drive) ne doit voir QUE ces deux
// entrées, jamais un bouton CSV/Excel fantôme qui planterait au clic (onClick undefined).
export default function ExportMenu({
  disabled,
  onExportCsv,
  exportingCsv,
  onExportPdf,
  exportingPdf,
  onExportXlsx,
  exportingXlsx,
  onExportWord,
  exportingWord,
  onExportDrive,
  exportingDrive,
}) {
  const [open, setOpen] = useState(false);
  const permission = useShareExportPermission();
  const formatsId = useId();
  const formats = [
    onExportCsv && 'CSV',
    onExportPdf && 'PDF',
    onExportXlsx && 'Excel',
    onExportWord && 'Word',
    onExportDrive && 'Drive',
  ].filter(Boolean).join(' · ');
  const anyExporting = exportingCsv || exportingPdf || exportingXlsx || exportingWord || exportingDrive;

  function handleSelect(action) {
    if (!permission.allowed) return;
    setOpen(false);
    action();
  }

  return (
    <div className="relative flex-1 sm:flex-none" onKeyDown={(event) => {
      if (event.key === 'Escape') setOpen(false);
    }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled || !permission.allowed}
        aria-expanded={open}
        aria-describedby={formatsId}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
      >
        {anyExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
        Exporter
        <ChevronDown size={15} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <p id={formatsId} className="mt-1 text-center text-xs text-slate-600">{permission.loading ? 'Vérification des droits...' : permission.error || formats}</p>

      {open && permission.allowed && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          {/* max-w garde le menu dans l'écran même quand ce bouton n'est pas collé au bord
              gauche (ex. plusieurs boutons sur une même ligne qui passe à la ligne en mobile) :
              w-56 (224px) peut dépasser un viewport de 320-360px selon où le bouton atterrit. */}
          <div className="absolute left-0 top-full z-20 mt-1 w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg sm:left-auto sm:right-0">
            {onExportCsv && (
              <button
                type="button"
                onClick={() => handleSelect(onExportCsv)}
                disabled={exportingCsv}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {exportingCsv ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                CSV
              </button>
            )}
            {onExportPdf && (
              <button
                type="button"
                onClick={() => handleSelect(onExportPdf)}
                disabled={exportingPdf}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {exportingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                PDF
              </button>
            )}
            {onExportXlsx && (
              <button
                type="button"
                onClick={() => handleSelect(onExportXlsx)}
                disabled={exportingXlsx}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {exportingXlsx ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                Excel
              </button>
            )}
            {onExportWord && (
              <button
                type="button"
                onClick={() => handleSelect(onExportWord)}
                disabled={exportingWord}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {exportingWord ? <Loader2 size={14} className="animate-spin" /> : <FileType size={14} />}
                Word
              </button>
            )}
            {onExportDrive && (
              <button
                type="button"
                onClick={() => handleSelect(onExportDrive)}
                disabled={exportingDrive}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {exportingDrive ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
                Enregistrer sur Drive
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
