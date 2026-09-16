import { Plus, Trash2 } from 'lucide-react';

const CELL_CLASS =
  'w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

// Éditeur du bloc "tableau" du modèle à blocs (voir ProcedureSectionsEditor.jsx et le plan de
// refonte de la mise en page des procédures) — colonnes/lignes entièrement libres, utilisable
// dans n'importe quelle section. block : { type: 'tableau', id, headers: [string], rows:
// [[string]] }. onChange(nextBlock) : même contrat controlled que le reste de l'éditeur.
export default function TableBlockEditor({ block, onChange }) {
  const headers = block.headers || [];
  const rows = block.rows || [];

  function updateHeader(index, value) {
    onChange({ ...block, headers: headers.map((h, i) => (i === index ? value : h)) });
  }

  function addColumn() {
    onChange({
      ...block,
      headers: [...headers, `Colonne ${headers.length + 1}`],
      rows: rows.map((row) => [...row, '']),
    });
  }

  function removeColumn(index) {
    onChange({
      ...block,
      headers: headers.filter((_, i) => i !== index),
      rows: rows.map((row) => row.filter((_, i) => i !== index)),
    });
  }

  function updateCell(rowIndex, colIndex, value) {
    onChange({
      ...block,
      rows: rows.map((row, r) => (r === rowIndex ? row.map((cell, c) => (c === colIndex ? value : cell)) : row)),
    });
  }

  function addRow() {
    onChange({ ...block, rows: [...rows, headers.map(() => '')] });
  }

  function removeRow(index) {
    onChange({ ...block, rows: rows.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index} className="border border-slate-200 p-1">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={header}
                      onChange={(e) => updateHeader(index, e.target.value)}
                      className={`${CELL_CLASS} font-medium`}
                    />
                    <button
                      type="button"
                      onClick={() => removeColumn(index)}
                      aria-label="Supprimer cette colonne"
                      className="shrink-0 p-1 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {headers.map((_, colIndex) => (
                  <td key={colIndex} className="border border-slate-200 p-1">
                    <input
                      type="text"
                      value={row[colIndex] || ''}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      className={CELL_CLASS}
                    />
                  </td>
                ))}
                <td className="p-1">
                  <button
                    type="button"
                    onClick={() => removeRow(rowIndex)}
                    aria-label="Supprimer cette ligne"
                    className="p-1 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={addColumn}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-700"
        >
          <Plus size={12} /> Colonne
        </button>
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-700"
        >
          <Plus size={12} /> Ligne
        </button>
      </div>
    </div>
  );
}
