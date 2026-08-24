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

// Groupé par intention plutôt qu'en une seule rangée d'onglets à défiler (10 onglets à plat,
// difficiles à retrouver) — "Mon compte" d'abord (pertinent pour tout le monde, y compris un
// member), puis les réglages qui portent sur l'entreprise/ses membres, puis les catégories,
// puis les réglages propres à un module précis.
const TAB_GROUPS = [
  {
    label: 'Mon compte',
    tabs: [
      { id: 'profile', label: 'Mon profil' },
      { id: 'notifications', label: 'Notifications' },
    ],
  },
  {
    label: 'Entreprise',
    tabs: [
      { id: 'company', label: 'Entreprise' },
      { id: 'users', label: 'Utilisateurs' },
      { id: 'groups', label: 'Groupes', adminOnly: true },
      { id: 'visibility', label: 'Visibilité', adminOnly: true },
    ],
  },
  {
    label: 'Catégories',
    tabs: [
      { id: 'categories', label: 'Catégories documents' },
      { id: 'module-categories', label: 'Catégories modules' },
    ],
  },
  {
    label: 'Modules',
    tabs: [
      { id: 'capa', label: 'CAPA', adminOnly: true },
      { id: 'documents', label: 'Documents', adminOnly: true },
    ],
  },
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

      <div className="mt-4 space-y-4 border-b border-slate-200 pb-4">
        {TAB_GROUPS.map((group) => {
          const visibleTabs = group.tabs.filter((tab) => !tab.adminOnly || isAdmin);
          if (visibleTabs.length === 0) return null;

          return (
            <div key={group.label}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
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
