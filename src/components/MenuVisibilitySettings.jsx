import { useEffect, useState } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { NAV_ITEMS } from './Layout.jsx';

const ROLE_COLUMNS = [
  { role: 'manager', label: 'Manager' },
  { role: 'member', label: 'Membre' },
];

// Un admin voit toujours tout (voir GET /api/tenant/menu, routes/tenant.js) : une exception
// par utilisateur pour un admin n'aurait donc aucun effet — on ne les propose pas dans le
// sélecteur, pour ne pas laisser configurer un réglage qui ne sert à rien.
function nonAdminUsers(users) {
  return users.filter((user) => user.role !== 'admin');
}

export default function MenuVisibilitySettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [roleHidden, setRoleHidden] = useState({});
  const [userOverrides, setUserOverrides] = useState({});
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([api.get('/tenant/menu-settings'), api.get('/users')])
      .then(([{ data: settings }, { data: allUsers }]) => {
        setItems(settings.items);
        setRoleHidden(settings.role_hidden_items || {});
        setUserOverrides(settings.user_overrides || {});
        setUsers(nonAdminUsers(allUsers));
      })
      .catch(() => setError('Impossible de récupérer les réglages de visibilité.'))
      .finally(() => setLoading(false));
  }, []);

  // items vient du backend (source de vérité des clés valides) — on ne garde de NAV_ITEMS que
  // le libellé/icône correspondants, dans l'ordre déjà choisi pour le menu réel.
  const configurableNavItems = NAV_ITEMS.filter((item) => item.key && items.includes(item.key));

  function toggleRoleVisible(role, key) {
    setSaved(false);
    setRoleHidden((prev) => {
      const hidden = new Set(prev[role] || []);
      if (hidden.has(key)) hidden.delete(key);
      else hidden.add(key);
      return { ...prev, [role]: [...hidden] };
    });
  }

  // 3 états pour une exception : suivre le rôle (pas d'entrée), toujours afficher (true),
  // toujours masquer (false) — cycle simple au clic plutôt qu'un <select> par ligne.
  function cycleUserOverride(userId, key) {
    setSaved(false);
    setUserOverrides((prev) => {
      const current = prev[userId] || {};
      const next = { ...current };
      if (!(key in current)) next[key] = true;
      else if (current[key] === true) next[key] = false;
      else delete next[key];
      const nextForUser = Object.keys(next).length > 0 ? next : undefined;
      const { [userId]: _drop, ...rest } = prev;
      return nextForUser ? { ...rest, [userId]: nextForUser } : rest;
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    setSaved(false);
    try {
      const { data } = await api.patch('/tenant/menu-settings', {
        role_hidden_items: roleHidden,
        user_overrides: userOverrides,
      });
      setRoleHidden(data.role_hidden_items || {});
      setUserOverrides(data.user_overrides || {});
    } catch (err) {
      setSaveError(err.response?.data?.error || "Impossible d'enregistrer les réglages de visibilité.");
      setSaving(false);
      return;
    }
    setSaving(false);
    setSaved(true);
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  const selectedUser = users.find((user) => user.id === selectedUserId);
  const usersWithOverrides = users.filter((user) => userOverrides[user.id] && Object.keys(userOverrides[user.id]).length > 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Eye size={18} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Visibilité du menu</h2>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Choisissez quelles sections apparaissent dans le menu selon le rôle, avec des exceptions possibles par
          utilisateur. Un admin voit toujours toutes les sections.
        </p>

        {error && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2">Section</th>
                {ROLE_COLUMNS.map((col) => (
                  <th key={col.role} className="px-2 py-2 text-center">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {configurableNavItems.map((item) => (
                <tr key={item.key}>
                  <td className="flex items-center gap-2 px-2 py-2 text-slate-700">
                    <item.icon size={16} className="text-slate-400" />
                    {item.label}
                  </td>
                  {ROLE_COLUMNS.map((col) => (
                    <td key={col.role} className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={!(roleHidden[col.role] || []).includes(item.key)}
                        onChange={() => toggleRoleVisible(col.role, item.key)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-slate-900">Exceptions par utilisateur</h3>
        <p className="mt-1 text-sm text-slate-500">
          Forcer l'affichage ou le masquage d'une section pour une personne précise, quel que soit le réglage de
          son rôle.
        </p>

        {usersWithOverrides.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {usersWithOverrides.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => setSelectedUserId(user.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    selectedUserId === user.id
                      ? 'border-primary bg-primary-50 text-primary'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {user.full_name} · {Object.keys(userOverrides[user.id]).length} exception
                  {Object.keys(userOverrides[user.id]).length > 1 ? 's' : ''}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">Choisir une personne</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">Sélectionner...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name} ({user.role === 'manager' ? 'Manager' : 'Membre'})
              </option>
            ))}
          </select>
        </div>

        {selectedUser && (
          <ul className="mt-4 divide-y divide-slate-100 rounded-md border border-slate-200">
            {configurableNavItems.map((item) => {
              const override = userOverrides[selectedUser.id]?.[item.key];
              const stateLabel = override === true ? 'Toujours affiché' : override === false ? 'Toujours masqué' : 'Suit le rôle';
              const stateClass =
                override === true
                  ? 'bg-emerald-100 text-emerald-700'
                  : override === false
                    ? 'bg-red-100 text-red-700'
                    : 'bg-slate-100 text-slate-500';
              return (
                <li key={item.key} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-slate-700">
                    <item.icon size={16} className="text-slate-400" />
                    {item.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => cycleUserOverride(selectedUser.id, item.key)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${stateClass}`}
                  >
                    {stateLabel}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {saveError && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{saveError}</p>
      )}
      {saved && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Réglages de visibilité enregistrés.
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </div>
  );
}
