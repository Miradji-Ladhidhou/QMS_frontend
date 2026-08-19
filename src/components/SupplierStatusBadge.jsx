import { SUPPLIER_STATUS_LABELS, SUPPLIER_STATUS_STYLES } from '../lib/supplierStatus.js';

export default function SupplierStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        SUPPLIER_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {SUPPLIER_STATUS_LABELS[status] ?? status}
    </span>
  );
}
