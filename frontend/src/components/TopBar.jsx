import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBell,
  FiChevronDown,
  FiMoon,
  FiMenu,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiSun,
  FiUser,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import usePageTitle from '../hooks/usePageTitle';
import useDebounce from '../hooks/useDebounce';
import customerService from '../services/customerService';
import useAnalyticsStore from '../store/analyticsStore';
import { DATE_RANGE_OPTIONS } from '../utils/designTokens';

const MOCK_NOTIFICATIONS = [
  {
    _id: 'mock-order-1',
    title: 'Order status changed',
    message: 'Order #1024 moved to confirmed.',
    createdAt: new Date().toISOString(),
    isRead: false,
    category: 'orders',
  },
  {
    _id: 'mock-customer-1',
    title: 'New customer acquired',
    message: 'A new customer joined from campaign A/B.',
    createdAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    isRead: true,
    category: 'customers',
  },
  {
    _id: 'mock-system-1',
    title: 'System health stable',
    message: 'No delivery failures in the last 30 minutes.',
    createdAt: new Date(Date.now() - 1000 * 60 * 34).toISOString(),
    isRead: true,
    category: 'system',
  },
];

const DEFAULT_SEARCH_RESULT = { customers: [], orders: [], campaigns: [] };

const inferCategory = (title = '') => {
  const t = title.toLowerCase();
  if (t.includes('order')) return 'orders';
  if (t.includes('customer')) return 'customers';
  return 'system';
};

