import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import QualityPolicySettings from '../components/QualityPolicySettings.jsx';

// Anciennement un onglet de Paramètres (réservé de fait à l'admin, faute de lien de menu
// accessible aux autres rôles — voir Layout.jsx) : sortie en page de menu à part entière pour
// que "communiquée, comprise et disponible" (ISO 9001 §5.2) soit vrai en pratique, pas
// seulement dans le code. Le composant QualityPolicySettings.jsx est inchangé, réutilisé tel
// quel (isAdmin gère déjà lecture seule vs révision).
export default function QualityPolicy() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    api
      .get('/users/me')
      .then(({ data }) => setCurrentUser(data))
      .catch(() => {});
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Politique qualité</h1>
      <div className="mt-4">
        <QualityPolicySettings isAdmin={isAdmin} />
      </div>
    </div>
  );
}
