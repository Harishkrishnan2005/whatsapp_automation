import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiBell,
  FiChevronDown,
  FiMenu,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiUser,
  FiLogOut,
  FiGlobe,
  FiActivity,
  FiCheckCircle,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import usePageTitle from '../hooks/usePageTitle';
import useDebounce from '../hooks/useDebounce';
import customerService from '../services/customerService';
import useAnalyticsStore from '../store/analyticsStore';
import Badge from './ui/Badge';

const MOCK_NOTIFICATIONS = [
  {
    _id: 'mock-1',
    title: 'New Enterprise Order',
    message: 'Order #4092 received from Mumbai hub.',
    createdAt: new Date().toISOString(),
    isRead: false,
    category: 'orders',
  },
  {
    _id: 'mock-2',
    title: 'System Update',
    message: 'Engine v2.4 successfully deployed to all nodes.',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    isRead: true,
    category: 'system',
  },
];

const DEFAULT_SEARCH_RESULT = { customers: [], orders: [], campaigns: [] };

const TopBar = ({ onToggleSidebar, onRefreshGlobal }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pageTitle = usePageTitle();
  
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showBusinessSwitcher, setShowBusinessSwitcher] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(DEFAULT_SEARCH_RESULT);

  const notificationsRef = useRef(null);
  const profileRef = useRef(null);
  const businessRef = useRef(null);

  const debouncedSearch = useDebounce(searchTerm, 350);

  useEffect(() => {
    const closeMenus = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setShowProfileMenu(false);
      if (businessRef.current && !businessRef.current.contains(event.target)) setShowBusinessSwitcher(false);
    };
    window.addEventListener('mousedown', closeMenus);
    return () => window.removeEventListener('mousedown', closeMenus);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefreshGlobal?.();
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  }, [onRefreshGlobal, refreshing]);

  const avatarText = useMemo(() => {
    const name = user?.name || user?.email || 'U';
    return String(name).trim().charAt(0).toUpperCase();
  }, [user]);

  const plan = user?.plan || 'Free';

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="h-16 px-6 flex items-center justify-between gap-6">
        
        {/* Left Section: Mobile Menu + Page Title */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <FiMenu className="h-5 w-5" />
          </button>
          <div className="hidden sm:block">
            <h1 className="text-sm font-black text-slate-900 tracking-tight uppercase">
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* Center Section: Search */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative group">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text"
              placeholder="Search conversations, orders..."
              className="w-full bg-slate-50 border-none rounded-2xl pl-11 pr-4 py-2.5 text-xs font-bold text-slate-700 placeholder:text-slate-400 outline-none ring-0 focus:bg-white focus:ring-4 focus:ring-blue-600/5 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Right Section: Actions + Profile */}
        <div className="flex items-center gap-3">
          
          {/* Business Switcher */}
          <div ref={businessRef} className="relative hidden lg:block">
            <button 
              onClick={() => setShowBusinessSwitcher(!showBusinessSwitcher)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
            >
              <div className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FiGlobe className="h-3 w-3" />
              </div>
              <span className="text-xs font-bold text-slate-700">
                {user?.businessName || 'My Business'}
              </span>
              <FiChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${showBusinessSwitcher ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {showBusinessSwitcher && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-56 p-2 bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50"
                >
                  <div className="p-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Workspace</div>
                  <button className="flex w-full items-center gap-3 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all">
                    <FiCheckCircle className="h-3.5 w-3.5 text-blue-500" />
                    {user?.businessName || 'Primary Hub'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-6 w-px bg-slate-100 hidden lg:block mx-1" />

          {/* Refresh Action */}
          <button 
            onClick={handleRefresh}
            className={`p-2.5 rounded-xl text-slate-500 hover:bg-slate-50 transition-all ${refreshing ? 'text-blue-600 bg-blue-50' : ''}`}
          >
            <FiRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Notifications */}
          <div ref={notificationsRef} className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-50 transition-all relative"
            >
              <FiBell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
            {/* Notification Menu (Simplified) */}
          </div>

          {/* Profile Section */}
          <div ref={profileRef} className="relative flex items-center gap-3 ml-2">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[11px] font-black text-slate-900 leading-tight truncate max-w-[120px]">
                {user?.name || 'User'}
              </span>
              <Badge variant={plan.toLowerCase() === 'pro' ? 'processing' : 'default'} size="sm" className="mt-1 scale-90 origin-right">
                {plan} Plan
              </Badge>
            </div>
            
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
            >
              {avatarText}
            </button>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-64 p-3 bg-white rounded-3xl border border-slate-100 shadow-2xl shadow-slate-200"
                >
                  <div className="p-4 bg-slate-50 rounded-2xl mb-2">
                    <p className="text-xs font-black text-slate-900 truncate">{user?.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{user?.role}</p>
                  </div>
                  <div className="space-y-1">
                    <button className="flex w-full items-center gap-3 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                      <FiUser className="h-4 w-4" /> Profile Details
                    </button>
                    <button className="flex w-full items-center gap-3 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                      <FiSettings className="h-4 w-4" /> Account Settings
                    </button>
                    <div className="h-px bg-slate-50 my-2 mx-4" />
                    <button 
                      onClick={() => { logout(); navigate('/'); }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <FiLogOut className="h-4 w-4" /> End Session
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
