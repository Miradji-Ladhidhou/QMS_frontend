// Miroir frontend de backend/src/lib/procedureBlocks.js — mêmes règles de conversion texte à
// plat -> blocs (voir le plan de refonte de la mise en page des procédures), utilisées ici pour
// appliquer une réponse IA en texte libre (correction de conformité, suggestion de révision
// depuis un CAPA) au modèle de contenu à blocs de l'éditeur (ProcedureSectionsEditor.jsx).

function makeBlockId() {
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// Défense en profondeur (miroir de backend/src/lib/procedureBlocks.js) : malgré la consigne des
// prompts IA, le modèle glisse parfois du Markdown (**gras**, "# Titre") dans un texte censé
// être brut (correction de conformité, suggestion de révision depuis un CAPA) — jamais
// interprété par Word, ça apparaîtrait tel quel, astérisques compris.
function stripMarkdownArtifacts(text) {
  return (text || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,6}\s+/, '');
}

export function textToParagraphBlocks(text) {
  return (text || '')
    .split('\n')
    .map((line) => stripMarkdownArtifacts(line.trim()))
    .filter(Boolean)
    .map((line) => ({ type: 'paragraphe', id: makeBlockId(), text: line }));
}

// Le sommaire est un bloc de contenu comme un autre (voir le plan de refonte : une section
// key === 'sommaire', un bloc liste_puces) — jamais un mécanisme séparé. Ce helper calcule les
// libellés à y proposer, à partir des AUTRES sections (jamais la sommaire elle-même) : le titre
// de chaque section, suivi de ses éventuels blocs "+ Sous-titre" préfixés "– " pour rester
// visuellement des sous-éléments même dans une liste à puces plate (ni le PDF ni le Word ne
// savent nester des puces — voir procedurePdf.js/procedureWord.js#bulletParagraphs). Les autres
// types de bloc (paragraphe, liste à puces, tableau...) ne sont pas des titres, jamais repris ici.
export function buildSommaireItems(sections) {
  const items = [];
  for (const section of sections || []) {
    if (section.key === 'sommaire') continue;
    items.push(section.label);
    for (const block of section.blocks || []) {
      const text = block.type === 'sous_titre' ? block.text?.trim() : '';
      if (text) items.push(`– ${text}`);
    }
  }
  return items;
}

// Ajoute une section "sommaire" en tête si aucune n'existe déjà — jamais si elle existe déjà
// (voir le principe du point 1 : pré-rempli par défaut, mais jamais écrasé automatiquement une
// fois présent, même par une génération IA ultérieure). Utilisé au tout premier amorçage d'un
// contenu vide (ProcedureSectionsEditor.jsx) et après une fusion de brouillon IA
// (mergeAiGeneratedSections ci-dessous), pour qu'un sommaire existe par défaut dans les deux cas
// sans jamais toucher à un sommaire déjà personnalisé par le tenant.
export function ensureSommaireSection(sections) {
  if ((sections || []).some((s) => s.key === 'sommaire')) return sections;
  const items = buildSommaireItems(sections);
  if (!items.length) return sections;
  return [{ key: 'sommaire', label: 'Sommaire', blocks: [{ type: 'liste_puces', id: makeBlockId(), items }] }, ...sections];
}

// Fusionne un brouillon généré par l'IA (draft/job.result : { sections: [{key,label,blocks}],
// documents_associes }, voir POST /generate-draft et /generate-full-draft côté backend) dans le
// contenu { sections, documents_associes } déjà en cours d'édition — par clé de section, jamais
// un remplacement complet : une section du brouillon qui n'a pas de correspondance générée
// garde son contenu déjà saisi. Une section générée sans correspondance existante (gabarit
// modifié entre-temps, ou contenu parti de zéro) est ajoutée à la suite, jamais perdue
// silencieusement. Utilisé par Procedures.jsx et ProcedureDetail.jsx.
export function mergeAiGeneratedSections(prev, draft) {
  const existingKeys = new Set((prev.sections || []).map((s) => s.key));
  const merged = (prev.sections || []).map((section) => {
    const generated = draft.sections?.find((s) => s.key === section.key);
    return generated ? { ...section, blocks: generated.blocks } : section;
  });
  const added = (draft.sections || []).filter((s) => !existingKeys.has(s.key));
  return {
    ...prev,
    // ensureSommaireSection n'ajoute rien si une section "sommaire" existe déjà (voir plus haut)
    // — une génération IA ultérieure ne l'écrase donc jamais si le tenant l'a déjà personnalisée.
    sections: ensureSommaireSection([...merged, ...added]),
    documents_associes: draft.documents_associes?.length ? draft.documents_associes : prev.documents_associes,
  };
}
