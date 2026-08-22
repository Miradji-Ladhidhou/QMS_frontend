import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import CompanySettings from '../components/CompanySettings.jsx';
import CategoryManager from '../components/CategoryManager.jsx';
import UserManager from '../components/UserManager.jsx';
import NotificationPreferences from '../components/NotificationPreferences.jsx';
import CapaDelaysSettings from '../components/CapaDelaysSettings.jsx';
import DocumentReviewSettings from '../components/DocumentReviewSettings.jsx';
import DriveStorageSettings from '../components/DriveStorageSettings.jsx';
import MenuVisibilitySettings from '../components/MenuVisibilitySettings.jsx';
import ModuleCategoriesSettings from '../components/ModuleCategoriesSettings.jsx';
import ProfileSettings from '../components/ProfileSettings.jsx';
import Groups from './Groups.jsx';

const TABS = [
  { id: 'company', label: 'Entreprise' },
  { id: 'categories', label: 'Catégories documents' },
  { id: 'module-categories', label: 'Catégories modules' },
  { id: 'users', label: 'Utilisateurs' },
  { id: 'groups', label: 'Groupes', adminOnly: true },
  { id: 'capa', label: 'CAPA', adminOnly: true },
  { id: 'documents', label: 'Documents', adminOnly: true },
  { id: 'visibility', label: 'Visibilité', adminOnly: true },
  { id: 'profile', label: 'Mon profil' },
  { id: 'notifications', label: 'Notifications' },
];

export default function Settings() {
  const [currentUser, setCurrentUser] = useState(null);
  // Le callback OAuth Google Drive (backend) redirige vers /settings?drive=connected|error —
  // sans ce cas particulier, l'utilisateur atterrirait sur l'onglet "Entreprise" par défaut et
  // ne verrait jamais la confirmation d'activation ni l'erreur, puisque DriveStorageSettings
  // ne serait pas monté.
  const [activeTab, setActiveTab] = useState(() =>
    new URLSearchParams(window.location.search).has('drive') ? 'documents' : 'company'
  );

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
        {activeTab === 'module-categories' && <ModuleCategoriesSettings isAdmin={isAdmin} />}
        {activeTab === 'users' && <UserManager currentUser={currentUser} isAdmin={isAdmin} />}
        {activeTab === 'groups' && isAdmin && <Groups />}
        {activeTab === 'capa' && isAdmin && <CapaDelaysSettings />}
        {activeTab === 'documents' && isAdmin && (
          <div className="space-y-4">
            <DocumentReviewSettings />
            <DriveStorageSettings />
          </div>
        )}
        {activeTab === 'visibility' && isAdmin && <MenuVisibilitySettings />}
        {activeTab === 'profile' && currentUser && (
          <ProfileSettings currentUser={currentUser} onUpdated={(data) => setCurrentUser((prev) => ({ ...prev, ...data }))} />
        )}
        {activeTab === 'notifications' && <NotificationPreferences />}
      </div>
    </div>
  );
}
