import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (authError) {
      setError("Impossible d'envoyer l'email pour le moment. Réessayez plus tard.");
      return;
    }

    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-primary text-center mb-2">Mot de passe oublié</h1>

        {sent ? (
          <>
            <p className="mt-4 text-sm text-slate-600 text-center">
              Si un compte existe avec l'adresse <span className="font-medium">{email}</span>, vous recevrez un
              email contenant un lien pour choisir un nouveau mot de passe.
            </p>
            <Link
              to="/login"
              className="mt-6 block w-full text-center bg-primary text-white font-medium rounded-md py-3 hover:bg-primary-700 active:bg-primary-700 transition-colors"
            >
              Retour à la connexion
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600 text-center mb-6">
              Indiquez votre email, nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>

            {error && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white font-medium rounded-md py-3 hover:bg-primary-700 active:bg-primary-700 transition-colors disabled:opacity-60"
              >
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              <Link to="/login" className="text-primary font-medium hover:underline">
                Retour à la connexion
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
