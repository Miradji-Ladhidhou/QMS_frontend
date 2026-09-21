import { useId } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { normalizeJobTitle, useJobTitles } from '../lib/useJobTitles.js';

const INPUT_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

// Liste des postes existants pour un <input list="…"> (saisie assistée) : une seule graphie par poste, donc pas de
// « Cariste » / « cariste » en double.
export function JobTitleDatalist({ id, jobTitles }) {
  return (
    <datalist id={id}>
      {jobTitles.map((entry) => (
        <option key={entry.title} value={entry.title} />
      ))}
    </datalist>
  );
}

// Champ « Poste » d'un compte ou d'une personne du personnel. Le poste détermine les formations obligatoires de la
// personne (Formations > « Postes concernés ») : sous le champ, on montre ce qu'il déclenche — les formations déjà
// rattachées au poste saisi, ou l'invitation à les définir pour un nouveau poste.
export default function JobTitleField({ value, onChange, label = 'Poste', optional = true, canSuggest = true }) {
  const listId = useId();
  const { job_titles: jobTitles, general_trainings: generalTrainings } = useJobTitles(canSuggest);
  const typed = normalizeJobTitle(value);
  const known = typed ? jobTitles.find((entry) => normalizeJobTitle(entry.title) === typed) : null;

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {optional ? ' (facultatif)' : ''}
      </label>
      <input
        type="text"
        list={listId}
        maxLength={150}
        autoComplete="off"
        placeholder="Ex : Cariste, Soudeur, Responsable qualité"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLASS}
      />
      <JobTitleDatalist id={listId} jobTitles={jobTitles} />
      <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500">
        <GraduationCap size={14} className="mt-0.5 shrink-0 text-slate-400" />
        <span>
          {!typed && 'Le poste détermine les formations obligatoires de la personne.'}
          {typed && known && known.trainings.length > 0 && (
            <>
              Poste connu{known.people > 0 ? ` (${known.people} personne${known.people > 1 ? 's' : ''})` : ''} — formations obligatoires :{' '}
              <strong className="font-medium text-slate-700">{known.trainings.map((training) => training.title).join(', ')}</strong>.
            </>
          )}
          {typed && known && known.trainings.length === 0 && (
            <>
              Poste connu, mais aucune formation n'y est rattachée pour l'instant. Choisissez-les dans <Link to="/trainings" className="text-primary hover:underline">Formations</Link> (« Postes concernés »).
            </>
          )}
          {typed && !known && (
            <>
              Nouveau poste : aucune formation n'y est rattachée pour l'instant. Choisissez-les dans <Link to="/trainings" className="text-primary hover:underline">Formations</Link> (« Postes concernés »).
            </>
          )}
          {typed && generalTrainings.length > 0 && ` ${generalTrainings.length} formation${generalTrainings.length > 1 ? 's' : ''} ouverte${generalTrainings.length > 1 ? 's' : ''} à tous s'applique${generalTrainings.length > 1 ? 'nt' : ''} aussi.`}
        </span>
      </p>
    </div>
  );
}