const highlightText = (value, query) => {
  const text = String(value || '');
  if (!query) return text;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'ig');
  const parts = text.split(regex);

  return parts.map((part, idx) =>
    idx % 2 === 1 ? (
      <mark key={`${part}-${idx}`} className="rounded bg-[rgba(79,70,229,0.15)] px-0.5 text-[var(--accent)]">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${idx}`}>{part}</span>
    )
  );
};

const TopBar = ({ onToggleSidebar, onRefreshGlobal, theme = 'dark', onToggleTheme }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pageTitle = usePageTitle();

  const dateRange = useAnalyticsStore((state) => state.dateRange);
  const globalSearchQuery = useAnalyticsStore((state) => state.searchQuery);
  const setDatePreset = useAnalyticsStore((state) => state.setDatePreset);
  const setCustomDateRange = useAnalyticsStore((state) => state.setCustomDateRange);
  const setSearchQuery = useAnalyticsStore((state) => state.setSearchQuery);
  const triggerRefresh = useAnalyticsStore((state) => state.triggerRefresh);

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState(globalSearchQuery || '');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(DEFAULT_SEARCH_RESULT);

  const searchInputRef = useRef(null);
  const searchRef = useRef(null);
  const notificationsRef = useRef(null);
  const profileRef = useRef(null);

  const debouncedSearch = useDebounce(searchTerm, 350);

  useEffect(() => {
    setSearchQuery(debouncedSearch.trim());
  }, [debouncedSearch, setSearchQuery]);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications');
      const rows = Array.isArray(response.data) ? response.data : [];
      setNotifications(rows.map((item) => ({ ...item, category: item.category || inferCategory(item.title) })));
    } catch {
      setNotifications(MOCK_NOTIFICATIONS);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 30000);
    return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  useEffect(() => {
    const clock = setInterval(() => {
      setLastUpdated(new Date());
    }, 5000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResult(DEFAULT_SEARCH_RESULT);
      setSearching(false);
      return;
    }

    let active = true;
    setSearching(true);
    customerService
      .globalSearch(debouncedSearch)
      .then((result) => {
        if (active) setSearchResult(result);
      })
      .catch(() => {
        if (active) setSearchResult(DEFAULT_SEARCH_RESULT);
      })
      .finally(() => {
        if (active) setSearching(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedSearch]);

  useEffect(() => {
    const closeMenus = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    window.addEventListener('click', closeMenus);
    return () => window.removeEventListener('click', closeMenus);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      triggerRefresh();
      await Promise.resolve(onRefreshGlobal?.());
      setLastUpdated(new Date());
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  }, [onRefreshGlobal, refreshing, triggerRefresh]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/');
  }, [logout, navigate]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.isRead).length, [notifications]);

  const groupedNotifications = useMemo(
    () => ({
      orders: notifications.filter((n) => n.category === 'orders'),
      customers: notifications.filter((n) => n.category === 'customers'),
      system: notifications.filter((n) => n.category === 'system'),
    }),
    [notifications]
  );

  const totalSearchResults = searchResult.customers.length + searchResult.orders.length + searchResult.campaigns.length;

  const avatarText = useMemo(() => {
    const name = user?.name || user?.email || 'A';
    return String(name).trim().charAt(0).toUpperCase();
  }, [user]);

  return (
    <header className="surface-header fixed top-0 right-0 left-0 z-50 border-b shadow-soft">
      <div className="h-20 px-3 md:px-6">
        <div className="mx-auto flex h-full max-w-[1800px] items-center justify-between gap-2 md:gap-4">
          <div className="flex min-w-0 items-center gap-2 md:gap-3">
            <button type="button" onClick={onToggleSidebar} className="btn-ghost md:hidden">
              <FiMenu className="h-5 w-5" />
            </button>
            <div className="hidden min-w-0 md:block">
              <p className="truncate text-xl font-bold text-primary md:text-2xl">{pageTitle}</p>
              <p className="text-xs text-secondary">
                Last updated: {lastUpdated.toLocaleTimeString('en-US', { hour12: false })}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <div ref={searchRef} className="relative hidden w-full max-w-[360px] lg:block">
              <div className="input-surface" onClick={() => { setSearchOpen(true); searchInputRef.current?.focus(); }}>
                <FiSearch className="h-4 w-4 text-secondary" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search customers, orders, campaigns..."
                  className="text-sm text-primary placeholder:text-secondary"
                />
                <span className="rounded-full border border-surface px-2 py-1 text-[10px] text-secondary">Ctrl+K</span>
              </div>

              {searchOpen && (
                <div className="search-dropdown absolute left-0 right-0 mt-2 max-h-96 overflow-auto rounded-[1.5rem] border shadow-soft">
                  {searching ? (
                    <p className="py-4 text-center text-sm text-secondary">Searching...</p>
                  ) : totalSearchResults === 0 ? (
                    <p className="py-4 text-center text-sm text-secondary">No results found</p>
                  ) : (
                    <div className="space-y-3">
                      {searchResult.customers.length > 0 && (
                        <div>
                          <p className="mb-2 text-[11px] uppercase tracking-widest text-secondary">Customers</p>
                          {searchResult.customers.map((item, idx) => (
                            <div key={`c-${idx}`} className="rounded-2xl border border-surface bg-surface p-3 text-sm text-primary">
                              {highlightText(item?.name || item?.phone || 'Customer', debouncedSearch)}
                            </div>
                          ))}
                        </div>
                      )}
                      {searchResult.orders.length > 0 && (
                        <div>
                          <p className="mb-2 text-[11px] uppercase tracking-widest text-secondary">Orders</p>
                          {searchResult.orders.map((item, idx) => (
                            <div key={`o-${idx}`} className="rounded-2xl border border-surface bg-surface p-3 text-sm text-primary">
                              {highlightText(item?.product || item?.status || 'Order', debouncedSearch)}
                            </div>
                          ))}
                        </div>
                      )}
                      {searchResult.campaigns.length > 0 && (
                        <div>
                          <p className="mb-2 text-[11px] uppercase tracking-widest text-secondary">Campaigns</p>
                          {searchResult.campaigns.map((item, idx) => (
                            <div key={`cp-${idx}`} className="rounded-2xl border border-surface bg-surface p-3 text-sm text-primary">
                              {highlightText(item?.name || item?.message || 'Campaign', debouncedSearch)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <select
              value={dateRange.preset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="hidden rounded-2xl border border-surface bg-surface px-3 py-2 text-sm text-primary outline-none md:block"
            >
              {DATE_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-surface text-primary">
                  {option.label}
                </option>
              ))}
            </select>

            {dateRange.preset === 'custom' && (
              <div className="hidden items-center gap-2 md:flex">
                <input
                  type="date"
                  value={dateRange.from || ''}
                  onChange={(e) => setCustomDateRange({ from: e.target.value, to: dateRange.to })}
                  className="rounded-2xl border border-surface bg-surface px-3 py-2 text-xs text-primary outline-none"
                />
                <input
                  type="date"
                  value={dateRange.to || ''}
                  onChange={(e) => setCustomDateRange({ from: dateRange.from, to: e.target.value })}
                  className="rounded-2xl border border-surface bg-surface px-3 py-2 text-xs text-primary outline-none"
                />
              </div>
            )}

            <button type="button" onClick={onToggleTheme} className="btn-ghost" aria-label="Toggle theme">
              {theme === 'dark' ? <FiSun className="h-4 w-4" /> : <FiMoon className="h-4 w-4" />}
              <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>

            <button type="button" onClick={handleRefresh} disabled={refreshing} className="btn-primary">
              <FiRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <div ref={notificationsRef} className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileMenu(false);
                  setShowNotifications((prev) => !prev);
                }}
                className="btn-ghost p-2"
              >
                <FiBell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="search-dropdown absolute right-0 mt-2 w-96 overflow-hidden rounded-[1.5rem] border shadow-soft">
                  <div className="border-b border-surface px-4 py-3 text-sm font-semibold text-primary">Notification Center</div>
                  <div className="max-h-80 overflow-y-auto p-3">
                    {['orders', 'customers', 'system'].map((category) => (
                      <div key={category} className="mb-3 last:mb-0">
                        <p className="mb-1 text-[11px] uppercase tracking-widest text-secondary">{category}</p>
                        <div className="space-y-2">
                          {(groupedNotifications[category] || []).slice(0, 4).map((notif) => (
                            <div
                              key={notif._id}
                              className={`rounded-2xl border px-3 py-2 text-sm ${notif.isRead ? 'border-surface bg-surface text-primary' : 'border-[rgba(56,189,248,0.2)] bg-[rgba(56,189,248,0.12)] text-[var(--accent)]'}`}
                            >
                              <p className="font-medium">{notif.title}</p>
                              <p className="mt-1 text-xs text-secondary">{notif.message}</p>
                            </div>
                          ))}
                          {groupedNotifications[category]?.length === 0 && (
                            <p className="text-xs text-secondary">No items</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotifications(false);
                  setShowProfileMenu((prev) => !prev);
                }}
                className="btn-avatar"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                  {avatarText}
                </span>
                <span className="hidden max-w-[120px] truncate md:inline">{user?.name || user?.email || 'Admin'}</span>
                <FiChevronDown className="hidden h-4 w-4 md:inline" />
              </button>

              {showProfileMenu && (
                <div className="search-dropdown absolute right-0 mt-2 w-48 overflow-hidden rounded-[1.5rem] border shadow-soft">
                  <button type="button" className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-primary transition hover:bg-surface-muted">
                    <FiUser className="h-4 w-4" />
                    Profile
                  </button>
                  <button type="button" className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-primary transition hover:bg-surface-muted">
                    <FiSettings className="h-4 w-4" />
                    Settings
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full border-t border-surface px-4 py-3 text-left text-sm font-semibold text-rose-500 transition hover:bg-rose-500/10"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
