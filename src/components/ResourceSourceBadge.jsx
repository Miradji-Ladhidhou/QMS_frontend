import { classifyResourceSource } from '../lib/resourceSource.js';

const SOURCE_STYLES = {
  official: { label: 'Site officiel de l’organisme', style: 'bg-emerald-50 text-emerald-800' },
  private: { label: 'Site privé — guide pratique', style: 'bg-blue-50 text-blue-800' },
  unverified: { label: 'Source non vérifiée', style: 'bg-amber-50 text-amber-800' },
};

export default function ResourceSourceBadge({ url }) {
  const source = classifyResourceSource(url);
  const badge = SOURCE_STYLES[source.kind];
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span title={source.nature} className={`rounded-full px-2 py-0.5 font-medium ${badge.style}`}>
        {badge.label}
      </span>
      <span className="break-all text-slate-500">
        {source.publisher ? `${source.publisher} · ` : ''}{source.domain || source.nature}
      </span>
    </div>
  );
}
