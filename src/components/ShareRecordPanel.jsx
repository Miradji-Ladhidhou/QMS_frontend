import { Link } from 'react-router-dom';
import { Share2 } from 'lucide-react';

export default function ShareRecordPanel({ resourceType, resourceId, compact = false }) {
  const params = new URLSearchParams({ resource_type: resourceType, resource_id: resourceId });
  return (
    <Link to={`/shares?${params}`} aria-label="Partager"
      className={compact
        ? 'flex items-center gap-1 rounded-md p-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-primary'
        : 'flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'}>
      <Share2 size={16} /> Partager
    </Link>
  );
}
