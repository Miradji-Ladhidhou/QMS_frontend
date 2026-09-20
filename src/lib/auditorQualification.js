// Qualification des auditeurs internes (ISO 9001 §9.2). Les formations cochées « qualifie les
// auditeurs internes » servent de référence ; voir backend/src/services/auditorQualification.js
// pour la règle : qualified (à jour, non échoué) / expired (à recycler) / failed (évaluation ou QCM
// non satisfaisant) / none (jamais suivie). Un indicateur, jamais un blocage.

export const QUALIFICATION_LABELS = {
  qualified: 'Qualifié',
  expired: 'À recycler',
  failed: 'Non qualifié',
  none: 'Non qualifié',
};

// Classes de pastille (fond + texte), même palette que les statuts KPI.
export const QUALIFICATION_STYLES = {
  qualified: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  none: 'bg-red-100 text-red-700',
};

export function qualificationOf(byUser, userId) {
  return byUser?.[userId] || { status: 'none' };
}

// Suffixe court à côté d'un nom dans une liste déroulante (les <option> n'acceptent que du texte).
export function qualificationOptionSuffix(status) {
  if (status === 'qualified') return ' — ✓ qualifié';
  if (status === 'expired') return ' — ⚠ à recycler';
  return ' — ⚠ non qualifié';
}

function formatDate(value) {
  return value ? new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR') : '';
}

// Phrase de détail (« Formation « Audit interne » du 01/03/2026, valable jusqu'au 01/03/2029, QCM 90 % »).
export function describeQualification(qualification) {
  const { status, training_title: title, completed_at: doneAt, next_due_date: dueAt, quiz_score_percent: score } = qualification;
  if (status === 'none') return "Aucune formation d'auditeur interne suivie.";
  const base = `Formation « ${title} » du ${formatDate(doneAt)}`;
  const quiz = score !== null && score !== undefined ? `, QCM ${score} %` : '';
  if (status === 'qualified') return `${base}${dueAt ? `, valable jusqu'au ${formatDate(dueAt)}` : ''}${quiz}.`;
  if (status === 'expired') return `${base} — recyclage à effectuer depuis le ${formatDate(dueAt)}.`;
  return `${base} — évaluation non satisfaisante${quiz}.`;
}

// Bilan d'UNE formation qualifiante, calculé depuis ses réalisations (mêmes règles que le serveur) :
// nombre de personnes (comptes) qualifiées, à recycler, non qualifiées — dernière réalisation de
// chacune.
export function summarizeTrainingQualification(training, today = new Date().toISOString().slice(0, 10)) {
  const latestByUser = new Map();
  for (const record of training.records || []) {
    if (!record.user_id) continue;
    const known = latestByUser.get(record.user_id);
    if (!known || record.completed_at > known.completed_at) latestByUser.set(record.user_id, record);
  }
  const summary = { qualified: 0, expired: 0, failed: 0 };
  for (const record of latestByUser.values()) {
    if (record.evaluation_result === false) summary.failed += 1;
    else if (record.next_due_date && record.next_due_date < today) summary.expired += 1;
    else summary.qualified += 1;
  }
  return summary;
}
