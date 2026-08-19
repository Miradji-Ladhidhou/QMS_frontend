import { useLayoutEffect, useRef } from 'react';

// Remplace <textarea> partout dans l'app : la hauteur suit le contenu au lieu d'une zone
// fixe avec barre de défilement interne — `rows` reste un point de départ (hauteur minimale
// avant que le texte ne la dépasse), la largeur reste pilotée par le className de l'appelant
// (`w-full` partout dans l'app) comme avant. useLayoutEffect plutôt que useEffect : ajuste la
// hauteur avant la peinture du navigateur, sans à-coup visible pendant la frappe.
export default function AutoTextarea({ value, className = '', ...props }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return <textarea ref={ref} value={value} className={`resize-none overflow-hidden ${className}`} {...props} />;
}
