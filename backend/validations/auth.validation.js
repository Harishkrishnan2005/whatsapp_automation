import { z } from 'zod';

export const registerSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    businessName: z.string().min(2, 'Business name must be at least 2 characters'),
    businessType: z.enum(['E_COMMERCE', 'BOOKING']),
  })
};

export const loginSchema = {
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  })
};

export const createStaffSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().optional(),
    permissions: z.array(z.string()).optional(),
    gender: z.enum(['Male', 'Female', 'Other']).optional(),
    dateOfBirth: z.string().optional().or(z.literal('')),
    dateOfJoining: z.string().optional().or(z.literal('')),
    address: z.string().optional(),
    isActive: z.boolean().optional(),
  })
};

export const updateStaffSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    email: z.string().email('Invalid email address').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
    phone: z.string().optional(),
    permissions: z.array(z.string()).optional(),
    gender: z.enum(['Male', 'Female', 'Other']).optional(),
    dateOfBirth: z.string().optional().or(z.literal('')),
    dateOfJoining: z.string().optional().or(z.literal('')),
    address: z.string().optional(),
    isActive: z.boolean().optional(),
  })
};
