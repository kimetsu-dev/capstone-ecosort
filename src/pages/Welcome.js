import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";

// Icon components with modern styling
const RecycleIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2L13.5 6.5L18 8L13.5 9.5L12 14L10.5 9.5L6 8L10.5 6.5L12 2Z" opacity="0.6"/>
    <path d="M7.03 2.6a8.03 8.03 0 0 1 5.4 0l.49.16c.28.09.49.33.49.62 0 .36-.3.66-.66.66a.66.66 0 0 1-.2-.03l-.49-.16a6.71 6.71 0 0 0-4.52 0l-.49.16a.66.66 0 0 1-.2.03c-.36 0-.66-.3-.66-.66 0-.3.21-.53.49-.62l.49-.16z"/>
    <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2,2"/>
  </svg>
);

const ReportIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    <circle cx="12" cy="12" r="10" opacity="0.1" fill="currentColor"/>
  </svg>
);

const CommunityIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
);

const ShieldIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const ChatIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
  </svg>
);

const ArrowRight = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
);

const CoinsIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="8" cy="8" r="6" opacity="0.3" fill="currentColor"/>
    <circle cx="12" cy="12" r="6" opacity="0.6" fill="currentColor"/>
    <circle cx="16" cy="16" r="6" opacity="0.3" fill="currentColor"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const SparkleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2L13.5 6.5L18 8L13.5 9.5L12 14L10.5 9.5L6 8L10.5 6.5L12 2Z"/>
  </svg>
);

