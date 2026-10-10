import { useState } from 'react';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import CompanySettings from '../components/CompanySettings.jsx';
import UserManager from '../components/UserManager.jsx';
import NotificationPreferences from '../components/NotificationPreferences.jsx';
import CapaDelaysSettings from '../components/CapaDelaysSettings.jsx';
import DocumentReviewSettings from '../components/DocumentReviewSettings.jsx';
import DriveStorageSettings from '../components/DriveStorageSettings.jsx';
import MenuVisibilitySettings from '../components/MenuVisibilitySettings.jsx';
import ProfileSettings from '../components/ProfileSettings.jsx';
import QualityPolicySettings from '../components/QualityPolicySettings.jsx';
import RiskSettings from '../components/RiskSettings.jsx';
import SettingsDataSecurity from '../components/SettingsDataSecurity.jsx';
import SupplierSettingsModal from '../components/suppliers/SupplierSettingsModal.jsx';
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
      { id: 'visibility', label: 'Accès aux modules et navigation', adminOnly: true },
      { id: 'quality-policy', label: 'Politique qualité' },
    ],
  },
  {
    label: 'Modules',
    tabs: [
      { id: 'capa', label: 'CAPA', adminOnly: true },
      { id: 'documents', label: 'Documents', adminOnly: true },
      { id: 'risks', label: 'Risques', adminOnly: true },
      { id: 'suppliers', label: 'Fournisseurs', adminOnly: true },
    ],
  },
  {
    label: 'Sécurité',
    tabs: [
      { id: 'data-security', label: 'Données et sécurité' },
    ],
  },
];
// La personnalisation du gabarit des procédures (couleur, options visuelles, structure de
// sections, logo, aperçu) se passe désormais directement sur la page Procédures — bouton
// "Paramètres du gabarit" (voir Procedures.jsx#ProcedureTemplateSettingsModal), plus ici (voir
// le plan de refonte de la mise en page des procédures, point 2 : "tout doit se passer à cet
// endroit, pas une page de configuration séparée ailleurs dans l'app").

export default function Settings() {
  const currentUser = useCurrentUser();
  // Le callback OAuth Google Drive (backend) redirige vers /settings?drive=connected|error —
  // sans ce cas particulier, l'utilisateur atterrirait sur l'onglet "Entreprise" par défaut et
  // ne verrait jamais la confirmation d'activation ni l'erreur, puisque DriveStorageSettings
  // ne serait pas monté. ?tab=<id> reste le cas général pour tout futur lien direct vers un
  // onglet précis — le cas drive reste prioritaire puisqu'il pointe toujours vers "documents",
  // jamais un autre onglet.
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('drive')) return 'documents';
    const requested = params.get('tab');
    // Un ?tab=<id> inconnu (ex. anciens liens vers 'categories' / 'module-categories', onglets
    // supprimés depuis) retombe sur "Entreprise" plutôt que d'afficher une zone vide.
    const known = TAB_GROUPS.some((group) => group.tabs.some((tab) => tab.id === requested));
    return known ? requested : 'company';
  });


  const isAdmin = currentUser?.role === 'admin';

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Paramètres</h1>

      <nav aria-label="Sections des paramètres" className="mt-4 border-b border-slate-200 pb-4">
        <label htmlFor="settings-section" className="mb-1.5 block text-sm font-medium text-slate-700">
          Rubrique des paramètres
        </label>
        <select
          id="settings-section"
          value={activeTab}
          onChange={(event) => setActiveTab(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary sm:max-w-md"
        >
        {TAB_GROUPS.map((group) => {
          const visibleTabs = group.tabs.filter((tab) => !tab.adminOnly || isAdmin);
          if (visibleTabs.length === 0) return null;

          return (
            <optgroup key={group.label} label={group.label}>
              {visibleTabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </optgroup>
          );
        })}
        </select>
      </nav>

      <section className="mt-4" aria-label="Contenu des paramètres">
        {activeTab === 'company' && <CompanySettings isAdmin={isAdmin} />}
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
        {activeTab === 'quality-policy' && <QualityPolicySettings isAdmin={isAdmin} isManager={currentUser?.role === 'manager'} />}
        {activeTab === 'risks' && isAdmin && <RiskSettings />}
        {activeTab === 'suppliers' && isAdmin && <SupplierSettingsModal embedded onSaved={() => {}} />}
        {activeTab === 'data-security' && (
          <SettingsDataSecurity
            isAdmin={isAdmin}
            isSuperAdmin={currentUser?.is_super_admin}
            canContactSupport={['admin', 'manager'].includes(currentUser?.role)}
          />
        )}
        {activeTab === 'profile' && currentUser && (
          <ProfileSettings
            currentUser={currentUser}
            onUpdated={(data) => window.dispatchEvent(new CustomEvent('current-user-updated', { detail: data }))}
          />
        )}
        {activeTab === 'notifications' && <NotificationPreferences />}
      </section>
    </div>
  );
}
