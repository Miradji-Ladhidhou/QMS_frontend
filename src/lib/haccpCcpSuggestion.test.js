import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCcpSuggestion, ccpSuggestionGuidance, nextCcpNumber, suggestPrimaryCcpLimits } from './haccpCcpSuggestion.js';

const form = {
  ccp_number: '', critical_limits: '', monitoring_procedure: 'Ancienne méthode',
  monitoring_frequency: '', monitoring_responsible: 'user-1',
  validation_source: 'Référence consultée', validation_evidence: 'Rapport réel et résultats consignés',
  limit_min: '0', limit_max: '8', limit_unit: '°C', monitoring_interval_hours: '12',
};

test('prefills procedures, number, simple bounds and reminder without inventing evidence or an assignee', () => {
  const suggestion = {
    critical_limits: 'Température ≤ 4 °C', monitoring_procedure: 'Mesure avec sonde étalonnée',
    monitoring_frequency: 'Toutes les 4 heures', corrective_action_procedure: 'Isoler le lot',
    verification_procedure: 'Revoir les fiches', verification_frequency: 'Mensuel',
    record_keeping_procedure: 'Fiches datées et signées',
    validation_source: 'Source inventée', validation_evidence: 'Essai inventé', monitoring_responsible: 'invented',
  };
  const result = applyCcpSuggestion(form, suggestion, 'CCP2');
  for (const [field, value] of Object.entries(suggestion).slice(0, 7)) assert.equal(result[field], value);
  assert.equal(result.ccp_number, 'CCP2');
  assert.equal(result.limit_min, '');
  assert.equal(result.limit_max, '4');
  assert.equal(result.limit_unit, '°C');
  assert.equal(result.monitoring_interval_hours, '4');
  for (const field of ['monitoring_responsible', 'validation_source', 'validation_evidence']) {
    assert.equal(result[field], form[field]);
  }
  assert.equal(form.limit_max, '8');
});

test('does not encode compound or strict limits as a single inclusive measurement', () => {
  for (const critical_limits of ['Température < 4 °C', 'Température ≥ 0 °C et ≤ 4 °C', 'Exposition > 4 °C ≤ 2 h']) {
    const result = applyCcpSuggestion(form, { critical_limits, monitoring_frequency: 'Par lot' }, 'CCP1');
    assert.equal(result.limit_min, '');
    assert.equal(result.limit_max, '');
    assert.equal(result.limit_unit, '');
    assert.equal(result.monitoring_interval_hours, '');
  }
  const range = applyCcpSuggestion(form, { critical_limits: 'Entre 0 et 4 °C' }, 'CCP1');
  assert.equal(range.limit_min, '0');
  assert.equal(range.limit_max, '4');
});

test('prefills the primary temperature and the monitoring reminder while preserving cumulative exposure criteria', () => {
  const critical_limits = 'Température du produit ≤ 4 °C pendant le transport ; Temps total d’exposition à > 4 °C ≤ 2 h (cumuls de dépassements).';
  const result = applyCcpSuggestion(form, {
    critical_limits,
    monitoring_frequency: 'À chaque arrêt du transport (minimum toutes les 2 h) et à chaque réception de lot.',
  }, 'CCP1');
  assert.equal(result.limit_min, '');
  assert.equal(result.limit_max, '4');
  assert.equal(result.limit_unit, '°C');
  assert.equal(result.monitoring_interval_hours, '2');
  assert.equal(result.critical_limits, critical_limits);
  assert.equal(suggestPrimaryCcpLimits(critical_limits).partial, true);
  assert.equal(suggestPrimaryCcpLimits('Température ≤ 4 °C pendant 2 h').partial, true);
  assert.equal(suggestPrimaryCcpLimits('Température ≥ 63 °C pendant 30 s').min, 63);
  assert.equal(suggestPrimaryCcpLimits('Durée ≤ 2 h ; température ≤ 4 °C'), null);
});

test('preserves number, ignores empty suggestions and leaves missing real evidence empty', () => {
  const result = applyCcpSuggestion({ ...form, ccp_number: 'Réception', validation_source: '', validation_evidence: '', monitoring_responsible: '' },
    { monitoring_procedure: '   ' }, 'CCP2');
  assert.equal(result.ccp_number, 'Réception');
  assert.equal(result.monitoring_procedure, form.monitoring_procedure);
  assert.equal(result.validation_source, '');
  assert.equal(result.validation_evidence, '');
  assert.equal(result.monitoring_responsible, '');
});

test('numbers new CCPs after existing standard numbers', () => {
  assert.equal(nextCcpNumber(), 'CCP1');
  assert.equal(nextCcpNumber([{ hazards: [{ ccp: { ccp_number: 'CCP3' } }, { ccp: { ccp_number: 'Custom' } }, {}] }]), 'CCP4');
});

test('legacy suggestions receive contextual guidance, new guidance stays separate from proof fields', () => {
  const guidance = ccpSuggestionGuidance(null, { critical_limits: 'pH ≤ 4', verification_procedure: 'Revoir les analyses' });
  assert.match(guidance.source, /pH ≤ 4/);
  assert.match(guidance.evidence, /Revoir les analyses/);
  assert.deepEqual(ccpSuggestionGuidance({ validation_source_guidance: 'Consulter le GBPH', validation_evidence_guidance: 'Réunir les essais' }, form),
    { source: 'Consulter le GBPH', evidence: 'Réunir les essais' });
});
