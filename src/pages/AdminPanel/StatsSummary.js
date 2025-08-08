export default function StatsSummary({ stats }) {
  return (
    <div className="w-full">
      {/* Responsive Grid: 1 col mobile, 2 col tablet, 3 col small desktop, up to 5 col large desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="group bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 min-w-0"
          >
            <div className="flex flex-col space-y-3 sm:space-y-4">
              {/* Top section with icon and trend */}
              <div className="flex items-start justify-between">
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}
                >
                  {stat.icon || (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 bg-white/30 rounded-lg"></div>
                  )}
                </div>
                {stat.trend && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-emerald-600 text-xs sm:text-sm font-medium flex items-center gap-1">
                      <span className="text-emerald-500">↑</span>
                      <span className="hidden sm:inline">{stat.trend}</span>
                      <span className="sm:hidden">{stat.trend.replace(' from last month', '')}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom section with stats */}
              <div className="space-y-1">
                <p className="text-slate-600 text-xs sm:text-sm font-medium leading-tight">
                  {stat.name}
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-800">
                  {stat.value}
                </p>
                {/* Mobile trend (only if not shown above) */}
                {stat.trend && (
                  <p className="text-emerald-600 text-xs font-medium sm:hidden flex items-center gap-1">
                    <span className="text-emerald-500">↑</span>
                    {stat.trend}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}