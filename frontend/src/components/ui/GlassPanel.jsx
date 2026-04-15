const GlassPanel = ({ className = '', theme = 'dark', children }) => {
  const base = 'rounded-2xl shadow-xl backdrop-blur-md transition-all duration-300 border';
  const light = 'bg-white/90 border-gray-200 shadow-lg';
  const dark = 'border-white/10 bg-slate-950/35 shadow-2xl';
  
  return (
    <div className={`${base} ${theme === 'light' ? light : dark} ${className}`}>
      {children}
    </div>
  );
};

export default GlassPanel;
