export function quotaProgress(quota) {
  if (quota.limit === null) return null;
  if (quota.limit === 0) return 100;
  return Math.min(100, Math.max(0, ((quota.used + quota.pending) / quota.limit) * 100));
}