function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [manualPromptVisible, setManualPromptVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
      setManualPromptVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const ua = window.navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod/.test(ua);
    if (isMobile) {
      setManualPromptVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    setIsVisible(false);
    setDeferredPrompt(null);
    setManualPromptVisible(false);
  };

  if (manualPromptVisible) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-green-500/10 backdrop-blur-xl border border-emerald-200/30 rounded-3xl p-6 mt-8 max-w-md mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/50 via-teal-50/50 to-green-50/50"></div>
        <div className="relative text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <SparkleIcon className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-emerald-800">Install ECOSORT</span>
            <SparkleIcon className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            <span className="font-semibold text-emerald-700">Android:</span> Menu (⋮) → "Add to Home screen"<br/>
            <span className="font-semibold text-emerald-700">iOS:</span> Share (📤) → "Add to Home Screen"
          </p>
          <div className="flex gap-3 justify-center">
            {isVisible && (
              <button
                onClick={handleInstallClick}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 text-sm"
              >
                📱 Quick Install
              </button>
            )}
            <button
              onClick={() => setManualPromptVisible(false)}
              className="px-6 py-2.5 bg-white/80 backdrop-blur-sm text-gray-700 rounded-2xl font-medium hover:bg-white transition-all duration-200 text-sm border border-gray-200"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function Welcome() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [floatingElements, setFloatingElements] = useState([]);
  const [scrollY, setScrollY] = useState(0);

  const { styles, isDark } = useTheme();

  useEffect(() => {
    setIsVisible(true);

    const featureInterval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % 3);
    }, 4000);

    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);

    const elements = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      type: ['leaf', 'recycle', 'drop', 'spark'][i % 4],
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 8000,
      duration: 10000 + Math.random() * 8000,
      size: 0.5 + Math.random() * 1,
    }));
    setFloatingElements(elements);

    return () => {
      clearInterval(featureInterval);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const features = [
    {
      icon: RecycleIcon,
      title: "Recycle & Earn",
      description: "Exchange recyclable waste for valuable EcoPoints that can be redeemed for essential goods and community rewards",
      gradient: "from-emerald-400 via-teal-500 to-green-600",
      accent: "emerald",
    },
    {
      icon: ReportIcon,
      title: "Report Violations",
      description: "Help maintain community cleanliness by reporting waste-related violations and environmental concerns to barangay officials",
      gradient: "from-orange-400 via-red-500 to-pink-600",
      accent: "red",
    },
    {
      icon: CommunityIcon,
      title: "Report Violations",
      description: "Help maintain community cleanliness by reporting waste-related violations and environmental concerns to barangay officials",
      gradient: "from-blue-400 via-indigo-500 to-purple-600",
      accent: "blue",
    }
  ];

  const getParticleIcon = (type) => {
    switch (type) {
      case 'leaf': return '🍃';
      case 'recycle': return '♻️';
      case 'drop': return '💧';
      case 'spark': return '✨';
      default: return '🌿';
    }
  };

  return (
    <div className={`relative min-h-screen transition-colors duration-500 ${styles.backgroundGradient} overflow-hidden`}>
      {/* Modern floating particles */}
      {floatingElements.map(el => (
        <div
          key={el.id}
          className="absolute opacity-20 animate-float-modern pointer-events-none"
          style={{
            left: `${el.x}%`,
            top: `${el.y}%`,
            animationDelay: `${el.delay}ms`,
            animationDuration: `${el.duration}ms`,
            fontSize: `${el.size * 2}rem`,
            transform: `translateY(${scrollY * 0.1}px)`,
          }}
        >
          {getParticleIcon(el.type)}
        </div>
      ))}

      {/* Glass morphism navigation */}
      <nav className={`relative z-50 bg-white/70 backdrop-blur-2xl border-b border-white/20 sticky top-0 shadow-lg shadow-emerald-500/5 ${isDark ? "bg-gray-900/70 border-gray-700 border-opacity-20" : ""}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 via-teal-500 to-green-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-500/25">
                  E
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <span className="text-3xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 bg-clip-text text-transparent">
                  ECOSORT
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/signup')}
                className="group relative overflow-hidden px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 transform hover:-translate-y-1"
              >
                <span className="relative z-10">Join Now</span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              <button
                onClick={() => navigate('/login')}
                className={`px-6 py-2.5 backdrop-blur-sm rounded-2xl font-semibold border border-gray-200/50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 ${
                  isDark ? 'bg-gray-800 text-gray-200 border-gray-600 hover:bg-gray-700' : 'bg-white/80 text-gray-700 hover:bg-white'
                }`}
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero section with glass morphism */}
      <section className={`relative z-10 px-4 sm:px-6 lg:px-8 py-24 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-10">

              {/* Main heading */}
              <div className="space-y-6">
                <h1 className={`text-5xl sm:text-7xl lg:text-8xl font-black leading-none ${isDark ? "text-white" : "text-gray-900"}`}>
                  <span className="block bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 bg-clip-text text-transparent">
                    Community
                  </span>
                  <span className="block mt-2">
                    Waste Hub
                  </span>
                </h1>
                <p className="text-xl text-gray-600 max-w-full sm:max-w-2xl leading-relaxed mx-auto lg:mx-0">
                  The comprehensive community platform for waste management.&nbsp;
                  <span className="font-semibold text-emerald-700">Recycle for rewards</span>,&nbsp;
                  <span className="font-semibold text-red-600">report violations</span>, and&nbsp;
                  <span className="font-semibold text-blue-600">connect with your community</span> for a cleaner, sustainable future.
                </p>
              </div>


              {/* CTA buttons */}
                <div className="flex flex-row gap-4 justify-start items-center">
                  <button
                    onClick={() => navigate('/signup')}
                    className="group relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 text-white px-6 py-3 rounded-xl font-semibold text-base shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 flex items-center gap-2"
                  >
                    <span className="relative z-10 flex items-center gap-2 whitespace-nowrap">
                      <span>🚀</span> Start Your Journey
                      <ArrowRight className="group-hover:translate-x-2 transition-transform duration-300" />
                    </span>
                  </button>
                </div>


              <InstallPWAButton />
            </div>

            {/* Modern hero visual */}
            <div className="relative">
              <div className={`relative rounded-[3rem] p-12 border shadow-2xl
                ${isDark
                  ? "bg-gradient-to-br from-slate-900 via-gray-900 to-emerald-900 border-gray-700 shadow-emerald-900/60"
                  : "bg-gradient-to-br from-white/40 via-emerald-50/60 to-teal-50/40 border-white/20 shadow-emerald-500/10"
                } backdrop-blur-2xl`}>
                <div className="aspect-square bg-gradient-to-br from-emerald-100/80 via-teal-100/60 to-green-100/40 rounded-[2.5rem] flex items-center justify-center relative overflow-hidden">
                  {/* Central icon */}
                  <div className="text-center space-y-6 relative z-10">
                    <div className="text-8xl animate-bounce-soft filter drop-shadow-lg">
                      🌱
                    </div>
                    <div className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">
                      ECOSORT
                    </div>
                    <div className="font-medium text-lg" style={{color: isDark ? "#22c55e" : "#16a34a"}}>
                      Smart Waste Solutions
                    </div>
                  </div>

                  {/* Orbital elements */}
                  <div className="absolute inset-0">
                    <div className="absolute top-8 left-8 w-16 h-16 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg flex items-center justify-center animate-float" style={{color: isDark ? "rgba(255,255,255,0.8)" : undefined}}>
                      <span className="text-2xl">♻️</span>
                    </div>
                    <div className="absolute bottom-8 right-8 w-16 h-16 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg flex items-center justify-center animate-float-reverse" style={{color: isDark ? "rgba(255,255,255,0.8)" : undefined}}>
                      <span className="text-2xl">🏘️</span>
                    </div>
                    <div className="absolute top-8 right-8 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg flex items-center justify-center animate-float-slow" style={{color: isDark ? "rgba(255,255,255,0.8)" : undefined}}>
                      <span className="text-xl">⭐</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating cards with glass effect */}
              <div className="absolute -top-8 -right-8 bg-white/70 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/20 animate-float transform hover:scale-110 transition-transform cursor-pointer">
                <CoinsIcon className="w-8 h-8 text-amber-500 mb-2" />
                <div className="text-sm font-bold text-amber-700">+150 Points</div>
                <div className="text-xs" style={{color: isDark ? "#fbbf24" : "#92400e"}}>Today's Impact</div>
              </div>

              <div className="absolute -bottom-8 -left-8 bg-white/70 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/20 animate-float-reverse transform hover:scale-110 transition-transform cursor-pointer">
                <ReportIcon className="w-8 h-8 text-red-500 mb-2" />
                <div className="text-sm font-bold text-red-700">3 Reports</div>
                <div className="text-xs" style={{color: isDark ? "#f87171" : "#991b1b"}}>This Week</div>
              </div>
            </div>
          </div>
        </div>
      </section>

     
      <section 
        id="platform-features"
        className={`relative z-10 py-32 backdrop-blur-sm transition-colors duration-500 ${
        isDark ? "bg-gradient-to-br from-slate-900 via-gray-900 to-emerald-900" : "bg-gradient-to-br from-white/60 via-emerald-50/40 to-teal-50/30"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className={`inline-flex items-center gap-2 rounded-full px-6 py-3 font-medium shadow-lg mb-8 transition-colors duration-300 ${
              isDark
                ? "bg-gray-800 border border-emerald-200/30 text-emerald-400 backdrop-blur-xl"
                : "bg-white/70 border border-emerald-200/30 text-emerald-800 backdrop-blur-xl"
            }`}>
              <SparkleIcon className="w-4 h-4" />
              <span>Platform Features</span>
              <SparkleIcon className="w-4 h-4" />
            </div>
            <h2 className={`text-5xl font-black mb-6 ${isDark ? "text-white" : "text-gray-900"}`}>
              Waste Management Solution
            </h2>
            <p className={`text-xl max-w-3xl mx-auto leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              ECOSORT combines recycling rewards, community reporting, and social features to create a comprehensive platform for sustainable waste management in Barangay Teodora Alonzo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              const isActive = activeFeature === index;

              return (
                <div
                 key={index}
                  className={`group relative overflow-hidden rounded-3xl transition-all duration-700 transform px-4 ${
                    isActive
                      ? (isDark
                          ? 'bg-gray-800 shadow-emerald-700/50 border-emerald-600'
                          : 'bg-white/90 shadow-emerald-500 scale-105 border-2 border-emerald-200/50')
                      : (isDark
                          ? 'bg-gray-900 bg-opacity-80 shadow-lg border border-gray-700'
                          : 'bg-white/70 shadow-lg border border-white/20 hover:shadow-xl hover:scale-102')
                  }`}
                >
                  {/* Background gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-500`}></div>

                  <div className="relative p-8 text-center space-y-6">
                    <div className={`relative w-20 h-20 bg-gradient-to-br ${feature.gradient} rounded-3xl flex items-center justify-center mx-auto shadow-lg transition-all duration-500 ${isActive ? 'scale-110 shadow-xl' : 'group-hover:scale-105'}`}>
                      <IconComponent className="w-10 h-10 text-white" />
                      <div className="absolute inset-0 bg-white/20 rounded-3xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                    </div>

                    <div className="space-y-3">
                      <h3 className={`${isDark ? "text-white" : "text-gray-900"} text-2xl font-bold`}>{feature.title}</h3>
                      <p className={`${isDark ? "text-gray-300" : "text-gray-600"} leading-relaxed`}>{feature.description}</p>
                    </div>

                    {/* Feature indicator */}
                    <div className={`absolute -top-4 -right-4 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all duration-300 shadow-lg ${
                      isActive ? `bg-gradient-to-r ${feature.gradient} scale-110` : 'bg-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Community features with modern design */}
      <section className="relative z-10 py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className={`${isDark ? "text-white" : "text-gray-900"} text-5xl font-black mb-6`}>
              Empowering Community Action
            </h2>
            <p className={`${isDark ? "text-gray-300" : "text-gray-600"} text-xl max-w-3xl mx-auto leading-relaxed`}>
              Beyond recycling rewards, ECOSORT strengthens community bonds through collaborative waste management solutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <div className={`group rounded-3xl p-10 shadow-xl transition-all duration-300 transform hover:scale-102 border backdrop-blur-xl ${
              isDark
                ? "bg-gray-800 border-gray-700 hover:shadow-emerald-700/40"
                : "bg-white/70 border-white/20 hover:shadow-lg"
            }`}>
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 via-teal-200 to-green-200 rounded-3xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <ShieldIcon className="w-10 h-10 text-emerald-600" />
                </div>
                <div className="space-y-4">
                  <h3 className={`${isDark ? "text-white" : "text-gray-900"} text-2xl font-bold`}>Transparent Reporting</h3>
                  <p className={`${isDark ? "text-gray-300" : "text-gray-600"} leading-relaxed text-lg`}>
                   Community reporting system for waste violations with quick response from barangay officials and visible community engagement.
                  </p>
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                    <SparkleIcon className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            <div className={`group rounded-3xl p-10 shadow-xl transition-all duration-300 transform hover:scale-102 border backdrop-blur-xl ${
              isDark
                ? "bg-gray-900 bg-opacity-80 border-gray-700 hover:shadow-blue-700/40"
                : "bg-white/70 border-white/20 hover:shadow-lg"
            }`}>
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 via-indigo-200 to-purple-200 rounded-3xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <ChatIcon className="w-10 h-10 text-blue-600" />
                </div>
                <div className="space-y-4">
                  <h3 className={`${isDark ? "text-white" : "text-gray-900"} text-2xl font-bold`}>Discussion Forums</h3>
                  <p className={`${isDark ? "text-gray-300" : "text-gray-600"} leading-relaxed text-lg`}>
                    Share ideas, ask questions, and collaborate on waste management solutions with your community.
                  </p>
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                    <SparkleIcon className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits section with modern grid */}
      <section className={`relative z-10 py-32 backdrop-blur-sm transition-colors duration-500 ${
        isDark ? "bg-gradient-to-br from-slate-900 via-gray-900 to-emerald-900" : "bg-gradient-to-br from-white/80 via-emerald-50/60 to-teal-50/40"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-10">
              <div className="space-y-6">
                <div className={`inline-flex items-center gap-2 rounded-full px-6 py-3 font-medium shadow-lg mb-8 transition-colors duration-300 ${
                  isDark ? "bg-gray-800 border border-emerald-200/30 text-emerald-400 backdrop-blur-xl" : "bg-white/70 border border-emerald-200/30 text-emerald-800 backdrop-blur-xl"
                }`}>
                  <SparkleIcon className="w-4 h-4" />
                  <span>Why Choose ECOSORT</span>
                </div>
                <h2 className={`${isDark ? "text-white" : "text-gray-900"} text-5xl font-black`}>Impact That Matters</h2>
                <p className={`${isDark ? "text-gray-300" : "text-gray-600"} text-xl leading-relaxed`}>
                  Join users who are already making a difference through our comprehensive waste management platform.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
          {[
            "Earn real rewards for recycling efforts",
            "Report and resolve community waste issues",
            "Connect with environmentally conscious users",
            "Access community discussion forums",
            "Contribute to a cleaner community",
            "Participate in community-driven solutions",
            "Build stronger community relationships"
          ].map((benefit, index) => (
            <div key={index} className="flex items-start gap-4 p-4 bg-white/80 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-6 h-6 bg-gradient-to-br from-emerald-100 to-green-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                <CheckIcon className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-gray-700 font-medium">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative max-w-md sm:max-w-none mx-auto lg:mx-0">
        <div className="bg-gradient-to-br from-emerald-100 via-green-200 to-teal-200 rounded-3xl p-10 h-80 sm:h-96 flex items-center justify-center shadow-xl">
          <div className="text-center space-y-6 px-4">
            <div className="text-7xl sm:text-8xl animate-pulse">🏘️</div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-700">United Community</div>
            <div className="text-emerald-600 font-medium text-lg sm:text-xl">
              Working together for a community
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

      {/* Modern CTA section */}
      <section className="relative z-10 py-32 bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/95 via-teal-600/95 to-green-700/95"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/3 rounded-full blur-3xl animate-float-reverse"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/8 rounded-full blur-2xl animate-pulse-slow"></div>
        </div>

        <div className="relative max-w-6xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="space-y-10">
            <div className="space-y-6">
              <div className="text-7xl animate-bounce-soft filter drop-shadow-lg">🌱</div>
              <h2 className="text-6xl font-black text-white leading-tight">
                Ready to Lead the
                <span className="block bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-300 bg-clip-text text-transparent">
                  Green Revolution?
                </span>
              </h2>
              <p className="text-xl text-emerald-100 max-w-4xl mx-auto leading-relaxed">
                Be part of the solution. Transform waste into wealth, reports into results, and neighbors into environmental champions.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button
                onClick={() => navigate('/signup')}
                className="group relative overflow-hidden bg-white text-emerald-600 px-12 py-5 rounded-2xl font-bold text-xl hover:bg-emerald-50 transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 shadow-2xl"
              >
                <span className="relative z-10 flex items-center gap-3">
                  <span>🚀</span>
                  Start Your Impact
                </span>
              </button>

              <button
                onClick={() => {
                  const element = document.getElementById("platform-features");
                  if (element) element.scrollIntoView({ behavior: "smooth" });
                }}
                className="group border-3 border-white/30 text-white px-12 py-5 rounded-2xl font-bold text-xl hover:bg-white/10 hover:border-white transition-all duration-300 transform hover:scale-105 shadow-xl backdrop-blur-sm"
              >
                <span className="flex items-center gap-3">
                  <span>📖</span>
                  Explore Platform
                </span>
              </button>

            </div>

            <div className="flex items-center justify-center gap-8 pt-8 text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5" />
                <span className="font-medium">Free to Join</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5" />
                <span className="font-medium">Instant Rewards</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5" />
                <span className="font-medium">Community Driven</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modern footer */}
      <footer className="relative z-10 bg-gradient-to-br from-slate-900 via-gray-900 to-emerald-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  E
                </div>
                <div>
                  <span className="text-2xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    ECOSORT
                  </span>
                  <p className="text-xs text-gray-400">Smart Waste Solutions</p>
                </div>
              </div>
              <p className="text-gray-300 leading-relaxed">
                Pioneering sustainable waste management through community collaboration and cutting-edge technology.
              </p>
              <div className="flex gap-3 text-3xl">
                <span className="hover:scale-110 transition-transform cursor-pointer">🌱</span>
                <span className="hover:scale-110 transition-transform cursor-pointer">♻️</span>
                <span className="hover:scale-110 transition-transform cursor-pointer">🏘️</span>
                <span className="hover:scale-110 transition-transform cursor-pointer">✨</span>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-emerald-400 text-lg">Platform</h4>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center gap-3 hover:text-emerald-300 transition-colors cursor-pointer">
                  <span className="text-emerald-400">♻️</span>
                  Recycling Rewards
                </li>
                <li className="flex items-center gap-3 hover:text-red-300 transition-colors cursor-pointer">
                  <span className="text-red-400">⚠️</span>
                  Violation Reporting
                </li>
                <li className="flex items-center gap-3 hover:text-blue-300 transition-colors cursor-pointer">
                  <span className="text-blue-400">💬</span>
                  Community Forums
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-emerald-400 text-lg">Schedule</h4>
              <div className="space-y-4 text-gray-300">
                <div className="bg-emerald-900/30 backdrop-blur-sm p-4 rounded-2xl border border-emerald-800/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-amber-400">📅</span>
                    <span className="font-semibold">Collection Days</span>
                  </div>
                  <p className="text-sm text-emerald-200">Every Thursday, 8 AM - 12 PM</p>
                </div>
                <div className="bg-blue-900/30 backdrop-blur-sm p-4 rounded-2xl border border-blue-800/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-400">⏰</span>
                    <span className="font-semibold">Next Collection</span>
                  </div>
                  <p className="text-sm text-blue-200">In 3 days, 2 hours</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-emerald-400 text-lg">Connect</h4>
              <div className="space-y-4 text-gray-300">
                <div className="flex items-center gap-3">
                  <span className="text-blue-400">📧</span>
                  <span className="text-sm">talonzo@gmail.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-400">📱</span>
                  <span>+63 912 345 6789</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-purple-400">🏢</span>
                  <span className="text-sm">Barangay Teodora Alonzo</span>
                </div>
                <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 backdrop-blur-sm p-4 rounded-2xl border border-emerald-800/20 mt-6">
                  <p className="text-sm text-emerald-200 flex items-center gap-2">
                    <span>🌍</span>
                    24/7 Community Support Available
                  </p>
                </div>
              </div>
            </div>
          </div>

            <div className="border-t border-gray-700 mt-12 pt-8 text-center px-4">
            <span className="text-gray-400 text-sm block w-full">
                &copy; 2025 ECOSORT. Transforming communities, one action at a time.
              </span>
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <span className="hover:text-emerald-400 transition-colors cursor-pointer">Privacy</span>
                <span className="hover:text-emerald-400 transition-colors cursor-pointer">Terms</span>
                <span className="hover:text-emerald-400 transition-colors cursor-pointer">Support</span>
              </div>
          </div>
        </div>
      </footer>

      {/* Modern CSS animations and effects */}
      <style>{`
        @keyframes float-modern {
          0%, 100% {
            transform: translateY(0px) translateX(0px) rotate(0deg) scale(1);
            opacity: 0.3;
          }
          25% {
            transform: translateY(-20px) translateX(15px) rotate(45deg) scale(1.1);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-35px) translateX(-10px) rotate(90deg) scale(0.9);
            opacity: 0.2;
          }
          75% {
            transform: translateY(-15px) translateX(-20px) rotate(135deg) scale(1.05);
            opacity: 0.5;
          }
        }

        @keyframes bounce-soft {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-15px) scale(1.05);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }

        @keyframes float-reverse {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(20px) rotate(-5deg);
          }
        }

        @keyframes float-slow {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(3deg);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.08);
          }
        }

        .animate-float-modern {
          animation: float-modern 15s ease-in-out infinite;
        }

        .animate-bounce-soft {
          animation: bounce-soft 3s ease-in-out infinite;
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-reverse {
          animation: float-reverse 8s ease-in-out infinite;
        }

        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }

        .border-3 {
          border-width: 3px;
        }

        /* Glassmorphism backdrop blur support */
        .backdrop-blur-2xl {
          backdrop-filter: blur(40px);
        }

        .backdrop-blur-xl {
          backdrop-filter: blur(24px);
        }

        .backdrop-blur-sm {
          backdrop-filter: blur(4px);
        }

        /* Custom scrollbar with modern design */
        ::-webkit-scrollbar {
          width: 6px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(241, 245, 249, 0.5);
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #10b981, #0d9488);
          border-radius: 8px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #059669, #0f766e);
        }

        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }

        /* Selection styling */
        ::selection {
          background: rgba(16, 185, 129, 0.2);
          color: #065f46;
        }
      `}</style>
    </div>
  );
}

