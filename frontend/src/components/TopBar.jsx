import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiBell,
  FiChevronDown,
  FiMenu,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiUser,
  FiLogOut,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import usePageTitle from '../hooks/usePageTitle';
import useDebounce from '../hooks/useDebounce';
import customerService from '../services/customerService';
import useAnalyticsStore from '../store/analyticsStore';

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
];

const DEFAULT_SEARCH_RESULT = { customers: [], orders: [], campaigns: [] };

const TopBar = ({ onToggleSidebar, onRefreshGlobal }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pageTitle = usePageTitle();
  const isSuperAdmin = user?.role === 'super_admin';

  const globalSearchQuery = useAnalyticsStore((state) => state.searchQuery);
  const setSearchQuery = useAnalyticsStore((state) => state.setSearchQuery);
  const triggerRefresh = useAnalyticsStore((state) => state.triggerRefresh);

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
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
    if (isSuperAdmin) {
      setNotifications([]);
      return;
    }
    try {
      const response = await api.get('/notifications');
      const rows = Array.isArray(response.data) ? response.data : [];
      setNotifications(rows.map((item) => ({ ...item, isRead: !!item.readAt })));
    } catch {
      setNotifications(MOCK_NOTIFICATIONS);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (isSuperAdmin || !debouncedSearch.trim()) {
      setSearchResult(DEFAULT_SEARCH_RESULT);
      setSearching(false);
      return;
    }
    setSearching(true);
    customerService
      .globalSearch(debouncedSearch)
      .then((result) => setSearchResult(result))
      .catch(() => setSearchResult(DEFAULT_SEARCH_RESULT))
      .finally(() => setSearching(false));
  }, [isSuperAdmin, debouncedSearch]);

  useEffect(() => {
    const closeMenus = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setSearchOpen(false);
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setShowProfileMenu(false);
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
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  }, [onRefreshGlobal, refreshing, triggerRefresh]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/');
  }, [logout, navigate]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.isRead).length, [notifications]);

  const avatarText = useMemo(() => {
    const name = user?.name || user?.email || 'A';
    return String(name).trim().charAt(0).toUpperCase();
  }, [user]);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
      <div className="flex items-center justify-between h-20 px-6 max-w-[1600px] mx-auto gap-6 sm:gap-10">
        <div className="flex items-center gap-4 min-w-[150px]">
          <button onClick={onToggleSidebar} className="p-2 -ml-2 text-slate-500 md:hidden">
            <FiMenu className="h-6 w-6" />
          </button>
          <div className="hidden md:block">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 group flex items-center gap-2">
               {pageTitle}
               <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </h1>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Live Infrastructure</p>
          </div>
        </div>

        <div ref={searchRef} className="flex-1 max-w-xl relative hidden sm:block">
          <div className="flex items-center gap-3 bg-slate-100/50 border border-slate-200 rounded-2xl px-4 py-2.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
            <FiSearch className="h-4 w-4 text-slate-400" />
            <input 
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search data network..."
              className="flex-1 bg-transparent text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none"
              onFocus={() => setSearchOpen(true)}
            />
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-200/50 text-[10px] font-bold text-slate-500">
               <span>⌘</span>
               <span>K</span>
            </div>
          </div>

          {searchOpen && (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="absolute top-full left-0 right-0 mt-3 p-4 bg-white rounded-[2rem] border border-slate-200 shadow-2xl overflow-hidden max-h-[400px] overflow-y-auto"
             >
                {searching ? (
                  <p className="py-8 text-center text-sm text-slate-400 font-medium">Indexing results...</p>
                ) : (
                  <div className="space-y-4">
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">Network Results</p>
                     <div className="grid gap-1">
                        {searchResult.customers.length === 0 && searchResult.orders.length === 0 && (
                           <p className="p-6 text-center text-slate-300 italic text-sm">No activity found</p>
                        )}
                        {searchResult.customers.slice(0, 3).map((c, i) => (
                           <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
                              <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">C</div>
                              <div>
                                 <p className="text-sm font-bold text-slate-700">{c.name}</p>
                                 <p className="text-[10px] text-slate-400">{c.phone}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
                )}
             </motion.div>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center justify-center h-11 w-11 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all border border-transparent hover:border-slate-200"
          >
            <FiRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <div ref={notificationsRef} className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="h-11 w-11 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all relative"
            >
              <FiBell className="h-5 w-5" />
              {unreadCount > 0 && <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-white" />}
            </button>
          </div>

          <div ref={profileRef} className="relative">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 pl-1 pr-3 py-1 rounded-full bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-all"
            >
               <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-blue-200">
                 {avatarText}
               </div>
               <FiChevronDown className="h-4 w-4 text-slate-400 hidden sm:block" />
            </button>

            {showProfileMenu && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-0 mt-3 w-64 p-3 bg-white rounded-[2rem] border border-slate-200 shadow-2xl"
              >
                <div className="p-4 border-b border-slate-100 mb-2">
                   <p className="font-bold text-slate-900 truncate text-sm">{user?.name || 'Authorized User'}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{user?.role}</p>
                </div>
                <button className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                  <FiUser className="h-4 w-4" /> Identity
                </button>
                <button className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                  <FiSettings className="h-4 w-4" /> Preferences
                </button>
                <div className="h-px bg-slate-100 my-2 mx-4" />
                <button 
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <FiLogOut className="h-4 w-4" /> Finalize Session
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
