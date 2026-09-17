import { useLocation, useNavigate } from 'react-router-dom';

// Bouton "Retour" des pages de détail (CapaDetail, DocumentDetail, RiskDetail...) — navigate(-1)
// reprend la VRAIE page précédente (donc un dossier ouvert via ?folder=..., voir
// useFolderNavigation.js, ou des filtres/tri actifs), plutôt qu'un chemin figé vers la racine
// du module qui faisait perdre le dossier/les filtres à chaque retour (bug réel constaté).
// Repli sur fallbackPath UNIQUEMENT quand il n'existe aucune entrée d'historique interne à
// l'appli (ouverture directe via un lien externe, une notification, un favori) — location.key
// vaut alors 'default', seul cas où reculer d'un cran risquerait de sortir de l'application.
export function useSmartBack(fallbackPath) {
  const navigate = useNavigate();
  const location = useLocation();

  return function goBack() {
    if (location.key === 'default') {
      navigate(fallbackPath);
    } else {
      navigate(-1);
    }
  };
}
