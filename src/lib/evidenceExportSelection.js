export function buildEvidenceExportUrl(url, selections) {
  if (Object.keys(selections).length === 0) return url;
  const params = new URLSearchParams({ evidenceSelections: JSON.stringify(selections) });
  return `${url}${url.includes('?') ? '&' : '?'}${params}`;
}
