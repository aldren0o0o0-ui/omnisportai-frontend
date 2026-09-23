// ... (imports)
const StatCard = ({ title, value, change, icon: Icon, color }) => (
  <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
    <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10 bg-${color}-500 blur-2xl`} />
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <h3 className="mt-2 text-3xl font-bold tracking-tight text-white">{value}</h3>
        {change && (
          <p className="mt-2 text-xs font-semibold text-emerald-400 flex items-center gap-1">
            {change} <span className="text-slate-500 text-[10px]">vs last week</span>
          </p>
        )}
      </div>
      <div className={`rounded-xl bg-slate-800 p-3 text-${color}-400 ring-1 ring-slate-700`}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

const AIInsightCard = () => (
  <div className="relative rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-slate-950 to-slate-950 p-6 shadow-xl shadow-sky-900/20">
    <div className="flex items-center gap-2 mb-4 text-sky-400">
      <Sparkles size={20} className="animate-pulse" />
      <h3 className="text-sm font-bold uppercase tracking-widest">AI Optimizer Intelligence</h3>
    </div>
    <div className="space-y-4">
      <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
        <p className="text-sm text-slate-300">
          "I've detected a <span className="text-amber-400 font-bold">scheduling conflict</span> for Court 4. Three matches overlap with the athlete recovery window."
        </p>
        <button className="mt-3 text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors uppercase tracking-wider">
          Auto-Resolve Issues →
        </button>
      </div>
    </div>
  </div>
);