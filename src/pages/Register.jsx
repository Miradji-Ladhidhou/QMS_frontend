import { Link } from 'react-router-dom';
import { Mail, ShieldAlert } from 'lucide-react';
import AppLogo from '../components/AppLogo.jsx';

// Même principe que TeamOff (SaaS_TeamOff/teamoff-frontend/src/pages/Auth/RegisterPage.jsx) :
// pas de formulaire d'inscription en libre-service, une page statique qui explique la marche à
// suivre et pré-remplit un email pour l'équipe — la création du compte reste un geste du super
// admin (voir SuperAdmin.jsx#CreateTenantModal), jamais automatique.
const CONTACT_EMAIL = 'saas.qms@gmail.com';
const MAILTO_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Demande d’accès au pilote QMS SaaS')}&body=${encodeURIComponent(
  `Bonjour,

Je souhaite demander un accès au pilote de QMS SaaS.

Voici les informations concernant ma demande :
- Nom et prénom :
- Organisation et secteur d’activité :
- Fonction :
- Adresse email à associer à l’accès :
- Nombre de personnes qui participeront au pilote :
- Modules ou fonctionnalités que je souhaite tester :
- Besoins ou cas d’usage prioritaires :

Cordialement`
)}`;

export default function Register() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="flex flex-col items-center mb-6">
          <AppLogo className="h-12 w-12 rounded-xl mb-3" />
          <p className="text-lg font-semibold text-slate-900">
            QMS <span className="font-normal text-slate-400">SaaS</span>
          </p>
        </div>

        <h1 className="text-2xl font-semibold text-primary text-center mb-4">Demande d’accès au pilote</h1>

        <p className="mb-4 text-sm text-slate-600">
          QMS SaaS est un projet personnel non commercial en phase pilote, exploité depuis La Possession
          (97419), La Réunion. L’accès se demande par email ; aucun compte n’est créé automatiquement.
        </p>

        <div className="mb-5 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm leading-5 text-amber-950">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <p>
            Vous pouvez utiliser votre propre adresse email pour demander un accès. N’incluez pas de document,
            mot de passe ou donnée personnelle concernant un salarié, client ou fournisseur dans votre
            demande.
          </p>
        </div>

        <a
          href={MAILTO_HREF}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <Mail size={16} />
          Demander un accès de test
        </a>

        <p className="mb-6 text-center text-xs text-slate-500">
          Contact : <a className="text-primary hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>

        <p className="text-center text-sm text-slate-600">
          Déjà un compte ?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
