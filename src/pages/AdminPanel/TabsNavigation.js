import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

export default function TabsNavigation({
  activeTab,
  setActiveTab,
  pendingCount = 0,
  redemptionPendingCount = 0,
  reportsPendingCount = 0,
}) {
  const { isDark } = useTheme();

  const tabs = [
    { 
      id: 'pendingSubmissions', 
      label: 'Pending Submissions',
      shortLabel: 'Pending',
      mobileLabel: 'Pend',
      icon: '📝',
      count: pendingCount,
      countColor: 'bg-red-500',
      countLabel: 'pending submissions'
    },
    { 
      id: 'rewards', 
      label: 'Rewards',
      shortLabel: 'Rewards',
      mobileLabel: 'Rewards',
      icon: '🎁',
      count: null 
    },
    { 
      id: 'reports', 
      label: 'Reports',
      shortLabel: 'Reports',
      mobileLabel: 'Reports',
      icon: '⚠️',
      count: reportsPendingCount,
      countColor: 'bg-orange-500',
      countLabel: 'pending reports'
    },
    { 
      id: 'users', 
      label: 'Users',
      shortLabel: 'Users',
      mobileLabel: 'Users',
      icon: '👥',
      count: null 
    },
    { 
      id: 'transactions', 
      label: 'Transactions',
      shortLabel: 'Transactions',
      mobileLabel: 'Txns',
      icon: '💳',
      count: null 
    },
    { 
      id: 'redemptions', 
      label: 'Redemptions',
      shortLabel: 'Redemptions',
      mobileLabel: 'Redeem',
      icon: '🎫',
      count: redemptionPendingCount,
      countColor: 'bg-yellow-500',
      countLabel: 'pending redemptions'
    },
    { 
      id: 'wasteTypes', 
      label: 'Waste Types',
      shortLabel: 'Waste Types',
      mobileLabel: 'Waste',
      icon: '♻️',
      count: null 
    },
  ];

  const desktopBg = isDark ? "bg-gray-800 bg-opacity-80 border-gray-700 text-gray-300" : "bg-white/80 border-slate-200 text-slate-600";
  const desktopActiveText = isDark ? "text-indigo-400 bg-indigo-900 border-indigo-600" : "text-indigo-600 bg-indigo-50 border-indigo-600";
  const desktopInactiveTextHover = isDark ? "hover:text-gray-100 hover:bg-gray-700 border-transparent" : "hover:text-slate-800 hover:bg-slate-50 border-transparent";

  const mobileActiveBg = "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md";
  const mobileInactiveTextHover = isDark ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-slate-600 hover:text-slate-800 hover:bg-slate-100";

  return (
    <div className="w-full">
      {/* Desktop Navigation */}
      <div className={`hidden lg:block border-b rounded-t-2xl overflow-hidden backdrop-blur-sm ${desktopBg}`}>
        <nav className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-3 font-semibold transition-all duration-200 whitespace-nowrap flex items-center gap-2 text-sm border-b-2 ${
                activeTab === tab.id ? desktopActiveText : desktopInactiveTextHover
              }`}
              aria-current={activeTab === tab.id ? "page" : undefined}
              aria-label={tab.label}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
              
              {/* Desktop count badge */}
              {tab.count !== null && tab.count > 0 && (
                <span 
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold leading-none text-white rounded-full ${
                    tab.countColor || 'bg-red-500'
                  }`}
                  aria-label={`${tab.count} ${tab.countLabel || 'items'}`}
                >
                  {tab.count > 99 ? "99+" : tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile Navigation - Horizontal Scroll */}
      <div className={`lg:hidden border-b rounded-t-2xl overflow-hidden backdrop-blur-sm ${desktopBg}`}>
        <div className="overflow-x-auto scrollbar-hide">
          <nav className="flex space-x-1 p-2 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center min-w-[64px] px-2 py-2 font-medium rounded-lg transition-all duration-200 ${
                  activeTab === tab.id ? mobileActiveBg : mobileInactiveTextHover
                }`}
                aria-current={activeTab === tab.id ? "page" : undefined}
                aria-label={tab.label}
              >
                {/* Icon */}
                <span className="text-lg mb-1">{tab.icon}</span>
                
                {/* Label - responsive text */}
                <span className="text-xs leading-tight text-center">
                  <span className="sm:hidden">{tab.mobileLabel}</span>
                  <span className="hidden sm:inline">{tab.shortLabel}</span>
                </span>
                
                {/* Mobile count badge */}
                {tab.count !== null && tab.count > 0 && (
                  <span 
                    className={`absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-4 px-1 text-xs font-bold leading-none rounded-full shadow-sm ${
                      activeTab === tab.id ? 'bg-white/90 text-indigo-600' : tab.countColor || 'bg-red-500'
                    }`}
                    aria-label={`${tab.count} ${tab.countLabel || 'items'}`}
                  >
                    {tab.count > 9 ? "9+" : tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Active tab indicator for very small screens */}
        <div className="sm:hidden bg-slate-50 px-3 py-2">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-base">
              {tabs.find(tab => tab.id === activeTab)?.icon}
            </span>
            <span className="text-sm font-medium text-slate-700">
              {tabs.find(tab => tab.id === activeTab)?.label || 'Current Tab'}
            </span>
            {/* Show count in active tab indicator if present */}
            {(() => {
              const activeTabData = tabs.find(tab => tab.id === activeTab);
              return activeTabData?.count > 0 ? (
                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white rounded-full ${
                  activeTabData.countColor || 'bg-red-500'
                }`}>
                  {activeTabData.count > 99 ? "99+" : activeTabData.count}
                </span>
              ) : null;
            })()}
          </div>
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
