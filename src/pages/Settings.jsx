import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import CompanySettings from '../components/CompanySettings.jsx';
import CategoryManager from '../components/CategoryManager.jsx';
import UserManager from '../components/UserManager.jsx';

export default function Settings() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    api
      .get('/users/me')
      .then(({ data }) => setCurrentUser(data))
      .catch(() => {});
  }, []);

  const isAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin';

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Paramètres</h1>
      <div className="mt-4 space-y-6">
        <CompanySettings isAdmin={isAdmin} />
        <CategoryManager />
        <UserManager isAdmin={isAdmin} />
      </div>
    </div>
  );
}
