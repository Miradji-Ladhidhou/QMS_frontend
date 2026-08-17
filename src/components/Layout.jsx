import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CheckSquare,
  ClipboardList,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { api } from '../lib/api.js';
import NotificationBell from './NotificationBell.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/capas', label: 'CAPA', icon: ClipboardList },
  { to: '/trainings', label: 'Formations', icon: GraduationCap },
  { to: '/kpis', label: 'KPIs', icon: BarChart3 },
  { to: '/qqoqccp', label: 'QQOQCCP', icon: HelpCircle },
  { to: '/my-approvals', label: 'Mes approbations', icon: CheckSquare },
  { to: '/settings', label: 'Paramètres', icon: Settings },
];

export default function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const navigate = useNavigate();

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
      <header className="flex items-center justify-between bg-primary px-4 py-3 text-white md:hidden">
        <span className="text-lg font-semibold">QMS SaaS</span>
        <div className="flex items-center gap-1">
          <NotificationBell variant="mobile" />
          <button type="button" onClick={() => setIsMenuOpen(true)} aria-label="Ouvrir le menu" className="-mr-2 p-2">
            <Menu size={24} />
          </button>
        </div>
      </header>

      {isMenuOpen && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={closeMenu} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-primary text-white transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <span className="text-xl font-semibold">QMS SaaS</span>
          <div className="flex items-center gap-1">
            <div className="hidden md:block">
              <NotificationBell variant="sidebar" />
            </div>
            <button type="button" onClick={closeMenu} aria-label="Fermer le menu" className="p-1 md:hidden">
              <X size={22} />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
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

        <div className="px-3 pb-6 pt-3">
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

      <main className="flex-1 px-4 py-4 sm:px-6 md:px-8 md:py-6">
        <Outlet />
      </main>
    </div>
  );
}
