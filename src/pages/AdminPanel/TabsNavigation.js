import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../../contexts/ThemeContext";

export default function TabsNavigation({
  activeTab,
  setActiveTab,
  pendingCount = 0,
  redemptionPendingCount = 0,
  reportsPendingCount = 0,
}) {
  const { isDark } = useTheme();
  const scrollContainerRef = useRef(null);
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
    showIndicators: false,
  });

  const tabs = [
    {
      id: "pendingSubmissions",
      label: "Pending Submissions",
      shortLabel: "Pending",
      mobileLabel: "Pend",
      icon: "📋",
      count: pendingCount,
      countColor: "bg-red-500",
      countLabel: "pending submissions",
    },
    {
      id: "rewards",
      label: "Rewards",
      shortLabel: "Rewards",
      mobileLabel: "Rewards",
      icon: "🎁",
      count: null,
    },
    {
      id: "reports",
      label: "Reports",
      shortLabel: "Reports",
      mobileLabel: "Reports",
      icon: "⚠️",
      count: reportsPendingCount,
      countColor: "bg-orange-500",
      countLabel: "pending reports",
    },
    {
      id: "users",
      label: "Users",
      shortLabel: "Users",
      mobileLabel: "Users",
      icon: "👥",
      count: null,
    },
    {
      id: "transactions",
      label: "Transactions",
      shortLabel: "Transactions",
      mobileLabel: "Txns",
      icon: "💳",
      count: null,
    },
    {
      id: "redemptions",
      label: "Redemptions",
      shortLabel: "Redemptions",
      mobileLabel: "Redeem",
      icon: "🎫",
      count: redemptionPendingCount,
      countColor: "bg-yellow-500",
      countLabel: "pending redemptions",
    },
    
    {
      id: "wasteTypes",
      label: "Waste Types",
      shortLabel: "Waste Types",
      mobileLabel: "Waste",
      icon: "♻️",
      count: null,
    },
    // NEW: Blockchain Tab (placed after traditional ledger for logical flow)
    {
      id: "ledger",
      label: "Ledger",
      shortLabel: "Ledger",
      mobileLabel: "Ledger",
      icon: "🔗", 
      count: null,
    },
    // NEW: Blockchain Verification Tab
    {
      id: "blockchain",
      label: "Blockchain",
      shortLabel: "Blockchain",
      mobileLabel: "Chain",
      icon: "⛓️",
      count: null,
    },
  ];

  // Check scroll position and update scroll state
  const updateScrollState = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const canScrollLeft = container.scrollLeft > 0;
      const canScrollRight =
        container.scrollLeft < container.scrollWidth - container.clientWidth;
      const showIndicators = container.scrollWidth > container.clientWidth;

      setScrollState({
        canScrollLeft,
        canScrollRight,
        showIndicators,
      });
    }
  };

  // Update scroll state on mount and resize
  useEffect(() => {
    const handleResize = () => {
      setTimeout(updateScrollState, 100); // Small delay to ensure layout is complete
    };

    updateScrollState();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Scroll handler
  const handleScroll = () => {
    updateScrollState();
  };

  // Scroll to direction
  const scrollToDirection = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 120; // Adjust scroll distance as needed
      const currentScroll = scrollContainerRef.current.scrollLeft;
      const newScroll =
        direction === "left"
          ? Math.max(0, currentScroll - scrollAmount)
          : currentScroll + scrollAmount;

      scrollContainerRef.current.scrollTo({
        left: newScroll,
        behavior: "smooth",
      });
    }
  };

  const desktopBg = isDark
    ? "bg-gray-800 bg-opacity-80 border-gray-700 text-gray-300"
    : "bg-white/80 border-slate-200 text-slate-600";
  const desktopActiveText = isDark
    ? "text-indigo-400 bg-indigo-900 border-indigo-600"
    : "text-indigo-600 bg-indigo-50 border-indigo-600";
  const desktopInactiveTextHover = isDark
    ? "hover:text-gray-100 hover:bg-gray-700 border-transparent"
    : "hover:text-slate-800 hover:bg-slate-50 border-transparent";

  const mobileActiveBg =
    "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md";
  const mobileInactiveTextHover = isDark
    ? "text-gray-300 hover:text-white hover:bg-gray-700"
    : "text-slate-600 hover:text-slate-800 hover:bg-slate-100";

  const scrollButtonClass = isDark
    ? "bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600"
    : "bg-white hover:bg-gray-50 text-gray-600 border-gray-200";

  return (
    <div className="w-full">
      {/* Desktop Navigation */}
      <div
        className={`hidden lg:block border-b rounded-t-2xl overflow-hidden backdrop-blur-sm ${desktopBg}`}
      >
        <nav className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-3 font-semibold transition-all duration-200 whitespace-nowrap flex items-center gap-2 text-sm border-b-2 ${
                activeTab === tab.id ? desktopActiveText : desktopInactiveTextHover
              } ${tab.highlight && activeTab !== tab.id ? 'relative' : ''}`}
              aria-current={activeTab === tab.id ? "page" : undefined}
              aria-label={tab.label}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>

              {/* NEW indicator badge for blockchain tab */}
              {tab.highlight && activeTab !== tab.id && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                </span>
              )}

              {/* Desktop count badge */}
              {tab.count !== null && tab.count > 0 && (
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold leading-none text-white rounded-full ${
                    tab.countColor || "bg-red-500"
                  }`}
                  aria-label={`${tab.count} ${tab.countLabel || "items"}`}
                >
                  {tab.count > 99 ? "99+" : tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile Navigation - Horizontal Scroll with Indicators */}
      <div
        className={`lg:hidden border-b rounded-t-2xl overflow-hidden backdrop-blur-sm ${desktopBg} relative`}
      >
        {/* Left Scroll Indicator */}
        {scrollState.showIndicators && scrollState.canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center">
            <button
              onClick={() => scrollToDirection("left")}
              className={`w-8 h-8 rounded-full border shadow-lg flex items-center justify-center ml-1 transition-all duration-200 ${scrollButtonClass}`}
              aria-label="Scroll left"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Right Scroll Indicator */}
        {scrollState.showIndicators && scrollState.canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center">
            <button
              onClick={() => scrollToDirection("right")}
              className={`w-8 h-8 rounded-full border shadow-lg flex items-center justify-center mr-1 transition-all duration-200 ${scrollButtonClass}`}
              aria-label="Scroll right"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          className="scroll-container overflow-x-auto"
          onScroll={handleScroll}
          style={{
            paddingLeft:
              scrollState.showIndicators && scrollState.canScrollLeft ? "40px" : "0",
            paddingRight:
              scrollState.showIndicators && scrollState.canScrollRight ? "40px" : "0",
          }}
        >
          <nav className="flex space-x-1 p-2 min-w-[900px]">
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

                {/* NEW indicator badge for blockchain tab on mobile */}
                {tab.highlight && activeTab !== tab.id && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
                  </span>
                )}

                {/* Mobile count badge */}
                {tab.count !== null && tab.count > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-4 px-1 text-xs font-bold leading-none rounded-full shadow-sm ${
                      activeTab === tab.id
                        ? "bg-white/90 text-indigo-600"
                        : tab.countColor || "bg-red-500"
                    }`}
                    aria-label={`${tab.count} ${tab.countLabel || "items"}`}
                  >
                    {tab.count > 9 ? "9+" : tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Horizontal Scroll Position Indicator */}
        {scrollState.showIndicators && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 z-20">
            <div
              className={`h-1 w-16 rounded-full ${
                isDark ? "bg-gray-600" : "bg-gray-300"
              } relative`}
            >
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${
                    scrollContainerRef.current
                      ? (scrollContainerRef.current.clientWidth /
                          scrollContainerRef.current.scrollWidth) *
                        100
                      : 100
                  }%`,
                  transform: `translateX(${
                    scrollContainerRef.current
                      ? (scrollContainerRef.current.scrollLeft /
                          (scrollContainerRef.current.scrollWidth -
                            scrollContainerRef.current.clientWidth)) *
                        (64 -
                          (scrollContainerRef.current.clientWidth /
                            scrollContainerRef.current.scrollWidth) *
                            64)
                      : 0
                  }px)`,
                }}
              />
            </div>
          </div>
        )}

        {/* Active tab indicator for very small screens */}
        <div className="sm:hidden bg-slate-50 px-3 py-2">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-base">
              {tabs.find((tab) => tab.id === activeTab)?.icon}
            </span>
            <span className="text-sm font-medium text-slate-700">
              {tabs.find((tab) => tab.id === activeTab)?.label || "Current Tab"}
            </span>
            {/* Show count in active tab indicator if present */}
            {(() => {
              const activeTabData = tabs.find((tab) => tab.id === activeTab);
              return activeTabData?.count > 0 ? (
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white rounded-full ${
                    activeTabData.countColor || "bg-red-500"
                  }`}
                >
                  {activeTabData.count > 99 ? "99+" : activeTabData.count}
                </span>
              ) : null;
            })()}
          </div>
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .scroll-container::-webkit-scrollbar {
          height: 6px;
        }
        .scroll-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .scroll-container::-webkit-scrollbar-thumb {
          background-color: ${isDark ? "#4c51bf" : "#9ca3af"};
          border-radius: 3px;
        }

        .scroll-container {
          scrollbar-width: thin;
          scrollbar-color: ${isDark ? "#4c51bf transparent" : "#9ca3af transparent"};
        }
      `}</style>
    </div>
  );
}