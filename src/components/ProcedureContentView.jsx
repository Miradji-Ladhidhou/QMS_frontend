import { Camera, Info } from 'lucide-react';

// Affichage structuré du contenu d'une version de procédure — un seul walker sur le modèle à
// blocs (voir le plan de refonte de la mise en page des procédures : une section = { key,
// label, blocks: [...] }, chaque bloc { type, id, ... } parmi paragraphe/liste_puces/tableau/
// encadre/sous_titre/photo_placeholder), le même schéma que services/procedureWord.js#
// blocksToDocxParagraphs et services/procedurePdf.js#drawBlocks côté export. Objet/domaine
// d'application/responsabilités ne sont plus des champs à part : ce sont des sections
// ordinaires parmi "sections", déjà couvertes par la boucle ci-dessous.

function Callout({ text }) {
  if (!text) return null;
  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
      <Info size={16} className="mt-0.5 shrink-0 text-slate-500" />
      <p>
        <span className="font-semibold text-slate-700">Point d'attention : </span>
        <span className="text-slate-700">{text}</span>
      </p>
    </div>
  );
}

function PhotoPlaceholder({ caption }) {
  return (
    <div className="mt-2 flex items-center gap-2.5 rounded-md border border-dashed border-slate-300 px-3 py-2.5 text-xs text-slate-500">
      <Camera size={16} className="shrink-0 text-slate-400" />
      Emplacement réservé à une photo — {caption}
    </div>
  );
}

function TableBlockView({ headers, rows }) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr>
            {(headers || []).map((header, i) => (
              <th key={i} className="border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left font-semibold text-slate-700">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((row, i) => (
            <tr key={i}>
              {(headers || []).map((_, j) => (
                <td key={j} className="border border-slate-200 px-2.5 py-1.5 text-slate-700">
                  {row[j]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BlockView({ block }) {
  switch (block.type) {
    case 'sous_titre':
      return <h4 className="mt-3 text-sm font-semibold text-slate-900">{block.text}</h4>;
    case 'liste_puces':
      return (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
          {(block.items || []).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case 'tableau':
      return <TableBlockView headers={block.headers} rows={block.rows} />;
    case 'encadre':
      return <Callout text={block.text} />;
    case 'photo_placeholder':
      return <PhotoPlaceholder caption={block.caption} />;
    case 'paragraphe':
    default:
      return <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{block.text}</p>;
  }
}

export default function ProcedureContentView({ content }) {
  if (!content) return null;
  const sections = content.sections || [];
  const documentsAssocies = content.documents_associes || [];

  // Sommaire compact : seulement s'il y a de quoi naviguer.
  const tocItems = [
    ...sections.map((s) => ({ id: `section-${s.key}`, label: s.label })),
    documentsAssocies.length > 0 && { id: 'documents-associes', label: 'Documents associés' },
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      {tocItems.length >= 3 && (
        <nav className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
          {tocItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-primary/40 hover:bg-primary/5 hover:text-primary-700"
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}

      {sections.map((section) => (
        <div key={section.key} id={`section-${section.key}`} className="scroll-mt-16">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{section.label}</p>
          {(section.blocks || []).length > 0 ? (
            section.blocks.map((block) => <BlockView key={block.id} block={block} />)
          ) : (
            <p className="mt-1 text-sm italic text-slate-400">Non renseigné</p>
          )}
        </div>
      ))}

      {documentsAssocies.length > 0 && (
        <div id="documents-associes" className="scroll-mt-16">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documents associés</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
            {documentsAssocies.map((doc, i) => (
              <li key={i}>{doc}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
