import React from 'react';

const Badge = ({ 
  children, 
  variant = 'default', 
  className = '', 
  size = 'md'
}) => {
  const base = 'inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold border font-medium transition-colors';
  
  const variants = {
    default: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700',
    success: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-100 dark:border-emerald-700/50',
    info: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-100 dark:border-blue-700/50',
    warning: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-100 dark:border-orange-700/50',
    error: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-100 dark:border-red-700/50',
    processing: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-100 dark:border-purple-700/50',
    processed: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-100 dark:border-blue-700/50',
    delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-100 dark:border-emerald-700/50',
    pending: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-100 dark:border-orange-700/50',
    cancelled: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-100 dark:border-red-700/50'
  };

  const sizes = {
    sm: 'px-1.5 py-0.25 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-0.75 text-base'
  };

  const selectedVariant = variants[variant] || variants.default;
  const selectedSize = sizes[size] || sizes.md;

  return (
    <span className={`${base} ${selectedVariant} ${selectedSize} ${className}`}>
      {children}
    </span>
  );
};

Badge.displayName = 'Badge';

export default Badge;
