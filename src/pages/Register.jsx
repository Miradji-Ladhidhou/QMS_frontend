import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { api } from '../lib/api.js';
import AppLogo from '../components/AppLogo.jsx';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/register', { fullName, companyName, email, password });
      setSubmittedEmail(email);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer le compte.');
    } finally {
      setLoading(false);
    }
  }

  if (submittedEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 text-center">
          <div className="flex flex-col items-center mb-6">
            <AppLogo className="h-12 w-12 rounded-xl mb-3" />
            <p className="text-lg font-semibold text-slate-900">
              QMS <span className="font-normal text-slate-400">SaaS</span>
            </p>
          </div>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail size={22} className="text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Vérifiez votre email</h1>
          <p className="text-sm text-slate-600 mb-6">
            Un email de confirmation a été envoyé à <strong>{submittedEmail}</strong>. Cliquez sur le lien qu'il
            contient pour activer votre compte et pouvoir vous connecter.
          </p>
          <Link to="/login" className="text-primary font-medium hover:underline text-sm">
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="flex flex-col items-center mb-6">
          <AppLogo className="h-12 w-12 rounded-xl mb-3" />
          <p className="text-lg font-semibold text-slate-900">
            QMS <span className="font-normal text-slate-400">SaaS</span>
          </p>
        </div>

        <h1 className="text-2xl font-semibold text-primary text-center mb-6">Créer un compte</h1>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1">
              Nom complet
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-slate-700 mb-1">
              Entreprise
            </label>
            <input
              id="companyName"
              type="text"
              autoComplete="organization"
              required
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-medium rounded-md py-3 hover:bg-primary-700 active:bg-primary-700 transition-colors disabled:opacity-60"
          >
            {loading ? 'Création...' : 'Créer le compte'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          En créant un compte, vous acceptez les{' '}
          <Link to="/legal/cgu" className="text-slate-500 hover:underline">
            CGU
          </Link>{' '}
          et la{' '}
          <Link to="/legal/confidentialite" className="text-slate-500 hover:underline">
            politique de confidentialité
          </Link>
          .
        </p>

        <p className="mt-4 text-center text-sm text-slate-600">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
