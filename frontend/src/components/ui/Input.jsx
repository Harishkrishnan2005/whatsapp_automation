import React from 'react';

const Input = ({ label, error, icon: Icon, className = '', ...props }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          className={`
            w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700
            placeholder:text-slate-300 outline-none transition-all
            focus:bg-white focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600
            ${Icon ? 'pl-11' : ''}
            ${error ? 'border-rose-500 bg-rose-50' : ''}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="text-[10px] font-bold text-rose-500 ml-1 uppercase tracking-wider">{error}</p>
      )}
    </div>
  );
};

export default Input;
