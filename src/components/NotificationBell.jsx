import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { api } from '../lib/api.js';

const POLL_INTERVAL_MS = 60000;
const MAX_VISIBLE = 10;

function formatRelativeTime(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.max(0, Math.round(diffMs / 60000));
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `il y a ${diffD} j`;
}

export default function NotificationBell({ variant = 'sidebar' }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  async function loadNotifications() {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
    } catch {
      // silencieux : un échec de polling ne doit pas perturber le reste de l'app
    }
  }

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const visibleNotifications = notifications.slice(0, MAX_VISIBLE);

  async function markAsRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      loadNotifications();
    }
  }

  async function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.patch('/notifications/read-all');
    } catch {
      loadNotifications();
    }
  }

  const iconButtonClass =
    variant === 'sidebar'
      ? 'relative rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white'
      : 'relative -mr-1 rounded-md p-2 text-white hover:bg-white/10';

  return (
    <div className="relative" ref={containerRef}>
      <button type="button" onClick={() => setIsOpen((prev) => !prev)} aria-label="Notifications" className={iconButtonClass}>
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 mt-2 w-80 max-w-[85vw] rounded-xl border border-slate-200 bg-white text-slate-900 shadow-lg ${
            variant === 'sidebar' ? 'left-0' : 'right-0'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-900">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Check size={12} />
                Tout marquer comme lu
              </button>
            )}
          </div>

          {visibleNotifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Aucune notification.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {visibleNotifications.map((notification) => (
                <li key={notification.id}>
                  <Link
                    to={notification.link || '#'}
                    onClick={() => {
                      setIsOpen(false);
                      if (!notification.read) markAsRead(notification.id);
                    }}
                    className={`block px-4 py-3 hover:bg-slate-50 ${notification.read ? '' : 'bg-blue-50/60'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">{notification.title}</p>
                      {!notification.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                    {notification.message && <p className="mt-0.5 text-sm text-slate-600">{notification.message}</p>}
                    <p className="mt-1 text-xs text-slate-400">{formatRelativeTime(notification.created_at)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
