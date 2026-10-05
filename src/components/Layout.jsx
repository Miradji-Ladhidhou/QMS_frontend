import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Contact,
  FileCheck,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareWarning,
  PackageX,
  RefreshCw,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Smile,
  CalendarClock,
  Thermometer,
  Truck,
  Users2,
  Wrench,
  X,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { api } from '../lib/api.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useTenant } from '../lib/useTenant.js';
import { useRole } from '../lib/useRole.js';
import { useMenuVisibility } from '../lib/useMenuVisibility.js';
import { useInactivityLogout } from '../lib/useInactivityLogout.js';
import { ROLE_LABELS } from '../lib/roles.js';
import { getTenantLogoPublicUrl } from '../lib/storage.js';
import NotificationBell from './NotificationBell.jsx';
import AppLogo from './AppLogo.jsx';
import AiQuotaBar from './AiQuotaBar.jsx';
import { APP_MODULE_LABELS } from '../lib/appModules.jsx';
import { getActiveSidebarCategory, getSidebarCategories } from '../lib/sidebarNavigation.js';

// Déconnexion automatique après une heure sans interaction (souris, clavier, scroll, tactile) —
// voir useInactivityLogout.js.
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;

// Rafraîchie chaque minute (pas chaque seconde) : le menu n'affiche pas les secondes, inutile
// de re-render 60x plus souvent que ce qui est visible.
function useNow() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  return now;
}

// Repli de <Suspense> autour du SEUL <Outlet/> (voir plus bas) plutôt que de toute l'appli
// (comme avant, dans App.jsx) : sans ce changement, la première visite de chaque page encore
// jamais chargée dans la session faisait disparaître tout le menu latéral (Layout entier
// démonté par Suspense) pour le remplacer par "Chargement...", avant de tout redessiner — une
// des principales causes des pages qui "saccadaient" (bug réel constaté). Ici, seule la zone
// de contenu affiche cette barre pendant que le menu reste visible et cliquable.
function ContentLoading() {
  return (
    <div className="relative h-1 overflow-hidden rounded-full bg-primary-100">
      <div className="route-loading-bar absolute inset-y-0 left-0 w-1/3 rounded-full bg-primary" />
    </div>
  );
}

