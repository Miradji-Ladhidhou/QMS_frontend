import { CALIBRATION_RESULT_LABELS, CALIBRATION_RESULT_STYLES } from '../lib/measuringEquipmentStatus.js';

export default function CalibrationResultBadge({ result }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        CALIBRATION_RESULT_STYLES[result] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {CALIBRATION_RESULT_LABELS[result] ?? result}
    </span>
  );
}
