import { useMemo, useState } from 'react';

// null/undefined toujours en dernier quel que soit le sens du tri (une échéance vide ne doit
// pas se retrouver mélangée aux vraies dates) ; nombres comparés numériquement ; tout le reste
// (dates ISO comme chaînes, texte) via localeCompare fr avec `numeric: true` pour que "CAPA-9"
// passe bien avant "CAPA-10".
function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'fr', { sensitivity: 'base', numeric: true });
}

// getValue(item, key) extrait la valeur triable pour une colonne donnée — laisse à chaque
// page le choix de trier sur un champ dérivé (ex. capa.service?.name plutôt que capa.service).
export function useSort(items, getValue, initialKey = null, initialDirection = 'asc') {
  const [sortKey, setSortKey] = useState(initialKey);
  const [direction, setDirection] = useState(initialDirection);

  function toggleSort(key) {
    if (key === sortKey) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setDirection('asc');
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return items;
    const factor = direction === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => factor * compareValues(getValue(a, sortKey), getValue(b, sortKey)));
  }, [items, getValue, sortKey, direction]);

  return { sorted, sortKey, direction, setSortKey, setDirection, toggleSort };
}
