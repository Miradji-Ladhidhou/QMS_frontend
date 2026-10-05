const KNOWN_DOMAINS = {
  'iso.org': { kind: 'official', publisher: 'ISO', nature: 'Organisme international de normalisation' },
  'inrs.fr': { kind: 'official', publisher: 'INRS', nature: 'Organisme de prévention des risques professionnels' },
  'cnil.fr': { kind: 'official', publisher: 'CNIL', nature: 'Autorité publique de protection des données' },
  'fao.org': { kind: 'official', publisher: 'FAO', nature: 'Organisation des Nations unies' },
  'eur-lex.europa.eu': { kind: 'official', publisher: 'EUR-Lex', nature: 'Portail juridique de l’Union européenne' },
  'manager-go.com': { kind: 'private', publisher: 'Manager GO!', nature: 'Site privé de guides pratiques' },
};

export function classifyResourceSource(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { kind: 'unverified', domain: '', nature: 'Adresse invalide : source non vérifiée' };
  }
  const domain = parsed.hostname.toLowerCase();
  const known = KNOWN_DOMAINS[domain.replace(/^www\./, '')];
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || !known) {
    return { kind: 'unverified', domain, nature: 'Domaine non référencé : statut à vérifier' };
  }
  return { ...known, domain };
}
