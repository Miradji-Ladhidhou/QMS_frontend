import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { api } from '../lib/api.js';
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '../lib/roles.js';

export default function UserManager({ isAdmin }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', full_name: '', role: 'member' });
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [submittingInvite, setSubmittingInvite] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch {
      setError('Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleRoleChange(user, role) {
    setUpdatingId(user.id);
    setError('');

    try {
      const { data } = await api.patch(`/users/${user.id}`, { role });
      setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, ...data } : item)));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de mettre à jour le rôle.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleInviteSubmit(event) {
    event.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    setSubmittingInvite(true);

    try {
      const { data } = await api.post('/users/invite', inviteForm);
      setUsers((prev) =>
        [...prev, { id: data.id, full_name: data.full_name, role: data.role }].sort((a, b) =>
          a.full_name.localeCompare(b.full_name)
        )
      );
      setInviteSuccess(`Invitation envoyée à ${data.email}.`);
      setInviteForm({ email: '', full_name: '', role: 'member' });
      setIsInviting(false);
    } catch (err) {
      setInviteError(err.response?.data?.error || "Impossible d'envoyer l'invitation.");
    } finally {
      setSubmittingInvite(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Utilisateurs</h2>
        {isAdmin && !isInviting && (
          <button
            type="button"
            onClick={() => setIsInviting(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <UserPlus size={16} />
            Inviter un utilisateur
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {isInviting && (
        <form onSubmit={handleInviteSubmit} className="mt-4 space-y-3 rounded-md border border-slate-200 p-4">
          {inviteError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {inviteError}
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nom complet</label>
              <input
                type="text"
                required
                value={inviteForm.full_name}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, full_name: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                value={inviteForm.email}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Rôle</label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, role: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submittingInvite}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {submittingInvite ? 'Envoi...' : "Envoyer l'invitation"}
            </button>
            <button
              type="button"
              onClick={() => setIsInviting(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {inviteSuccess && (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {inviteSuccess}
        </p>
      )}

      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-12 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {users.map((user) => (
            <li key={user.id} className="flex items-center justify-between gap-3 py-3">
              <span className="text-sm font-medium text-slate-800">{user.full_name}</span>
              {isAdmin && user.role !== 'owner' ? (
                <select
                  value={user.role}
                  disabled={updatingId === user.id}
                  onChange={(e) => handleRoleChange(user, e.target.value)}
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {ASSIGNABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {ROLE_LABELS[user.role] || user.role}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
