import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  Contact,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareWarning,
  RefreshCw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  CalendarClock,
  Truck,
  Users2,
  Wrench,
  X,
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

// Déconnexion automatique après une heure sans interaction (souris, clavier, scroll, tactile) —
// voir useInactivityLogout.js.
// TEMPORAIRE (debug) : 20s au lieu d'1h, pour vérifier rapidement que le mécanisme fonctionne
// sans attendre une heure à chaque test. À remettre à 60 * 60 * 1000 une fois confirmé.
const INACTIVITY_TIMEOUT_MS = 20 * 1000;

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
export const NAV_ITEMS = [
  { key: 'dashboard', to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { key: 'planning', to: '/planning', label: 'Planning', icon: CalendarClock },
  { key: 'documents', to: '/documents', label: 'Documents', icon: FileText },
  { key: 'capas', to: '/capas', label: 'CAPA', icon: ClipboardList },
  { key: 'complaints', to: '/complaints', label: 'Réclamations clients', icon: MessageSquareWarning },
  { key: 'trainings', to: '/trainings', label: 'Formations', icon: GraduationCap },
  { key: 'kpis', to: '/kpis', label: 'KPIs', icon: BarChart3 },
  { key: 'qqoqccp', to: '/qqoqccp', label: 'QQOQCCP', icon: HelpCircle },
  { key: 'audits', to: '/audits', label: 'Audits internes', icon: ClipboardCheck },
  { key: 'risks', to: '/risks', label: 'Registre des risques', icon: ShieldAlert },
  { key: 'suppliers', to: '/suppliers', label: 'Évaluation fournisseurs', icon: Truck },
  { key: 'management-reviews', to: '/management-reviews', label: 'Revues de direction', icon: Users2 },
  { key: 'my-approvals', to: '/my-approvals', label: 'Mes approbations', icon: CheckSquare },
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
  { key: 'employees', to: '/employees', label: 'Personnel', icon: Contact },
  // Jamais configurable, contrairement aux deux au-dessus : c'est le seul endroit qui permet
  // de corriger ce réglage, donc aucune combinaison de règles ne doit jamais pouvoir le faire
  // disparaître pour un admin.
  { to: '/settings', label: 'Paramètres', icon: Settings, adminOnly: true },
];

export default function Layout() {
  useInactivityLogout(INACTIVITY_TIMEOUT_MS);
  const currentUser = useCurrentUser();
  const tenant = useTenant();
  const role = useRole();
  const visibleMenuKeys = useMenuVisibility();
  const logoUrl = getTenantLogoPublicUrl(tenant?.logo_url);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const navigate = useNavigate();
  const now = useNow();
  const timeZone = tenant?.timezone || 'UTC';
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

  async function handleLogout() {
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
          <button type="button" onClick={() => setIsMenuOpen(true)} aria-label="Ouvrir le menu" className="-mr-2 p-2">
            <Menu size={24} />
          </button>
        </div>
      </header>

      {isMenuOpen && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={closeMenu} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-y-auto overflow-x-hidden bg-primary text-white transition-transform duration-200 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
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
            <button type="button" onClick={closeMenu} aria-label="Fermer le menu" className="p-1 md:hidden">
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

        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.filter(
            (item) =>
              (!item.adminOnly || role === 'admin') &&
              (item.adminOnly || item.alwaysVisible || !visibleMenuKeys || visibleMenuKeys.includes(item.key))
          ).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={closeMenu}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={20} />
              <span className="flex-1">{label}</span>
              {to === '/my-approvals' && pendingApprovalsCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold text-primary">
                  {pendingApprovalsCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-1 px-3 pb-6 pt-3">
          {currentUser?.is_super_admin && (
            <Link
              to="/super-admin"
              onClick={closeMenu}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ShieldCheck size={20} />
              Super Admin
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut size={20} />
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 md:px-8 md:py-6">
        <Outlet />
      </main>
    </div>
  );
}
