import { Link } from 'react-router-dom';
import { Mail, Building2, Users, Phone, User } from 'lucide-react';
import AppLogo from '../components/AppLogo.jsx';

// Même principe que TeamOff (SaaS_TeamOff/teamoff-frontend/src/pages/Auth/RegisterPage.jsx) :
// pas de formulaire d'inscription en libre-service, une page statique qui explique la marche à
// suivre et pré-remplit un email pour l'équipe — la création du compte reste un geste du super
// admin (voir SuperAdmin.jsx#CreateTenantModal), jamais automatique.
const CONTACT_EMAIL = 'saas.qms@gmail.com';
const MAILTO_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Demande de création de compte QMS SaaS')}&body=${encodeURIComponent(
  `Bonjour,

Je souhaite créer un compte entreprise sur QMS SaaS.

Nom de l'entreprise :
Email de l'entreprise :
Téléphone :
Nombre d'utilisateurs prévu :

Responsable du compte :
Prénom :
Nom :
Email :

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

        <h1 className="text-2xl font-semibold text-primary text-center mb-4">Demande de création de compte</h1>

        <p className="mb-4 text-sm text-slate-600">
          La création de compte se fait sur demande. Envoyez un email à l'adresse suivante en incluant les
          informations ci-dessous :
        </p>

        <a
          href={MAILTO_HREF}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <Mail size={16} />
          Envoyer un email à {CONTACT_EMAIL}
        </a>

        <div className="mb-2 text-sm font-medium text-slate-700">Informations à inclure dans votre email :</div>
        <ul className="mb-6 space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <Building2 size={16} className="mt-0.5 shrink-0 text-primary" />
            <span>
              <strong className="text-slate-800">Entreprise :</strong> nom, email, téléphone
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Users size={16} className="mt-0.5 shrink-0 text-primary" />
            <span>
              <strong className="text-slate-800">Effectif :</strong> nombre d'utilisateurs prévu
            </span>
          </li>
          <li className="flex items-start gap-2">
            <User size={16} className="mt-0.5 shrink-0 text-primary" />
            <span>
              <strong className="text-slate-800">Responsable du compte :</strong> prénom, nom, email
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Phone size={16} className="mt-0.5 shrink-0 text-primary" />
            <span>
              <strong className="text-slate-800">Numéro de téléphone</strong> pour vous contacter si besoin
            </span>
          </li>
        </ul>

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
