// Miroir frontend de backend/src/lib/procedureBlocks.js — mêmes règles de conversion texte à
// plat -> blocs (voir le plan de refonte de la mise en page des procédures), utilisées ici pour
// appliquer une réponse IA en texte libre (correction de conformité, suggestion de révision
// depuis un CAPA) au modèle de contenu à blocs de l'éditeur (ProcedureSectionsEditor.jsx).

function makeBlockId() {
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function textToParagraphBlocks(text) {
  return (text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ type: 'paragraphe', id: makeBlockId(), text: line }));
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
    sections: [...merged, ...added],
    documents_associes: draft.documents_associes?.length ? draft.documents_associes : prev.documents_associes,
  };
}
