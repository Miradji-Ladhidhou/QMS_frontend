import { useState } from 'react';
import { Cloud, Download, FileSpreadsheet, FileText, FileType, Loader2 } from 'lucide-react';

// Regroupe les 3-5 boutons "Exporter CSV/PDF/Excel/Word/Drive" — jusque-là posés côte à côte sur
// chaque page de liste — derrière un seul bouton "Exporter" et un petit menu déroulant, même
// esprit que le menu d'export déjà utilisé sur chaque carte KPI (Kpis.jsx). onExportDrive/
// onExportWord absents (plutôt que juste cachés) omettent complètement l'entrée, comme les
// boutons qu'ils remplacent.
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
  const anyExporting = exportingCsv || exportingPdf || exportingXlsx || exportingWord || exportingDrive;

  function handleSelect(action) {
    setOpen(false);
    action();
  }

  return (
    <div className="relative flex-1 sm:flex-none">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
      >
        {anyExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
        Exporter
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg sm:left-auto sm:right-0">
            <button
              type="button"
              onClick={() => handleSelect(onExportCsv)}
              disabled={exportingCsv}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {exportingCsv ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              CSV
            </button>
            <button
              type="button"
              onClick={() => handleSelect(onExportPdf)}
              disabled={exportingPdf}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {exportingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              PDF
            </button>
            <button
              type="button"
              onClick={() => handleSelect(onExportXlsx)}
              disabled={exportingXlsx}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {exportingXlsx ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              Excel
            </button>
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
