import { requireRole } from './authorization.js';

export const requireAdmin = requireRole('admin');
export const requireStaff = requireRole(['staff', 'admin']);

