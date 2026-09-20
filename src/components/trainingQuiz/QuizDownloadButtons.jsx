import { FileText, Loader2 } from 'lucide-react';

const BUTTON_CLASS =
  'flex min-h-[40px] items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:min-h-0';

const FORMATS = [
  { format: 'word', label: 'QCM Word' },
  { format: 'pdf', label: 'QCM PDF' },
];

// Exports d'audit d'un passage de QCM terminé : Word (modifiable) et PDF (conservation).
// downloading : { id, format } du téléchargement en cours, ou null — les deux boutons se bloquent
// pendant qu'un export de ce passage est en cours, seul celui demandé affiche le sablier.
export default function QuizDownloadButtons({ attempt, downloading, onDownload }) {
  const busy = downloading?.id === attempt.id;
  return (
    <>
      {FORMATS.map(({ format, label }) => (
        <button key={format} type="button" onClick={() => onDownload(attempt, format)} disabled={busy} className={BUTTON_CLASS}>
          {busy && downloading.format === format ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
          {label}
        </button>
      ))}
    </>
  );
}
