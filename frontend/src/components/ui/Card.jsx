import React from 'react';

const Card = ({ children, className = '', title, subtitle, footer, icon: Icon }) => {
  return (
    <div className={`bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 ${className}`}>
      {(title || Icon) && (
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {Icon && (
              <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div>
              {title && <h3 className="text-base font-black text-slate-900 tracking-tight">{title}</h3>}
              {subtitle && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>}
            </div>
          </div>
        </div>
      )}
      <div className="p-8">
        {children}
      </div>
      {footer && (
        <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