function initialsOf(fullName) {
  if (!fullName) return '?';
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

// Chaque libellé reprend exactement le h1 affiché sur la page correspondante (voir
// Audits.jsx, Risks.jsx, ManagementReviews.jsx, Complaints.jsx, MyApprovals.jsx...) : un nom
// seul ("Audits", "Risques", "Revues") ne dit pas ce que la page fait, alors que son propre
// titre a déjà été choisi pour être clair — le menu doit rester cohérent avec lui plutôt que
// d'en inventer une version raccourcie et plus ambiguë.
// key : identifiant stable pour la visibilité configurable par rôle/utilisateur (Paramètres >
// Visibilité, voir MenuVisibilitySettings.jsx) — indépendant de `to`, pour ne jamais casser un
// réglage déjà enregistré si une route change un jour. Dupliqué côté backend
// (routes/tenant.js#MENU_ITEM_KEYS) : deux repos séparés, pas de package partagé. Les entrées
// adminOnly n'ont pas besoin de key : réservées à l'admin de façon fixe, jamais configurables.
// Exporté pour MenuVisibilitySettings.jsx (Paramètres > Visibilité), qui a besoin des mêmes
// libellés/icônes pour lister les sections configurables sans les redéfinir à côté.
// Les catégories utilisent uniquement les liens individuels visibles de ce catalogue ;
// leur ordre et leur regroupement sont définis dans sidebarNavigation.js.
export const NAV_ITEMS = [
  { key: 'dashboard', to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { key: 'planning', to: '/planning', label: 'Planning', icon: CalendarClock },
  // Gardée uniquement pour la configuration de visibilité (voir le lien fusionné juste en
  // dessous, qui reste alwaysVisible pour préserver l'accessibilité de Politique qualité —
  // ISO 9001 §5.2) : n'apparaît plus comme lien séparé dans le menu latéral.
  { key: 'documents', to: '/documents', label: 'Documents', icon: FileText },
  // Fusionne Documents, Procédures ('procedures' plus bas), Mes approbations ('my-approvals'
  // plus bas) et Politique qualité (voir DocumentsHub.jsx) — lien de menu volontairement
  // alwaysVisible (pas de `key` propre, comme l'était Politique qualité seule auparavant) :
  // ISO 9001 §5.2 exige que la politique qualité reste joignable quel que soit ce que l'admin a
  // caché pour un rôle, y compris si 'documents', 'procedures' ou 'my-approvals' sont masqués —
  // DocumentsHub.jsx n'affiche alors plus que l'onglet Politique qualité. Voir aussi le
  // commentaire équivalent sur 'prise-en-main' plus bas.
  // matchPaths : métadonnées historiques du lien fusionné, masqué dans le menu actuel.
  // Chaque module possède désormais son lien et utilise la détection native de NavLink.
  // children : mêmes onglets que DocumentsHub.jsx#TABS (to/label/icon/menuKey identiques) —
  // affichés en sous-menu dépliable pour qu'on sache ce qu'il y a dans "Documents" sans avoir
  // à l'ouvrir, et pour sauter directement sur un onglet. quality-policy sans menuKey : jamais
  // filtré, comme dans DocumentsHub.jsx (Politique qualité doit rester joignable, ISO 9001 §5.2).
  {
    to: '/documents',
    label: 'Documents',
    icon: FileText,
    hiddenFromSidebar: true,
    alwaysVisible: true,
    matchPaths: ['/documents', '/procedures', '/my-approvals', '/quality-policy'],
    children: [
      { to: '/documents', label: 'Documents', icon: FileText, menuKey: 'documents' },
      { to: '/procedures', label: 'Procédures', icon: FileCheck, menuKey: 'procedures' },
      { to: '/my-approvals', label: 'Mes approbations', icon: CheckSquare, menuKey: 'my-approvals' },
      { to: '/quality-policy', label: 'Politique qualité', icon: ScrollText },
    ],
  },
  // Fusionné avec PDCA et QQOQCCP (voir ImprovementActions.jsx, qui assemble les trois pages
  // en onglets) sous ce seul lien de menu — même principe que 'complaints' plus bas : les
  // entrées 'pdca' et 'qqoqccp' restent dans ce tableau pour MenuVisibilitySettings.jsx mais
  // masquées du menu latéral.
  {
    to: '/capas',
    label: "Actions d'amélioration",
    icon: ClipboardList,
    hiddenFromSidebar: true,
    matchPaths: ['/capas', '/pdca', '/qqoqccp'],
    children: [
      { to: '/capas', label: 'CAPA', icon: ClipboardList, menuKey: 'capas' },
      { to: '/pdca', label: 'PDCA', icon: RefreshCw, menuKey: 'pdca' },
      { to: '/qqoqccp', label: 'QQOQCCP', icon: HelpCircle, menuKey: 'qqoqccp' },
    ],
  },
  // Fusionné avec Satisfaction client (voir CustomerFeedback.jsx, qui assemble les deux pages
  // en onglets) sous ce seul lien de menu — l'entrée 'customer-satisfaction' plus bas reste
  // dans ce tableau (nécessaire à MenuVisibilitySettings.jsx et à sa propre clé de visibilité)
  // mais masquée du menu latéral via hiddenFromSidebar : chaque module garde sa visibilité
  // configurable indépendamment, CustomerFeedback.jsx respecte les deux séparément.
  {
    to: '/complaints',
    label: 'Retours clients',
    icon: MessageSquareWarning,
    hiddenFromSidebar: true,
    matchPaths: ['/complaints', '/customer-satisfaction'],
    children: [
      { to: '/complaints', label: 'Réclamations', icon: MessageSquareWarning, menuKey: 'complaints' },
      { to: '/customer-satisfaction', label: 'Satisfaction', icon: Smile, menuKey: 'customer-satisfaction' },
    ],
  },
  // Fusionné avec Personnel (voir HumanResources.jsx, qui assemble les deux pages en onglets)
  // sous ce seul lien de menu — clé porteuse volontairement 'trainings' plutôt que 'employees'
  // (masquée par défaut pour manager/member, voir DEFAULT_HIDDEN_FOR_ROLE côté backend) : voir
  // le commentaire détaillé dans HumanResources.jsx. L'entrée 'employees' plus bas reste dans
  // ce tableau pour MenuVisibilitySettings.jsx mais masquée du menu latéral.
  {
    to: '/trainings',
    label: 'Ressources humaines',
    icon: GraduationCap,
    hiddenFromSidebar: true,
    matchPaths: ['/trainings', '/employees'],
    children: [
      { to: '/employees', label: 'Personnel', icon: Contact, menuKey: 'employees' },
      { to: '/trainings', label: 'Formations', icon: GraduationCap, menuKey: 'trainings' },
    ],
  },
  { key: 'kpis', to: '/kpis', label: 'KPIs', icon: BarChart3 },
  { key: 'capas', to: '/capas', label: 'CAPA', icon: ClipboardList },
  { key: 'complaints', to: '/complaints', label: 'Réclamations', icon: MessageSquareWarning },
  { key: 'trainings', to: '/trainings', label: 'Formations', icon: GraduationCap },
  { key: 'audits', to: '/audits', label: 'Audits internes', icon: ClipboardCheck },
  { key: 'risks', to: '/risks', label: 'Registre des risques', icon: ShieldAlert },
  { key: 'accidents', to: '/accidents', label: 'Accidents du travail', icon: Siren },
  // Gardée uniquement pour la configuration de visibilité (voir commentaire sur 'capas' plus
  // haut, fusionné avec PDCA et QQOQCCP dans ImprovementActions.jsx) : n'apparaît plus comme
  // lien séparé dans le menu latéral.
  { key: 'qqoqccp', to: '/qqoqccp', label: 'QQOQCCP', icon: HelpCircle },
  // Fusionné avec Revues de direction (voir QmsOversight.jsx) sous ce seul lien de menu —
  // même principe que 'complaints' plus haut : l'entrée 'management-reviews' reste dans ce
  // tableau pour MenuVisibilitySettings.jsx mais masquée du menu latéral.
  {
    to: '/audits',
    label: 'Pilotage du SMQ',
    icon: ClipboardCheck,
    hiddenFromSidebar: true,
    matchPaths: ['/audits', '/management-reviews'],
    children: [
      { to: '/audits', label: 'Audits internes', icon: ClipboardCheck, menuKey: 'audits' },
      { to: '/management-reviews', label: 'Revues de direction', icon: Users2, menuKey: 'management-reviews' },
    ],
  },
  // Fusionné avec HACCP (voir RiskManagement.jsx, qui assemble les deux pages en onglets)
  // sous ce seul lien de menu — même principe que 'complaints' plus haut : l'entrée 'haccp'
  // reste dans ce tableau pour MenuVisibilitySettings.jsx mais masquée du menu latéral.
  {
    to: '/risks',
    label: 'Gestion des risques',
    icon: ShieldAlert,
    hiddenFromSidebar: true,
    matchPaths: ['/risks', '/haccp'],
    children: [
      { to: '/risks', label: 'Registre des risques', icon: ShieldAlert, menuKey: 'risks' },
      { to: '/haccp', label: 'HACCP', icon: Thermometer, menuKey: 'haccp' },
    ],
  },
  // Gardée uniquement pour la configuration de visibilité (voir commentaire sur 'risks'
  // ci-dessus) : n'apparaît plus comme lien séparé dans le menu latéral.
  { key: 'haccp', to: '/haccp', label: 'HACCP', icon: Thermometer },
  { key: 'suppliers', to: '/suppliers', label: 'Évaluation fournisseurs', icon: Truck },
  // Gardée uniquement pour la configuration de visibilité (voir commentaire sur 'audits'
  // plus haut) : n'apparaît plus comme lien séparé dans le menu latéral.
  { key: 'management-reviews', to: '/management-reviews', label: 'Revues de direction', icon: Users2 },
  // Gardée uniquement pour la configuration de visibilité (voir le lien fusionné sur
  // 'documents' plus haut, qui reste alwaysVisible pour préserver l'accessibilité de
  // Politique qualité — ISO 9001 §5.2) : n'apparaît plus comme lien séparé dans le menu
  // latéral.
  { key: 'procedures', to: '/procedures', label: 'Procédures', icon: FileCheck },
  // Fusionné avec Non-conformités produit/service (voir Incidents.jsx, qui assemble les deux
  // pages en onglets) sous ce seul lien de menu — même principe que 'complaints' plus haut :
  // l'entrée 'nonconforming-outputs' plus bas reste dans ce tableau pour
  // MenuVisibilitySettings.jsx mais masquée du menu latéral.
  {
    to: '/accidents',
    label: 'Signalements',
    icon: Siren,
    hiddenFromSidebar: true,
    matchPaths: ['/accidents', '/nonconforming-outputs'],
    children: [
      { to: '/accidents', label: 'Accidents du travail', icon: Siren, menuKey: 'accidents' },
      { to: '/nonconforming-outputs', label: 'Non-conformités produit/service', icon: PackageX, menuKey: 'nonconforming-outputs' },
    ],
  },
  // Gardée uniquement pour la configuration de visibilité (voir commentaire sur 'capas' plus
  // haut) : n'apparaît plus comme lien séparé dans le menu latéral.
  { key: 'pdca', to: '/pdca', label: 'PDCA', icon: RefreshCw },
  // Gardée uniquement pour la configuration de visibilité (voir commentaire sur 'accidents'
  // ci-dessus) : n'apparaît plus comme lien séparé dans le menu latéral.
  {
    key: 'nonconforming-outputs',
    to: '/nonconforming-outputs',
    label: 'Non-conformités produit/service',
    icon: PackageX,
  },
  // Gardée uniquement pour la configuration de visibilité (voir commentaire sur 'complaints'
  // ci-dessus) : n'apparaît plus comme lien séparé dans le menu latéral.
  { key: 'customer-satisfaction', to: '/customer-satisfaction', label: 'Satisfaction client', icon: Smile },
  // Gardée uniquement pour la configuration de visibilité (voir le lien fusionné plus haut,
  // sur 'documents') : n'apparaît plus comme lien séparé dans le menu latéral.
  { key: 'my-approvals', to: '/my-approvals', label: 'Mes approbations', icon: CheckSquare },
  { to: '/quality-policy', label: 'Politique qualité', icon: ScrollText, alwaysVisible: true },
  // Jamais configurable, comme Paramètres plus bas — mais ouvert à tous les rôles, pas
  // seulement admin (voir alwaysVisible dans le filtre ci-dessous) : une page d'aide doit
  // rester joignable quel que soit ce que l'admin a caché pour ce rôle.
  { to: '/prise-en-main', label: 'Prise en main', icon: BookOpen, alwaysVisible: true },
  // Configurables comme les autres (Paramètres > Visibilité), mais masquées par défaut pour
  // manager/member tant que l'admin n'a rien changé (voir DEFAULT_HIDDEN_FOR_ROLE côté
  // backend) — leurs données GET sont déjà ouvertes à tous les rôles, seules les mutations
  // restent réservées à l'admin (voir services.js/employees.js), donc pas de risque de casser
  // la page en l'ouvrant à d'autres rôles.
  { key: 'services', to: '/services', label: 'Services', icon: Wrench },
  // Gardée uniquement pour la configuration de visibilité (voir commentaire sur 'trainings'
  // plus haut, fusionné avec Personnel dans HumanResources.jsx) : n'apparaît plus comme lien
  // séparé dans le menu latéral.
  { key: 'employees', to: '/employees', label: 'Personnel', icon: Contact },
  // Jamais configurable, comme Prise en main plus haut : c'est le seul endroit qui permet de
  // corriger la visibilité du menu, donc aucune combinaison de règles ne doit jamais pouvoir le
  // faire disparaître pour un admin. Pas adminOnly non plus (corrigé) : la page elle-même
  // filtre déjà ses onglets par rôle (voir Settings.jsx, TAB_GROUPS) — "Mon profil",
  // "Notifications" et surtout "Politique qualité" (ISO 9001 §5.2, doit rester consultable par
  // tout le monde) y restent accessibles à un manager/member. Sans ce lien de menu, ces
  // onglets étaient inatteignables en pratique (route /settings non gardée par rôle, mais
  // jamais liée) : la politique qualité était donc invisible pour quiconque n'est pas admin,
  // malgré son intention explicite d'être ouverte à tout le tenant.
  { to: '/settings', label: 'Paramètres', icon: Settings, alwaysVisible: true },
];

export default function Layout() {
  useInactivityLogout(INACTIVITY_TIMEOUT_MS);
  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!(event.target instanceof Element)) return;

      document.querySelectorAll('details[open]').forEach((popup) => {
        if (!popup.contains(event.target)) popup.open = false;
      });

      const backdrop = event.target;
      if (!backdrop.classList.contains('fixed') || !backdrop.classList.contains('inset-0')) return;

      const closeButton = backdrop.querySelector(
        'button[aria-label*="Fermer"], button[aria-label*="Close"], button[title*="Fermer"], button[title*="Close"]'
      );
      if (closeButton instanceof HTMLButtonElement) {
        closeButton.click();
        return;
      }

      const cancelButton = Array.from(backdrop.querySelectorAll('button')).find((button) =>
        ['annuler', 'fermer', 'cancel', 'close', 'retour'].includes(button.textContent.trim().toLocaleLowerCase('fr'))
      );
      cancelButton?.click();
    }

    document.addEventListener('click', closeOnOutsideClick);
    return () => document.removeEventListener('click', closeOnOutsideClick);
  }, []);

  const currentUser = useCurrentUser();
  const tenant = useTenant();
  const role = useRole();
  const visibleMenuKeys = useMenuVisibility();
  const logoUrl = getTenantLogoPublicUrl(tenant?.logo_url);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(() => new Set());
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarCategories = getSidebarCategories(NAV_ITEMS, {
    role,
    appModules: tenant?.app_modules,
    visibleMenuKeys,
  });
  const activeCategoryId = getActiveSidebarCategory(sidebarCategories, location.pathname);
  const now = useNow();
  const timeZone = tenant?.timezone || 'UTC';
  const routeModule = Object.entries({
    '/planning': 'planning',
    '/tasks': 'planning',
    '/documents': 'documents',
    '/capas': 'capas',
    '/complaints': 'complaints',
    '/trainings': 'trainings',
    '/employees': 'employees',
    '/kpis': 'kpis',
    '/qqoqccp': 'qqoqccp',
    '/audits': 'audits',
    '/risks': 'risks',
    '/haccp': 'haccp',
    '/suppliers': 'suppliers',
    '/management-reviews': 'management-reviews',
    '/procedures': 'procedures',
    '/accidents': 'accidents',
    '/pdca': 'pdca',
    '/nonconforming-outputs': 'nonconforming-outputs',
    '/customer-satisfaction': 'customer-satisfaction',
    '/my-approvals': 'my-approvals',
    '/services': 'services',
  }).find(([prefix]) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`))?.[1]
    || (location.pathname === '/' ? 'dashboard' : null);
  const disabledRouteModule = tenant && routeModule && tenant.app_modules?.[routeModule] === false ? routeModule : null;
  // Paramétrable via Paramètres > Informations de l'entreprise (voir CompanySettings.jsx) —
  // formaté avec le fuseau du tenant plutôt que celui du navigateur, pour rester cohérent avec
  // les échéances (CAPA, formations...) que le backend calcule selon ce même fuseau.
  const timeLabel = new Intl.DateTimeFormat('fr-FR', { timeZone, hour: '2-digit', minute: '2-digit' }).format(now);
  const dateLabel = new Intl.DateTimeFormat('fr-FR', { timeZone, day: 'numeric', month: 'long', year: 'numeric' }).format(now);

  useEffect(() => {
    api
      .get('/workflows/mine')
      .then(({ data }) => setPendingApprovalsCount(data.length))
      .catch(() => {});
  }, []);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  useEffect(() => {
    if (!isMenuOpen) return;
    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsMenuOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  function toggleCategory(id) {
    if (id === activeCategoryId) return;
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    // Journalisé AVANT signOut() : après, le jeton nécessaire à /auth/activity a disparu
    // (voir services/activityLog.js, POST /auth/activity côté backend).
    await api.post('/auth/activity', { type: 'logout', reason: 'manual' }).catch(() => {});
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-primary px-4 py-3 text-white md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-7 w-7 shrink-0 rounded bg-white/10 object-contain p-0.5" />
          ) : (
            <AppLogo className="h-7 w-7 shrink-0 rounded" />
          )}
          <span className="truncate text-lg font-semibold">{tenant?.name || 'QMS SaaS'}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => window.location.reload()}
            aria-label="Recharger la page"
            className="rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw size={20} />
          </button>
          <NotificationBell variant="mobile" />
          <button type="button" onClick={() => setIsMenuOpen(true)} aria-label="Ouvrir le menu" aria-expanded={isMenuOpen} aria-controls="sidebar-navigation" className="-mr-2 flex min-h-11 min-w-11 items-center justify-center p-2">
            <Menu size={24} />
          </button>
        </div>
      </header>

      {isMenuOpen && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={closeMenu} />}

      <aside
        id="sidebar-navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-y-auto overflow-x-hidden bg-primary text-white transition-transform duration-200 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full invisible md:visible'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex min-w-0 items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-8 w-8 shrink-0 rounded bg-white/10 object-contain p-0.5" />
            ) : (
              <AppLogo className="h-8 w-8 shrink-0 rounded" />
            )}
            <span className="truncate text-xl font-semibold">{tenant?.name || 'QMS SaaS'}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => window.location.reload()}
              aria-label="Recharger la page"
              className="rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <RefreshCw size={18} />
            </button>
            <div className="hidden md:block">
              <NotificationBell variant="sidebar" />
            </div>
            <button type="button" onClick={closeMenu} aria-label="Fermer le menu" className="flex min-h-11 min-w-11 items-center justify-center p-2 md:hidden">
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="mx-3 mb-3 flex items-baseline gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white/80">
          <span className="text-base font-semibold tabular-nums text-white">{timeLabel}</span>
          <span className="truncate text-xs capitalize">{dateLabel}</span>
        </div>

        {currentUser && (
          <div className="mx-3 mb-3 flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white">
              {initialsOf(currentUser.full_name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{currentUser.full_name}</p>
              {/* Le nom de l'entreprise est déjà affiché en haut à côté du logo — pas la peine
                  de le répéter ici, cette carte ne porte plus que l'identité de la personne. */}
              <p className="truncate text-xs text-white/60">{ROLE_LABELS[currentUser.role] || currentUser.role}</p>
            </div>
          </div>
        )}

        <nav aria-label="Navigation principale" className="flex-1 space-y-2 px-3 pb-6">
          {sidebarCategories.map((category) => {
            const active = category.id === activeCategoryId;
            const expanded = active || expandedCategories.has(category.id);
            return (
              <section key={category.id} className="border-t border-white/10 pt-1">
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  aria-expanded={expanded}
                  aria-controls={`sidebar-${category.id}`}
                  aria-disabled={active}
                  title={active ? 'La catégorie du module actif reste ouverte' : undefined}
                  className={`flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold leading-relaxed transition-colors ${
                    active ? 'text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex-1">{category.label}</span>
                  {expanded ? <ChevronDown size={16} className="shrink-0" /> : <ChevronRight size={16} className="shrink-0" />}
                </button>
                <div id={`sidebar-${category.id}`} hidden={!expanded} className="space-y-1">
                  {category.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={closeMenu}
                      className={({ isActive }) =>
                        `flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                          isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                        }`
                      }
                    >
                      <item.icon size={20} className="shrink-0" />
                      <span className="min-w-0 flex-1">{item.label}</span>
                      {item.to === '/my-approvals' && pendingApprovalsCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold text-primary">
                          {pendingApprovalsCount}
                        </span>
                      )}
                    </NavLink>
                  ))}
                  {category.id === 'administration' && (
                    <>
                      {currentUser?.is_super_admin && (
                        <NavLink
                          to="/super-admin"
                          onClick={closeMenu}
                          className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <ShieldCheck size={20} className="shrink-0" />
                          Super Admin
                        </NavLink>
                      )}
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-70"
                      >
                        {isLoggingOut ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />}
                        {isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}
                      </button>
                    </>
                  )}
                </div>
              </section>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 md:px-8 md:py-6">
        <AiQuotaBar />
        <Suspense fallback={<ContentLoading />}>
          <div key={location.pathname} className="page-transition">
            {disabledRouteModule ? (
              <section className="rounded-lg border border-amber-200 bg-amber-50 p-5" role="status">
                <h1 className="font-semibold text-amber-900">{APP_MODULE_LABELS[disabledRouteModule]} non inclus</h1>
                <p className="mt-1 text-sm text-amber-800">Ce module n’est pas inclus dans le forfait de votre entreprise. Contactez votre administrateur.</p>
              </section>
            ) : <Outlet />}
          </div>
        </Suspense>
      </main>
    </div>
  );
}
