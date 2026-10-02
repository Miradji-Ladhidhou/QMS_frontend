import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';

export function parseReviewParticipants(value) {
  return String(value || '').split(/[,;\n]+/).map((name) => name.trim()).filter(Boolean);
}

export default function ReviewParticipantsField({ value, onChange }) {
  const [people, setPeople] = useState([]);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    api
      .get('/management-reviews/recipients')
      .then(({ data }) => setPeople(data))
      .catch(() => setLoadFailed(true));
  }, []);

  const tokens = useMemo(() => parseReviewParticipants(value), [value]);
  const tokenSet = useMemo(() => new Set(tokens.map((name) => name.toLocaleLowerCase())), [tokens]);
  const knownNames = useMemo(() => new Set(people.map((person) => person.name.toLocaleLowerCase())), [people]);
  const customNames = tokens.filter((name) => !knownNames.has(name.toLocaleLowerCase()));
  const selectedNames = people.filter((person) => tokenSet.has(person.name.toLocaleLowerCase())).map((person) => person.name);

  function togglePerson(name) {
    const next = new Set(selectedNames);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onChange([...next, ...customNames].join(', '));
  }

  function updateCustomNames(text) {
    const names = parseReviewParticipants(text);
    onChange([...selectedNames, ...names].join(', '));
  }

  return (
    <div className="space-y-2">
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-slate-700">Participants</legend>
        {people.length > 0 ? (
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-slate-300 p-2">
            {people.map((person) => (
              <li key={`${person.kind}:${person.id}`}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={tokenSet.has(person.name.toLocaleLowerCase())}
                    onChange={() => togglePerson(person.name)}
                    className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span className="min-w-0 flex-1 break-words text-slate-800">{person.name}</span>
                  <span className="min-w-0 break-all text-xs text-slate-400">{person.email}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">
            {loadFailed ? 'La liste des personnes est indisponible.' : 'Chargement des personnes...'}
          </p>
        )}
      </fieldset>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Autres participants</label>
        <textarea
          rows={2}
          value={customNames.join(', ')}
          onChange={(event) => updateCustomNames(event.target.value)}
          placeholder="Ex. auditeur externe, représentant du personnel"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
        <p className="mt-1 text-xs text-slate-500">Les personnes sélectionnées seront proposées comme destinataires de la convocation.</p>
      </div>
    </div>
  );
}