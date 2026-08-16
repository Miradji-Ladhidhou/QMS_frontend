// Le backend délimite les correspondances avec <mark>/</mark> (ts_headline). On découpe sur ces
// marqueurs et on rend chaque segment comme du texte React (jamais dangerouslySetInnerHTML) :
// même si le contenu d'un document contient du HTML, il reste toujours affiché en texte brut.
export default function SearchSnippet({ snippet }) {
  if (!snippet) return null;

  const parts = snippet.split(/(<mark>|<\/mark>)/g);
  const nodes = [];
  let highlighting = false;

  parts.forEach((part, index) => {
    if (part === '<mark>') {
      highlighting = true;
      return;
    }
    if (part === '</mark>') {
      highlighting = false;
      return;
    }
    if (!part) return;

    nodes.push(
      highlighting ? (
        <mark key={index} className="rounded bg-amber-200 px-0.5 text-slate-900">
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  });

  return <p className="mt-1 line-clamp-2 text-sm text-slate-500">{nodes}</p>;
}
