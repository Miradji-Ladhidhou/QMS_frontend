import { useCallback, useState } from 'react';
import { buildEvidenceExportUrl } from './evidenceExportSelection.js';

export function useEvidenceExportSelection(recordId) {
  const [state, setState] = useState({ recordId, selections: {} });
  const onExportSelectionChange = useCallback((ids, moduleKey, evidenceRecordId) => {
    setState((current) => {
      const selections = current.recordId === recordId ? { ...current.selections } : {};
      const key = `${moduleKey}:${evidenceRecordId}`;
      if (current.recordId === recordId &&
          ((ids === null && !(key in selections)) || JSON.stringify(selections[key]) === JSON.stringify(ids))) {
        return current;
      }
      if (ids === null) delete selections[key];
      else selections[key] = ids;
      return { recordId, selections };
    });
  }, [recordId]);

  const withEvidenceSelection = (url) => buildEvidenceExportUrl(url, state.recordId === recordId ? state.selections : {});
  return { withEvidenceSelection, onExportSelectionChange };
}
