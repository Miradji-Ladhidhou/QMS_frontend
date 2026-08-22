// window.open() appelé APRÈS un await n'est plus reconnu comme une action utilisateur directe
// par Safari iOS — bloqué silencieusement, sans erreur ni onglet, ce qui donnait l'impression
// que "le téléchargement ne marche pas" sur iPhone (fonctionnait ailleurs, où les navigateurs
// sont plus tolérants sur ce délai). Fix : ouvrir un onglet vide de façon SYNCHRONE, dans le
// call stack du clic, avant le moindre await — un onglet déjà ouvert reste navigable plus tard
// sans redevenir sujet au blocage. À appeler tout au début du handler, avant le premier await.
//
// PAS de flag "noopener" ici : la spec impose alors que window.open() renvoie null (pour
// empêcher la page ouverte d'accéder à window.opener) — on perdrait alors toute référence pour
// naviguer l'onglet plus tard, qui resterait vide indéfiniment (bug réel rencontré : "page
// blanche quand j'appuie sur télécharger"). Sans danger ici : l'URL naviguée vient toujours de
// notre propre backend ou de Supabase, jamais d'un lien tiers fourni par l'utilisateur.
export function openBlankTab() {
  return window.open('', '_blank');
}
