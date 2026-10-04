export function quotaProgress(quota) {
  if (quota.limit === null) return null;
  if (quota.limit === 0) return 100;
  return Math.min(100, Math.max(0, ((quota.used + quota.pending) / quota.limit) * 100));
}

export function quotaWarning(quota) {
  const progress = quotaProgress(quota);
  if (progress === null || progress < 80) return null;
  if (quota.limit === 0) return { level: 'blocked', text: 'Accès bloqué : plafond configuré à zéro.' };
  if (progress >= 100) return { level: 'reached', text: 'Limite atteinte : nouvelles actions IA bloquées.' };
  if (progress >= 95) return { level: 'critical', text: 'Alerte 95 % : quota presque épuisé.' };
  return { level: 'warning', text: 'Alerte 80 % : consommation élevée.' };
}
