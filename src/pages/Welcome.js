import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useTheme } from '../contexts/ThemeContext';

// Icon components with modern styling
const RecycleIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2L13.5 6.5L18 8L13.5 9.5L12 14L10.5 9.5L6 8L10.5 6.5L12 2Z" opacity="0.6"/>
    <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2,2"/>
  </svg>
);

const ReportIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const CommunityIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
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

// PWA Install Component
function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    setIsVisible(false);
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-green-500/10 backdrop-blur-xl border border-emerald-200/30 rounded-3xl p-4 sm:p-6 mt-6 sm:mt-8 max-w-md mx-auto">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/50 via-teal-50/50 to-green-50/50"></div>
      <div className="relative text-center space-y-3 sm:space-y-4">
        <div className="flex items-center justify-center gap-2 mb-2 sm:mb-3">
          <SparkleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
          <span className="font-bold text-emerald-800 text-sm sm:text-base">Install ECOSORT</span>
          <SparkleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
        </div>
        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed px-2">
          Access waste management tools directly from your home screen
        </p>
        <button
          onClick={handleInstallClick}
          className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl sm:rounded-2xl font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 text-xs sm:text-sm"
        >
          Install App
        </button>
      </div>
    </div>
  );
}

export default function Welcome() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const { styles, isDark, theme } = useTheme();

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: RecycleIcon,
      title: "Earn EcoPoints",
      description: "Transform recyclable waste into valuable rewards through proper segregation and sustainable practices in your community.",
      gradient: "from-emerald-400 via-teal-500 to-green-600",
      accent: "emerald",
    },
    {
      icon: ReportIcon,
      title: "Report Issues",
      description: "Maintain community cleanliness by reporting improper waste disposal and connecting with local authorities for resolution.",
      gradient: "from-orange-400 via-red-500 to-pink-600",
      accent: "red",
    },
    {
      icon: CommunityIcon,
      title: "Community Hub",
      description: "Connect with neighbors through forums, share environmental ideas, and participate in local sustainability initiatives.",
      gradient: "from-blue-400 via-indigo-500 to-purple-600",
      accent: "blue",
    },
  ];

  const benefits = [
    "Earn rewards for proper waste segregation",
    "Direct reporting to local authorities",
    "Connect with eco-conscious neighbors", 
    "Join community cleanup events"
  ];

  return (
    <div className={`relative min-h-screen overflow-hidden ${styles.page}`}>
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-20 left-20 w-32 h-32 sm:w-64 sm:h-64 rounded-full blur-3xl animate-pulse ${
          isDark ? 'bg-emerald-500/10' : 'bg-emerald-200/20'
        }`}></div>
        <div className={`absolute bottom-20 right-20 w-48 h-48 sm:w-96 sm:h-96 rounded-full blur-3xl animate-pulse delay-1000 ${
          isDark ? 'bg-teal-500/10' : 'bg-teal-200/20'
        }`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-48 sm:h-48 rounded-full blur-2xl animate-pulse delay-2000 ${
          isDark ? 'bg-green-500/10' : 'bg-green-200/20'
        }`}></div>
      </div>

      {/* Navigation */}
      <nav className={`relative z-50 backdrop-blur-xl border-b sticky top-0 shadow-lg ${
        isDark ? 'bg-slate-900/70 border-white/10' : 'bg-white/70 border-white/20'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="relative">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-emerald-500 via-teal-500 to-green-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-sm sm:text-lg md:text-xl shadow-lg">E</div>

              </div>
              <div>
                <span className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 bg-clip-text text-transparent`}>
                  ECOSORT
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={() => navigate('/signup')}
                className="group bg-emerald-500 text-white rounded-lg sm:rounded-xl font-medium shadow-md hover:shadow-lg hover:bg-emerald-600 transition-all duration-200 px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap"
              >
                <span className="hidden xs:inline">Sign Up</span>
                <span className="xs:hidden">Sign Up</span>
    
              </button>
              <button
                onClick={() => navigate('/login')}
                className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl font-medium border transition-all duration-200 text-xs sm:text-sm whitespace-nowrap ${
                  isDark 
                    ? 'border-gray-600 text-gray-300 bg-slate-800 hover:bg-slate-700 hover:shadow-md' 
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:shadow-md'
                }`}
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={`relative z-10 px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center">
            <div className="space-y-6 sm:space-y-8 lg:space-y-10 text-center max-w-4xl">
              <div className="space-y-4 sm:space-y-6">
                <h1 className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black leading-tight ${styles.text.primary}`}>
                  <span className="block bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 bg-clip-text text-transparent">
                    ECOSORT
                  </span>
                  <span className="block mt-1 sm:mt-2 text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
                  
                  </span>
                </h1>
                <p className={`text-sm sm:text-base lg:text-lg xl:text-xl leading-relaxed max-w-2xl mx-auto ${styles.text.secondary}`}>
                  Transforming communities.
                  <span className="font-semibold text-emerald-700"> Recycle for rewards</span>, 
                  <span className="font-semibold text-red-600"> report issues</span>, and 
                  <span className="font-semibold text-blue-600"> connect with your community for a cleaner, sustainable future.</span> 
                </p>
              </div>
                    
              
              <InstallPWAButton />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={`relative z-10 py-12 sm:py-16 lg:py-24 backdrop-blur-sm ${
        isDark ? 'bg-slate-800/20' : 'bg-gradient-to-br from-white/80 via-emerald-50/60 to-teal-50/40'
      }`} data-section="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 lg:mb-20">
            <div className={`inline-flex items-center gap-2 rounded-full px-4 sm:px-6 py-2 sm:py-3 font-medium shadow-lg mb-4 sm:mb-6 lg:mb-8 backdrop-blur-xl text-xs sm:text-sm ${
              isDark 
                ? 'bg-slate-800/70 border border-emerald-500/30 text-emerald-300' 
                : 'bg-white/70 border border-emerald-200/30 text-emerald-800'
            }`}>
              <SparkleIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Platform Features</span>
              <SparkleIcon className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
            <h2 className={`text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black mb-3 sm:mb-4 lg:mb-6 ${styles.text.primary}`}>
              
            </h2>
            <p className={`text-sm sm:text-base lg:text-lg xl:text-xl max-w-3xl mx-auto leading-relaxed px-4 ${styles.text.secondary}`}>
              ECOSORT combines recycling rewards, community reporting, and social engagement to create sustainable waste management in your neighborhood.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              const isActive = activeFeature === index;

              return (
                <div
                  key={index}
                  className={`group relative overflow-hidden rounded-xl sm:rounded-2xl lg:rounded-3xl transition-all duration-700 transform px-4 sm:px-6 py-6 sm:py-8 lg:py-10 ${
                    isActive
                      ? `${isDark ? 'bg-slate-800/90 border-2 border-emerald-400/50' : 'bg-white/90 border-2 border-emerald-200/50'} shadow-2xl scale-105`
                      : `${isDark ? 'bg-slate-800/70 border border-slate-600/30' : 'bg-white/70 border border-white/20'} shadow-xl hover:shadow-2xl hover:scale-102`
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-500`}></div>

                  <div className="relative text-center space-y-3 sm:space-y-4 lg:space-y-6">
                    <div className={`relative w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br ${feature.gradient} rounded-xl sm:rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto shadow-lg transition-transform duration-500 ${isActive ? 'scale-110 shadow-xl' : 'group-hover:scale-105'}`}>
                      <IconComponent className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
                    </div>

                    <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                      <h3 className={`text-base sm:text-lg lg:text-xl xl:text-2xl font-bold ${styles.text.primary}`}>{feature.title}</h3>
                      <p className={`text-xs sm:text-sm lg:text-base leading-relaxed px-2 ${styles.text.secondary}`}>{feature.description}</p>
                    </div>

                    <div className={`absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all duration-300 shadow-lg ${
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

     

      {/* CTA Section */}
      <section className={`relative z-10 py-12 sm:py-16 lg:py-24 overflow-hidden ${
        isDark 
          ? 'bg-gradient-to-br from-slate-800 via-gray-800 to-emerald-800' 
          : 'bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700'
      }`}>
        <div className="absolute inset-0">
          <div className={`absolute top-20 left-20 w-32 h-32 sm:w-64 sm:h-64 rounded-full blur-3xl animate-pulse ${
            isDark ? 'bg-emerald-400/10' : 'bg-white/5'
          }`}></div>
          <div className={`absolute bottom-20 right-20 w-48 h-48 sm:w-96 sm:h-96 rounded-full blur-3xl animate-pulse delay-1000 ${
            isDark ? 'bg-teal-400/5' : 'bg-white/3'
          }`}></div>
        </div>

        <div className="relative max-w-6xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="space-y-6 sm:space-y-8 lg:space-y-10">
            <div className="space-y-3 sm:space-y-4 lg:space-y-6">
              <div className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl animate-bounce">🌍</div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white leading-tight">
                Ready to Transform
                <span className={`block bg-gradient-to-r bg-clip-text text-transparent ${
                  isDark 
                    ? 'from-emerald-300 via-teal-300 to-green-300' 
                    : 'from-yellow-300 via-amber-300 to-orange-300'
                }`}>
                  Your Community?
                </span>
              </h2>
              <p className={`text-sm sm:text-base lg:text-lg xl:text-xl max-w-3xl mx-auto leading-relaxed ${
                isDark ? 'text-gray-200' : 'text-emerald-100'
              }`}>
                Join ECOSORT today and start making meaningful impact in your community's waste management. Every action counts toward a cleaner, sustainable future.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-lg mx-auto">
              <button
                onClick={() => navigate('/signup')}
                className={`group px-6 py-3 sm:px-8 sm:py-4 rounded-lg font-bold text-sm sm:text-base transition-all duration-200 transform hover:-translate-y-1 shadow-lg flex-1 ${
                  isDark 
                    ? 'bg-emerald-500 text-white hover:bg-emerald-400' 
                    : 'bg-white text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                Start Your Journey
              </button>

              
            </div>

            
            
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`relative z-10 py-8 sm:py-12 lg:py-16 ${
        isDark 
          ? 'bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white' 
          : 'bg-gradient-to-br from-slate-900 via-gray-900 to-emerald-900 text-white'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
            <div className="space-y-3 sm:space-y-4 lg:space-y-6 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center text-white font-bold text-sm sm:text-lg lg:text-xl">
                  E
                </div>
                <div>
                  <span className="text-lg sm:text-xl lg:text-2xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    ECOSORT
                  </span>
                </div>
              </div>
              <p className="text-xs sm:text-sm lg:text-base text-gray-300 leading-relaxed">
                Transforming communities through sustainable waste management solutions. Recycle for rewards, report violations, and connect with your community for a cleaner, sustainable future.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-3 sm:mb-4 lg:mb-6 text-emerald-400 text-sm sm:text-base lg:text-lg">Platform Features</h4>
              <ul className="space-y-2 sm:space-y-3 text-gray-300 text-xs sm:text-sm lg:text-base">
                <li className="flex items-center gap-2 sm:gap-3">
                  <span className="text-emerald-400">♻️</span>
                  Recycling Rewards System
                </li>
                <li className="flex items-center gap-2 sm:gap-3">
                  <span className="text-red-400">⚠️</span>
                  Waste Violation Reporting
                </li>
                <li className="flex items-center gap-2 sm:gap-3">
                  <span className="text-blue-400">💬</span>
                  Community Forums
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-3 sm:mb-4 lg:mb-6 text-emerald-400 text-sm sm:text-base lg:text-lg">Contact Info</h4>
              <div className="space-y-2 sm:space-y-3 lg:space-y-4 text-gray-300 text-xs sm:text-sm lg:text-base">
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-emerald-400">📧</span>
                  <span className="text-xs sm:text-sm">support@ecosort.ph</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-green-400">📱</span>
                  <span>Mobile app available</span>
                </div>
                
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-6 sm:mt-8 lg:mt-12 pt-4 sm:pt-6 lg:pt-8 text-center">
            <div className="flex flex-col gap-3 sm:gap-4">
              <span className="text-gray-400 text-[10px] sm:text-xs lg:text-sm">
                &copy; 2025 ECOSORT. All rights reserved.
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom Styles */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(3deg);
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-15px) scale(1.05);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-bounce {
          animation: bounce 3s ease-in-out infinite;
        }

        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }

        /* Responsive breakpoints */
        @media (min-width: 475px) {
          .xs\\:inline {
            display: inline;
          }
          .xs\\:hidden {
            display: none;
          }
        }

        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 4px;
        }

        @media (min-width: 640px) {
          ::-webkit-scrollbar {
            width: 6px;
          }
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

        /* Selection styling */
        ::selection {
          background: rgba(16, 185, 129, 0.2);
          color: #065f46;
        }

        /* Mobile-first responsive utilities */
        @media (max-width: 374px) {
          .text-xs {
            font-size: 0.7rem;
          }
          .px-3 {
            padding-left: 0.5rem;
            padding-right: 0.5rem;
          }
          .py-2 {
            padding-top: 0.375rem;
            padding-bottom: 0.375rem;
          }
        }
      `}</style>
    </div>
  );
}