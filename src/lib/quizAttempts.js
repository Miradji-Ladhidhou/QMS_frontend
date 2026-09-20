// Trace des essais de QCM d'une personne pour une même réalisation (une session). Miroir de
// backend/src/services/trainingQuiz.js#numberAttempts/summarizeAttempts : un « essai » est un QCM
// effectivement PASSÉ ; un lien envoyé mais jamais utilisé (expiré ou remplacé) figure dans
// l'historique sans numéro.

// Passages triés du plus ancien au plus récent (par envoi), chacun terminé portant son numéro d'essai
// dans l'ordre où les QCM ont été passés.
export function numberAttempts(attempts) {
  const numberById = new Map(
    attempts
      .filter((attempt) => attempt.completed_at)
      .sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))
      .map((attempt, index) => [attempt.id, index + 1])
  );
  return [...attempts]
    .sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at))
    .map((attempt) => ({ ...attempt, attempt_number: numberById.get(attempt.id) || null }));
}

export function summarizeAttempts(attempts) {
  const completed = attempts.filter((attempt) => attempt.completed_at);
  const successes = completed.filter((attempt) => attempt.passed === true).length;
  return { total: completed.length, successes, failures: completed.length - successes };
}

const plural = (count, word) => `${count} ${word}${count > 1 ? 's' : ''}`;

// « 3 essais : 1 réussite, 2 échecs »
export function describeAttemptsSummary({ total, successes, failures }) {
  if (total === 0) return 'Aucun essai passé';
  return `${plural(total, 'essai')} : ${plural(successes, 'réussite')}, ${plural(failures, 'échec')}`;
}

// Statut d'un passage dans l'historique.
export function attemptStatus(attempt) {
  if (attempt.completed_at) return attempt.passed ? { label: 'Réussi', tone: 'good' } : { label: 'Non réussi', tone: 'bad' };
  if (new Date(attempt.expires_at) > new Date()) return { label: 'Lien envoyé, non passé', tone: 'pending' };
  return { label: 'Lien non utilisé (expiré ou remplacé)', tone: 'muted' };
}
