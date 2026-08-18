import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import CompanySettings from '../components/CompanySettings.jsx';
import CategoryManager from '../components/CategoryManager.jsx';
import UserManager from '../components/UserManager.jsx';
import NotificationPreferences from '../components/NotificationPreferences.jsx';
import CapaDelaysSettings from '../components/CapaDelaysSettings.jsx';
import ProfileSettings from '../components/ProfileSettings.jsx';
import Groups from './Groups.jsx';

const TABS = [
  { id: 'company', label: 'Entreprise' },
  { id: 'categories', label: 'Catégories' },
  { id: 'users', label: 'Utilisateurs' },
  { id: 'groups', label: 'Groupes', adminOnly: true },
  { id: 'capa', label: 'CAPA', adminOnly: true },
  { id: 'profile', label: 'Mon profil' },
  { id: 'notifications', label: 'Notifications' },
];

export default function Settings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('company');

  function loadCurrentUser() {
    api
      .get('/users/me')
      .then(({ data }) => setCurrentUser(data))
      .catch(() => {});
  }

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Paramètres</h1>

      <div className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.filter((tab) => !tab.adminOnly || isAdmin).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {activeTab === 'company' && <CompanySettings isAdmin={isAdmin} />}
        {activeTab === 'categories' && <CategoryManager isAdmin={isAdmin} />}
        {activeTab === 'users' && <UserManager currentUser={currentUser} isAdmin={isAdmin} />}
        {activeTab === 'groups' && isAdmin && <Groups />}
        {activeTab === 'capa' && isAdmin && <CapaDelaysSettings />}
        {activeTab === 'profile' && currentUser && (
          <ProfileSettings currentUser={currentUser} onUpdated={(data) => setCurrentUser((prev) => ({ ...prev, ...data }))} />
        )}
        {activeTab === 'notifications' && <NotificationPreferences />}
      </div>
    </div>
  );
}
