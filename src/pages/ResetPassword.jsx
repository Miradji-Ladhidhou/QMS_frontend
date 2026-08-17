import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [validLink, setValidLink] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setValidLink(true);
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setValidLink(true);
      }
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    const { error: authError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (authError) {
      setError("Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré.");
      return;
    }

    setDone(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-primary text-center mb-6">Nouveau mot de passe</h1>

        {!ready && <p className="text-sm text-slate-500 text-center">Vérification du lien...</p>}

        {ready && !validLink && !done && (
          <>
            <p className="text-sm text-slate-600 text-center">
              Ce lien de réinitialisation est invalide ou a expiré.
            </p>
            <Link
              to="/forgot-password"
              className="mt-6 block w-full text-center bg-primary text-white font-medium rounded-md py-3 hover:bg-primary-700 active:bg-primary-700 transition-colors"
            >
              Demander un nouveau lien
            </Link>
          </>
        )}

        {ready && validLink && done && (
          <>
            <p className="text-sm text-slate-600 text-center">Votre mot de passe a été mis à jour.</p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-6 block w-full text-center bg-primary text-white font-medium rounded-md py-3 hover:bg-primary-700 active:bg-primary-700 transition-colors"
            >
              Continuer
            </button>
          </>
        )}

        {ready && validLink && !done && (
          <>
            {error && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                  Nouveau mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white font-medium rounded-md py-3 hover:bg-primary-700 active:bg-primary-700 transition-colors disabled:opacity-60"
              >
                {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
