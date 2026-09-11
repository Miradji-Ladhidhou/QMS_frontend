import { useCurrentUser } from '../lib/useCurrentUser.js';
import { isManagerRole } from '../lib/roles.js';
import QualityPolicySettings from '../components/QualityPolicySettings.jsx';

// Anciennement un onglet de Paramètres (réservé de fait à l'admin, faute de lien de menu
// accessible aux autres rôles — voir Layout.jsx) : sortie en page de menu à part entière pour
// que "communiquée, comprise et disponible" (ISO 9001 §5.2) soit vrai en pratique, pas
// seulement dans le code. Le composant QualityPolicySettings.jsx est inchangé, réutilisé tel
// quel (isAdmin gère lecture seule vs révision, isManager l'accès au panneau des accusés de
// lecture — même paire de rôles que côté backend, MANAGER_ROLES dans routes/qualityPolicy.js).
export default function QualityPolicy() {
  const currentUser = useCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const isManager = isManagerRole(currentUser?.role);

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Politique qualité</h1>
      <div className="mt-4">
        <QualityPolicySettings isAdmin={isAdmin} isManager={isManager} />
      </div>
    </div>
  );
}
