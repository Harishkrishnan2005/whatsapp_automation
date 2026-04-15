import React from 'react';

const Select = ({
  children,
  value,
  onChange,
  className = '',
  disabled = false,
  ...props
}) => {
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`
        w-full p-3 rounded-xl border-2 bg-white/90 
        text-gray-900 font-medium text-sm
        border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100/50
        hover:border-gray-300 hover:bg-white/95
        transition-all duration-200
        disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
        dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600
        dark:focus:border-blue-500 dark:focus:ring-blue-900/30
        dark:hover:border-gray-500 dark:hover:bg-gray-700/50
        ${className}
      `}
      {...props}
    >
      {children}
    </select>
  );
};

Select.Option = ({ children, value, className = '' }) => (
  <option 
    value={value} 
    className={`
      bg-white text-gray-900 hover:bg-gray-50
      dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700
      ${className}
    `}
  >
    {children}
  </option>
);

export default Select;

