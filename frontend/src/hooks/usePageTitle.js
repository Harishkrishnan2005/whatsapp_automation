import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const EXACT_TITLES = {
  '/dashboard': 'Admin Dashboard',
  '/orders': 'Orders',
  '/chat': 'Chat Management',
  '/customers': 'Customers',
  '/campaigns': 'Campaigns',
  '/products': 'Products',
  '/analytics': 'Analytics',
  '/admin/staff': 'Staff Management',
  '/admin/chatbot': 'Chatbot Flow Management',
  '/admin/chat-management': 'Chat Management',
  '/admin/appointments': 'Appointment Management',
  '/admin/advanced-analytics': 'Advanced Analytics',
  '/staff/chat': 'My Chat',
  '/staff/bookings': 'My Bookings',
  '/staff/orders': 'My Orders',
  '/staff/notes': 'Customer Notes',
};

export default function usePageTitle() {
  const { pathname } = useLocation();

  return useMemo(() => {
    if (EXACT_TITLES[pathname]) {
      return EXACT_TITLES[pathname];
    }

    const segment = pathname.split('/').filter(Boolean).pop();
    if (!segment) return 'Admin Dashboard';

    return segment
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }, [pathname]);
}
