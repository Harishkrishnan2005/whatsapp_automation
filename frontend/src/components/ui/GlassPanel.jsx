const GlassPanel = ({ className = '', children }) => {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-slate-950/35 shadow-xl backdrop-blur-md transition-all duration-300 ${className}`}
    >
      {children}
    </div>
  );
};

export default GlassPanel;
