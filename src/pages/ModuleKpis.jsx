import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckSquare, ChevronDown, GitCompareArrows, Loader2, ListChecks, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useMenuVisibility } from '../lib/useMenuVisibility.js';
import { COMPARISON_MODES } from '../lib/moduleKpis.js';
import IndicatorRow from '../components/moduleKpis/IndicatorRow.jsx';
import ComparisonModal from '../components/moduleKpis/ComparisonModal.jsx';
import PageGuide from '../components/PageGuide.jsx';

const MAX_COMPARE = 4;

function CountChip({ count, tone, children }) {
  if (!count) return null;
  const styles = { good: 'bg-emerald-100 text-emerald-700', warning: 'bg-amber-100 text-amber-800', bad: 'bg-red-100 text-red-700' };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[tone]}`}>
      {count} {children}
    </span>
  );
}

// Indicateurs des modules : les quelques indicateurs qui méritent d'être suivis dans chaque domaine du système qualité,
// calculés automatiquement depuis les données. Pour chacun : valeur, état face à l'objectif (modifiable), comparaison
// avec la période précédente, l'an dernier ou la moyenne récente, et mini-courbe. Les autres indicateurs du catalogue
// restent disponibles, repliés.
export default function ModuleKpis() {
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const visibleMenuKeys = useMenuVisibility();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mode, setMode] = useState('previous');
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [openDomains, setOpenDomains] = useState(null); // Set de clés ; null = pas encore initialisé
  const [showOthers, setShowOthers] = useState({});
  const [busyPreset, setBusyPreset] = useState(null);
  const [enabling, setEnabling] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [auditIds, setAuditIds] = useState([]);
  const [auditOnly, setAuditOnly] = useState(false);
  const [auditMenuOpen, setAuditMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [refreshingPreset, setRefreshingPreset] = useState(null);
  const [draftDateFrom, setDraftDateFrom] = useState('');
  const [draftDateTo, setDraftDateTo] = useState('');
  const [appliedRange, setAppliedRange] = useState({ from: '', to: '' });
  const loadRequestRef = useRef(0);

  async function load(range = appliedRange) {
    const requestId = ++loadRequestRef.current;
    try {
      const ranges = data?.domains?.reduce((result, domain) => {
        if (range.from || range.to) result[domain.key] = range;
        return result;
      }, {});
      const { data: overview } = await api.get('/kpis/module-overview', {
        params: ranges && Object.keys(ranges).length > 0 ? { ranges: JSON.stringify(ranges) } : undefined,
      });
      if (requestId !== loadRequestRef.current) return;
      setData(overview);
      setError('');
      setOpenDomains((current) => {
        if (current !== null) return current;
        const withIssues = overview.domains.filter((domain) => domain.counts.bad + domain.counts.warning > 0).map((domain) => domain.key);
        return new Set(withIssues.length > 0 ? withIssues : [overview.domains[0]?.key]);
      });
    } catch {
      if (requestId === loadRequestRef.current) setError('Impossible de charger les indicateurs.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  const domains = useMemo(() => {
    if (!data) return [];
    const isVisible = (domain) => !visibleMenuKeys || domain.menu_keys.some((key) => visibleMenuKeys.includes(key)) || domain.counts.tracked > 0;
    return data.domains.filter(isVisible);
  }, [data, visibleMenuKeys]);

  const allTracked = useMemo(() => domains.flatMap((domain) => domain.indicators).filter((indicator) => indicator.tracked), [domains]);
  const compared = allTracked.filter((indicator) => compareIds.includes(indicator.preset_id));
  const trackedIds = useMemo(() => new Set(allTracked.map((indicator) => indicator.preset_id)), [allTracked]);
  const selectedAuditCount = auditIds.filter((id) => trackedIds.has(id)).length;

  useEffect(() => {
    setAuditIds((ids) => ids.filter((id) => trackedIds.has(id)));
  }, [trackedIds]);

  function toggleDomain(key) {
    setOpenDomains((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleTrack(indicator) {
    setBusyPreset(indicator.preset_id);
    setError('');
    try {
      await api.post('/kpis/from-module-preset', { preset_id: indicator.preset_id });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de suivre cet indicateur.');
    } finally {
      setBusyPreset(null);
    }
  }

  async function handleUntrack(indicator) {
    if (!window.confirm(`Ne plus suivre « ${indicator.label} » ? Son historique sera supprimé.`)) return;
    try {
      await api.delete(`/kpis/${indicator.kpi_id}`);
      setCompareIds((ids) => ids.filter((id) => id !== indicator.preset_id));
      await load();
    } catch {
      setError('Impossible de retirer cet indicateur.');
    }
  }

  async function handleRefresh(indicator) {
    setRefreshingPreset(indicator.preset_id);
    setError('');
    try {
      await api.post(`/kpis/${indicator.kpi_id}/recompute`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible d’actualiser cet indicateur.');
    } finally {
      setRefreshingPreset(null);
    }
  }

  async function handleEnableEssentials() {
    setEnabling(true);
    setError('');
    setNotice('');
    try {
      const { data: result } = await api.post('/kpis/module-overview/enable-essentials', {});
      setNotice(
        `${result.created.length} indicateur${result.created.length > 1 ? 's' : ''} suivi${result.created.length > 1 ? 's' : ''}. ` +
          `Ceux qui mesurent l'état « à ce jour » construisent leur historique mois après mois.` +
          (result.failed.length > 0 ? ` ${result.failed.length} n'ont pas pu être créés.` : '')
      );
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de suivre l'essentiel.");
    } finally {
      setEnabling(false);
    }
  }

  function toggleCompare(indicator) {
    setCompareIds((ids) => (ids.includes(indicator.preset_id) ? ids.filter((id) => id !== indicator.preset_id) : ids.length >= MAX_COMPARE ? ids : [...ids, indicator.preset_id]));
  }

  function toggleAudit(indicator) {
    setAuditIds((ids) => (ids.includes(indicator.preset_id) ? ids.filter((id) => id !== indicator.preset_id) : [...ids, indicator.preset_id]));
  }

  function toggleDomainAudit(domain) {
    const domainIds = domain.indicators.filter((indicator) => indicator.tracked).map((indicator) => indicator.preset_id);
    setAuditIds((ids) => {
      const allSelected = domainIds.every((id) => ids.includes(id));
      return allSelected ? ids.filter((id) => !domainIds.includes(id)) : [...new Set([...ids, ...domainIds])];
    });
  }

  function clearAuditSelection() {
    setAuditIds([]);
    setAuditOnly(false);
  }

  function applyDateRange() {
    if (draftDateFrom && draftDateTo && draftDateFrom > draftDateTo) {
      setError('La date de début doit précéder la date de fin.');
      return;
    }
    const nextRange = { from: draftDateFrom, to: draftDateTo };
    setAppliedRange(nextRange);
    load(nextRange);
  }

  function clearDateRange() {
    setDraftDateFrom('');
    setDraftDateTo('');
    setAppliedRange({ from: '', to: '' });
    load({ from: '', to: '' });
  }

  const summary = data?.summary;
  const untrackedEssentials = summary ? summary.essential_total - summary.essential_tracked : 0;
  const rowProps = {
    mode,
    canManage,
    compareDisabled: compareIds.length >= MAX_COMPARE,
    onToggleCompare: toggleCompare,
    onTrack: handleTrack,
    onUntrack: handleUntrack,
    onRefresh: handleRefresh,
    onObjectiveSaved: load,
  };

  return (
    <div className={compareIds.length >= 2 ? 'pb-24' : ''}>
      <Link to="/kpis" className="-ml-1 mb-2 flex min-h-[40px] items-center gap-1 px-1 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} />
        Retour aux KPI
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Indicateurs des modules</h1>
        {canManage && untrackedEssentials > 0 && (
          <button
            type="button"
            onClick={handleEnableEssentials}
            disabled={enabling}
            className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {enabling ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {enabling ? 'Mise en place…' : `Suivre l'essentiel (${untrackedEssentials})`}
          </button>
        )}
      </div>
      <PageGuide id="moduleKpis" />

      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}

      {!data && !error ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : (
        data && (
          <>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{summary.tracked} indicateur{summary.tracked > 1 ? 's' : ''} suivi{summary.tracked > 1 ? 's' : ''}</p>
                <CountChip count={summary.good} tone="good">sur objectif</CountChip>
                <CountChip count={summary.warning} tone="warning">à surveiller</CountChip>
                <CountChip count={summary.bad} tone="bad">hors objectif</CountChip>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Essentiel : {summary.essential_tracked} sur {summary.essential_total} suivis.
                {summary.tracked === 0 && canManage ? ' Commencez par « Suivre l’essentiel » : une trentaine d’indicateurs choisis, prêts à l’emploi.' : ''}
              </p>

              <div className="mt-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setToolsOpen((open) => !open)}
                  aria-expanded={toolsOpen}
                  className="flex min-h-[40px] items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  <ChevronDown size={16} className={`transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
                  Filtres et comparaison
                  {onlyIssues && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">À surveiller</span>}
                </button>

                {toolsOpen && (
                  <div className="mt-2 rounded-md bg-slate-50 p-3">
                    <div className="mb-3 border-b border-slate-200 pb-3">
                      <p className="mb-2 text-xs font-medium text-slate-500">Période des données affichées</p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className="text-xs text-slate-600">
                          Du
                          <input type="date" value={draftDateFrom} onChange={(event) => setDraftDateFrom(event.target.value)} className="mt-1 block min-h-[40px] w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </label>
                        <label className="text-xs text-slate-600">
                          Au
                          <input type="date" value={draftDateTo} onChange={(event) => setDraftDateTo(event.target.value)} className="mt-1 block min-h-[40px] w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </label>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button type="button" onClick={applyDateRange} className="min-h-[40px] rounded-md bg-primary px-3 text-xs font-medium text-white hover:bg-primary-700">
                          Appliquer la période
                        </button>
                        {(appliedRange.from || appliedRange.to) && (
                          <button type="button" onClick={clearDateRange} className="min-h-[40px] px-2 text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-slate-800">
                            Afficher toute la période
                          </button>
                        )}
                        {(appliedRange.from || appliedRange.to) && <span className="text-xs text-primary">Période active</span>}
                      </div>
                    </div>
                    <p className="mb-1 text-xs font-medium text-slate-500">Comparer la valeur actuelle à…</p>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3" role="group" aria-label="Base de comparaison">
                      {COMPARISON_MODES.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setMode(item.key)}
                          aria-pressed={mode === item.key}
                          className={`min-h-[44px] rounded-md border px-3 text-sm font-medium sm:min-h-[40px] ${mode === item.key ? 'border-primary bg-primary/10 text-primary' : 'border-slate-300 text-slate-600 hover:bg-white'}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {summary.tracked > 0 && (
                      <label className="mt-3 flex min-h-[40px] cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                        <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary" />
                        N'afficher que ce qui demande de l'attention
                      </label>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setAuditMenuOpen((open) => !open)}
                  aria-expanded={auditMenuOpen}
                  className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <ListChecks size={17} className="shrink-0 text-primary" />
                    <span className="truncate">Choisir les données à auditer</span>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{selectedAuditCount} sélectionné{selectedAuditCount > 1 ? 's' : ''}</span>
                  </span>
                  <ChevronDown size={17} className={`shrink-0 text-slate-400 transition-transform ${auditMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {auditMenuOpen && (
                  <div className="mt-2 space-y-2 rounded-md border border-slate-200 p-2">
                    {domains.map((domain) => {
                      const domainTracked = domain.indicators.filter((indicator) => indicator.tracked);
                      const domainSelected = domainTracked.filter((indicator) => auditIds.includes(indicator.preset_id)).length;
                      if (domainTracked.length === 0) {
                        return (
                          <p key={domain.key} className="px-2 py-1 text-xs text-slate-400">
                            {domain.label} : aucun indicateur suivi
                          </p>
                        );
                      }
                      return (
                        <details key={domain.key} className="rounded-md border border-slate-100 bg-white" open={domainSelected > 0}>
                          <summary className="flex min-h-[40px] cursor-pointer list-none items-center gap-2 px-2 text-sm font-medium text-slate-700">
                            <span className="min-w-0 flex-1 truncate">{domain.label}</span>
                            <span className="text-xs text-slate-400">{domainSelected}/{domainTracked.length}</span>
                          </summary>
                          <div className="space-y-1 border-t border-slate-100 px-2 py-2">
                            <label className="flex min-h-[36px] cursor-pointer items-center gap-2 border-b border-slate-100 pb-1 text-xs font-medium text-primary">
                              <input
                                type="checkbox"
                                checked={domainSelected === domainTracked.length}
                                onChange={() => toggleDomainAudit(domain)}
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                              />
                              Tout sélectionner dans ce domaine
                            </label>
                            {domainTracked.map((indicator) => (
                              <label key={indicator.preset_id} className="flex min-h-[36px] cursor-pointer items-center gap-2 text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={auditIds.includes(indicator.preset_id)}
                                  onChange={() => toggleAudit(indicator)}
                                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                />
                                <span className="min-w-0 flex-1 truncate">{indicator.label}</span>
                                <span className="shrink-0 text-xs text-slate-400">{indicator.status === 'bad' ? 'Hors objectif' : indicator.status === 'warning' ? 'À surveiller' : indicator.status === 'good' ? 'OK' : 'Sans objectif'}</span>
                              </label>
                            ))}
                          </div>
                        </details>
                      );
                    })}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                      <label className="flex min-h-[40px] cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={auditOnly}
                          onChange={(event) => setAuditOnly(event.target.checked)}
                          disabled={selectedAuditCount === 0}
                          className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary disabled:opacity-50"
                        />
                        Afficher uniquement ma sélection
                      </label>
                      <button type="button" onClick={clearAuditSelection} className="min-h-[40px] px-2 text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-slate-800">
                        Effacer la sélection
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {domains.map((domain) => {
                const open = openDomains?.has(domain.key);
                const essentials = domain.indicators.filter((indicator) => indicator.essential);
                const others = domain.indicators.filter((indicator) => !indicator.essential);
                const isAuditVisible = (indicator) => !auditOnly || auditIds.includes(indicator.preset_id);
                const shown = essentials.filter((indicator) => isAuditVisible(indicator) && (!onlyIssues || (indicator.tracked && ['bad', 'warning'].includes(indicator.status))));
                const trackedOthers = others.filter((indicator) => indicator.tracked && isAuditVisible(indicator) && (!onlyIssues || ['bad', 'warning'].includes(indicator.status)));
                const untrackedOthers = others.filter((indicator) => !auditOnly && !indicator.tracked);
                const othersOpen = showOthers[domain.key];
                if ((onlyIssues || auditOnly) && shown.length === 0 && trackedOthers.length === 0) return null;
                return (
                  <section key={domain.key} className="rounded-xl border border-slate-200 bg-slate-50/50">
                    <button type="button" onClick={() => toggleDomain(domain.key)} aria-expanded={open} className="flex min-h-[60px] w-full items-center gap-3 rounded-xl p-4 text-left">
                      <div className="min-w-0 flex-1">
                        <h2 className="break-words text-sm font-semibold text-slate-900 sm:text-base">{domain.label}</h2>
                        <p className="break-words text-xs text-slate-500">{domain.question}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <CountChip count={domain.counts.bad} tone="bad">hors objectif</CountChip>
                          <CountChip count={domain.counts.warning} tone="warning">à surveiller</CountChip>
                          {domain.counts.bad + domain.counts.warning === 0 && domain.counts.good > 0 && <CountChip count={domain.counts.good} tone="good">sur objectif</CountChip>}
                          {domain.counts.tracked === 0 && <span className="text-xs text-slate-400">Aucun indicateur suivi</span>}
                        </div>
                      </div>
                      <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>

                    {open && (
                      <div className="space-y-2 px-3 pb-4 sm:px-4">
                        <ul className="space-y-2">
                          {shown.map((indicator) => (
                            <IndicatorRow key={indicator.preset_id} indicator={indicator} compareSelected={compareIds.includes(indicator.preset_id)} busy={busyPreset === indicator.preset_id || refreshingPreset === indicator.preset_id} {...rowProps} />
                          ))}
                          {trackedOthers.map((indicator) => (
                            <IndicatorRow key={indicator.preset_id} indicator={indicator} compareSelected={compareIds.includes(indicator.preset_id)} busy={busyPreset === indicator.preset_id || refreshingPreset === indicator.preset_id} {...rowProps} />
                          ))}
                        </ul>
                        {!onlyIssues && untrackedOthers.length > 0 && (
                          <div>
                            <button
                              type="button"
                              onClick={() => setShowOthers((current) => ({ ...current, [domain.key]: !current[domain.key] }))}
                              aria-expanded={Boolean(othersOpen)}
                              className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-md px-1 text-left text-sm font-medium text-slate-600 hover:text-slate-900"
                            >
                              Autres indicateurs disponibles ({untrackedOthers.length})
                              <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${othersOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {othersOpen && (
                              <ul className="mt-1 space-y-2">
                                {untrackedOthers.map((indicator) => (
                                <IndicatorRow key={indicator.preset_id} indicator={indicator} compareSelected={false} busy={busyPreset === indicator.preset_id || refreshingPreset === indicator.preset_id} {...rowProps} />
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )
      )}

      {compareIds.length >= 1 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:left-auto sm:right-6 sm:bottom-6 sm:w-auto sm:rounded-xl sm:border sm:p-2">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 text-sm text-slate-600">
              {compareIds.length} indicateur{compareIds.length > 1 ? 's' : ''} sélectionné{compareIds.length > 1 ? 's' : ''}
              {compareIds.length >= MAX_COMPARE ? ` (maximum ${MAX_COMPARE})` : ''}
            </p>
            <button type="button" onClick={() => setCompareIds([])} className="min-h-[44px] rounded-md px-3 text-sm text-slate-500 hover:text-slate-800">
              Effacer
            </button>
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              disabled={compareIds.length < 2}
              className="flex min-h-[44px] items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              <GitCompareArrows size={16} />
              Comparer
            </button>
          </div>
        </div>
      )}

      {compareOpen && compared.length >= 2 && <ComparisonModal indicators={compared} onClose={() => setCompareOpen(false)} />}
    </div>
  );
}
