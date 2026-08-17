import { useState } from 'react';
import { api } from '../lib/api.js';
import { supabase } from '../lib/supabase.js';

export default function ProfileSettings({ currentUser, onUpdated }) {
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleNameSubmit(event) {
    event.preventDefault();
    setNameError('');
    setNameSuccess('');
    setSavingName(true);

    try {
      const { data } = await api.patch('/users/me', { full_name: fullName });
      setNameSuccess('Nom mis à jour.');
      onUpdated?.(data);
    } catch (err) {
      setNameError(err.response?.data?.error || 'Impossible de mettre à jour le nom.');
    } finally {
      setSavingName(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSavingPassword(true);

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: currentPassword,
    });

    if (verifyError) {
      setPasswordError('Mot de passe actuel incorrect.');
      setSavingPassword(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    setSavingPassword(false);

    if (updateError) {
      setPasswordError('Impossible de mettre à jour le mot de passe.');
      return;
    }

    setPasswordSuccess('Mot de passe mis à jour.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Mon profil</h2>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            {currentUser?.email}
          </p>
        </div>

        {nameError && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {nameError}
          </p>
        )}
        {nameSuccess && (
          <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {nameSuccess}
          </p>
        )}

        <form onSubmit={handleNameSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-700">
              Nom complet
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:max-w-sm"
            />
          </div>
          <button
            type="submit"
            disabled={savingName}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {savingName ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Mot de passe</h2>

        {passwordError && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {passwordError}
          </p>
        )}
        {passwordSuccess && (
          <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {passwordSuccess}
          </p>
        )}

        <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3 sm:max-w-sm">
          <div>
            <label htmlFor="currentPassword" className="mb-1 block text-sm font-medium text-slate-700">
              Mot de passe actuel
            </label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-slate-700">
              Nouveau mot de passe
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="confirmNewPassword" className="mb-1 block text-sm font-medium text-slate-700">
              Confirmer le nouveau mot de passe
            </label>
            <input
              id="confirmNewPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {savingPassword ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}
