import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";

// Icon components  
const RecycleIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M7.03 2.6a8.03 8.03 0 0 1 5.4 0l.49.16c.28.09.49.33.49.62 0 .36-.3.66-.66.66a.66.66 0 0 1-.2-.03l-.49-.16a6.71 6.71 0 0 0-4.52 0l-.49.16a.66.66 0 0 1-.2.03c-.36 0-.66-.3-.66-.66 0-.3.21-.53.49-.62l.49-.16zm7.12 3.5c.3-.2.7-.2 1 0l.43.28c.24.16.39.4.39.68 0 .36-.3.66-.66.66-.14 0-.28-.04-.39-.12l-.43-.28a.66.66 0 0 1-.2-.92c.06-.1.14-.2.24-.28l.62-.02zm-6.44 3.95c.3-.22.7-.22 1 0l.43.32c.24.18.39.43.39.71 0 .36-.3.66-.66.66-.14 0-.28-.05-.39-.14l-.43-.32a.66.66 0 0 1-.2-.95c.06-.1.14-.19.24-.26l.62-.02z"/>
    <path d="M12 8c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm-1.5 6l-1.5-1.5 1.06-1.06.94.94L13.44 10 14.5 11.06 11.5 14z"/>
  </svg>
);

const ReportIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" opacity="0.8"/>
    <path d="M12 6l1.5 3L17 9.5l-2.5 2.5L15 16l-3-1.5L9 16l.5-4L7 9.5 10.5 9 12 6z"/>
    <circle cx="12" cy="10" r="1.5"/>
    <rect x="11" y="12" width="2" height="3" rx="1"/>
  </svg>
);

const CommunityIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" opacity="0.7"/>
    <circle cx="18" cy="7" r="3" opacity="0.5"/>
    <circle cx="6" cy="7" r="3" opacity="0.5"/>
    <path d="M18 13c-1.5 0-3 .5-3 1v1h6v-1c0-.5-1.5-1-3-1z" opacity="0.5"/>
    <path d="M6 13c-1.5 0-3 .5-3 1v1h6v-1c0-.5-1.5-1-3-1z" opacity="0.5"/>
  </svg>
);

const ShieldIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z" opacity="0.8"/>
    <path d="M12 3l7 3v5c0 4.55-3.16 8.74-7 9.5V3z" opacity="0.3"/>
  </svg>
);

const ChatIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" opacity="0.7"/>
    <circle cx="8" cy="10" r="1"/>
    <circle cx="12" cy="10" r="1"/>
    <circle cx="16" cy="10" r="1"/>
    <path d="M12 14c-1.5 0-2.5-.5-2.5-1h5c0 .5-1 1-2.5 1z"/>
  </svg>
);

const ArrowRight = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
);

// Additional icons used in your full Welcome component:
const CoinsIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="6" opacity="0.8"/>
    <circle cx="12" cy="12" r="6" opacity="0.6"/>
    <circle cx="12" cy="16" r="6" opacity="0.4"/>
    <path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 2.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5z"/>
  </svg>
);

const CheckIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Install Button Component
function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [manualPromptVisible, setManualPromptVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      console.log("beforeinstallprompt event fired");
      setDeferredPrompt(e);
      setIsVisible(true);

      // Show manual instructions banner also so users explicitly see how to install
      setManualPromptVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Also show manual install prompt on all mobile platforms including Chrome on Android
    // (You can refine if needed, this is a simple approach)
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
    const choiceResult = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${choiceResult.outcome}`);
    setIsVisible(false);
    setDeferredPrompt(null);
    // After native prompt, you may want to hide manual prompt as well
    setManualPromptVisible(false);
  };

  if (manualPromptVisible) {
    return (
      <div className="manual-install-prompt p-4 bg-yellow-100 border border-yellow-400 rounded-md mt-6 max-w-md text-center mx-auto">
        <p className="mb-2 font-semibold">Install this app on your device</p>
        <p className="mb-4 text-sm">
          {`On Android Chrome:`} Tap the <strong>menu (⋮)</strong> and select{" "}
          <strong>"Add to Home screen"</strong>.<br />
          {/* iOS users already have manual instructions here */}
          {`On iOS Safari:`} Tap the <strong>Share icon 📤</strong> then{" "}
          <strong>"Add to Home Screen"</strong>.
        </p>
        {isVisible && (
          <button
            onClick={handleInstallClick}
            className="mb-4 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
          >
            🚀 Install App
          </button>
        )}
        <button
          onClick={() => setManualPromptVisible(false)}
          className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 rounded-md font-bold"
        >
          Close
        </button>
      </div>
    );
  }

  // Show native install button only if available and manual banner hidden
  if (!isVisible) return null;

  return (
    <button
      onClick={handleInstallClick}
      className="mt-6 inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 transition mx-auto"
      aria-label="Install app"
      type="button"
    >
      🚀 Install App
    </button>
  );
}

export default function Welcome() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [floatingElements, setFloatingElements] = useState([]);

  useEffect(() => {
    setIsVisible(true);

    const featureInterval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % 3);
    }, 3500);

    // Generate floating emojis/elements
    const elements = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      emoji: ['♻️', '🌱', '🏘️', '📊', '🌍', '💚', '⭐', '🔄'][i % 8],
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5000,
      duration: 8000 + Math.random() * 4000,
    }));
    setFloatingElements(elements);

    return () => clearInterval(featureInterval);
  }, []);

  const features = [
    {
      icon: RecycleIcon,
      title: "Recycle & Earn",
      description: "Exchange recyclable waste for valuable EcoPoints that can be redeemed for essential goods and community rewards",
      gradient: "from-emerald-400 to-green-500",
    },
    {
      icon: ReportIcon,
      title: "Report Violations",
      description: "Help maintain community cleanliness by reporting waste-related violations and environmental concerns to barangay officials",
      gradient: "from-red-400 to-rose-500",
    },
    {
      icon: CommunityIcon,
      title: "Community Forum",
      description: "Connect with neighbors, share experiences, and collaborate on waste management initiatives in your barangay",
      gradient: "from-blue-400 to-cyan-500",
    }
  ];

  const benefits = [
    "Earn real rewards for recycling efforts",
    "Report and resolve community waste issues",
    "Connect with environmentally conscious neighbors",
    "Access community discussion forums",
    "Track your environmental impact",
    "Contribute to a cleaner Barangay Teodora Alonzo",
    "Participate in community-driven solutions",
    "Build stronger neighborhood relationships"
  ];

  const communityFeatures = [
    {
      icon: ShieldIcon,
      title: "Transparent Reporting",
      description: "Community reporting system for waste violations with quick response from barangay officials and visible community engagement",
      color: "text-emerald-600"
    },
    {
      icon: ChatIcon,
      title: "Discussion Forums",
      description: "Share ideas, ask questions, and collaborate on waste management solutions with your community",
      color: "text-blue-600"
    }
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 overflow-hidden">
      {/* Floating emojis */}
      {floatingElements.map(el => (
        <div
          key={el.id}
          className="absolute text-3xl sm:text-4xl opacity-20 animate-float-random pointer-events-none hidden xs:inline-block"
          style={{
            left: `${el.x}%`,
            top: `${el.y}%`,
            animationDelay: `${el.delay}ms`,
            animationDuration: `${el.duration}ms`,
          }}
        >
          {el.emoji}
        </div>
      ))}

      {/* Navigation header */}
      <nav className="relative z-10 bg-white/90 backdrop-blur-md border-b border-emerald-100/50 sticky top-0 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 whitespace-nowrap min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              E
            </div>
            <div className="min-w-0">
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent truncate block max-w-full">
                ECOSORT
              </span>
              <p className="text-xs text-gray-500 font-medium truncate max-w-full">Barangay Teodora Alonzo</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => navigate('/signup')}
              className="bg-gradient-to-r to-green-500 hover:from-emerald-500 hover:to-green-300 text-green-700 px-4 py-2 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 whitespace-nowrap text-sm sm:text-base"
            >
              Sign Up
            </button>
            <button
              onClick={() => navigate('/login')}
              className="bg-gradient-to-r to-green-500 hover:from-emerald-500 hover:to-green-300 text-green-700 px-4 py-2 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 whitespace-nowrap text-sm sm:text-base"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <section className={`relative z-10 px-4 sm:px-6 lg:px-8 py-20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left - texts */}
            <div className="text-center lg:text-left space-y-8">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 px-5 py-3 rounded-full text-sm font-medium shadow-sm justify-center lg:justify-start max-w-xs mx-auto lg:mx-0">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse-fast"></div>
                  <span>🏘️ Serving Barangay Teodora Alonzo</span>
                </div>
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-tight">
                  <span className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent animate-gradient">
                    Community
                  </span><br />
                  <span className="text-gray-800">Waste Hub</span>
                </h1>
                <p className="text-xl text-gray-600 max-w-full sm:max-w-2xl leading-relaxed mx-auto lg:mx-0">
                  The comprehensive community platform for waste management in Barangay Teodora Alonzo.&nbsp;
                  <span className="font-semibold text-emerald-700">Recycle for rewards</span>,&nbsp;
                  <span className="font-semibold text-red-600">report violations</span>, and&nbsp;
                  <span className="font-semibold text-blue-600">connect with your community</span> for a cleaner, sustainable future.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button className="w-full sm:w-auto group bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-8 sm:px-10 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 flex items-center justify-center gap-3">
                  <span>🚀</span> Join Our Community
                  <ArrowRight className="group-hover:translate-x-2 transition-transform duration-300" />
                </button>
                <button className="w-full sm:w-auto px-8 sm:px-10 py-4 bg-white/90 backdrop-blur-sm text-gray-700 rounded-2xl font-bold hover:bg-white transition-all duration-300 border-2 border-gray-200 hover:border-emerald-300 transform hover:scale-105 shadow-lg">
                  Explore Features
                </button>
              </div>

              {/* INSTALL BUTTON */}
              <InstallPWAButton />
            </div>

            {/* Enhanced Hero Illustration */}
            <div className="relative mx-auto max-w-md sm:max-w-none">
              <div className="relative z-10 bg-gradient-to-br from-emerald-400/20 via-green-400/15 to-teal-500/20 rounded-3xl p-6 sm:p-10 backdrop-blur-sm border border-white/30 shadow-2xl">
                <div className="aspect-square bg-white/90 backdrop-blur-sm rounded-3xl flex items-center justify-center relative overflow-hidden shadow-inner">
                  {/* Community Illustration */}
                  <div className="text-center space-y-4 relative z-10 px-4">
                    <div className="text-6xl sm:text-8xl mb-4">🏘️</div>
                    <div className="text-2xl sm:text-3xl font-bold text-emerald-700">ECOSORT</div>
                    <div className="text-emerald-600 font-medium text-sm sm:text-base">Community-Driven Solutions</div>
                  </div>

                  {/* Decorative elements (with responsive positioning tweaks) */}
                  <div className="absolute top-4 left-4 sm:left-8 text-3xl sm:text-4xl opacity-30 animate-bounce delay-300">♻️</div>
                  <div className="absolute bottom-4 right-4 sm:right-8 text-2xl sm:text-3xl opacity-40 animate-bounce delay-700">🌱</div>
                  <div className="absolute top-4 right-4 sm:right-10 text-xl sm:text-2xl opacity-25 animate-bounce delay-1000">⭐</div>
                </div>
              </div>

              {/* Floating Feature Cards with responsive positioning */}
              <div className="hidden sm:flex flex-col space-y-4 absolute -top-6 -right-6 sm:-top-8 sm:-right-8 bg-white rounded-2xl p-4 shadow-xl animate-float transform hover:scale-110 transition-transform cursor-pointer w-28">
                <CoinsIcon className="w-8 h-8 text-amber-500 mb-2" />
                <div className="text-sm font-bold text-amber-600">+75 Points</div>
                <div className="text-xs text-gray-500 truncate">Plastic bottles</div>
              </div>

              <div className="hidden sm:flex flex-col space-y-4 absolute -bottom-6 -left-6 sm:-bottom-8 sm:-left-8 bg-white rounded-2xl p-4 shadow-xl animate-float-reverse transform hover:scale-110 transition-transform cursor-pointer w-28">
                <ReportIcon className="w-8 h-8 text-red-500 mb-2" />
                <div className="text-sm font-bold text-red-600">Report Sent</div>
                <div className="text-xs text-gray-500 truncate">Issue #127</div>
              </div>

              <div className="hidden sm:flex flex-col space-y-4 absolute top-1/2 -left-8 sm:-left-10 -translate-y-1/2 bg-white rounded-2xl p-4 shadow-xl animate-float transform hover:scale-110 transition-transform cursor-pointer w-28">
                <CommunityIcon className="w-8 h-8 text-blue-500 mb-2" />
                <div className="text-sm font-bold text-blue-600">5 New</div>
                <div className="text-xs text-gray-500 truncate">Messages</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Platform Features Section */}
      <section className="relative z-10 py-24 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 px-4 sm:px-0">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-6">
              Complete Waste Management Solution
            </h2>
            <p className="text-lg sm:text-xl md:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              ECOSORT combines recycling rewards, community reporting, and social features to create a comprehensive platform for sustainable waste management in Barangay Teodora Alonzo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              const isActive = activeFeature === index;
              
              return (
                <div
                  key={index}
                  className={`relative p-6 sm:p-8 rounded-3xl transition-all duration-700 transform ${
                    isActive 
                      ? 'bg-white shadow-2xl scale-105 border-2 border-emerald-200' 
                      : 'bg-white/80 shadow-lg hover:shadow-xl hover:scale-102'
                  }`}
                >
                  <div className="text-center space-y-6">
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br ${feature.gradient} rounded-3xl flex items-center justify-center mx-auto transition-all duration-500 shadow-lg ${isActive ? 'scale-110 shadow-xl' : ''}`}>
                      <IconComponent className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    
                    <div className="space-y-3 px-2">
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-800">{feature.title}</h3>
                      <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{feature.description}</p>
                    </div>

                    <div className={`absolute -top-4 -right-4 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-white transition-all duration-300 shadow-lg ${
                      isActive ? 'bg-gradient-to-r from-emerald-500 to-green-500 scale-110' : 'bg-gray-400'
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

      {/* Enhanced Community Features Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 px-2 sm:px-0">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-6">
              Empowering Community Action
            </h2>
            <p className="text-lg sm:text-xl md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Beyond recycling rewards, ECOSORT strengthens community bonds through collaborative waste management solutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {communityFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              
              return (
                <div key={index} className="bg-white/90 rounded-3xl p-8 sm:p-10 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-100 via-green-200 to-teal-200 rounded-3xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <IconComponent className={`w-8 h-8 sm:w-10 sm:h-10 ${feature.color}`} />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-800">{feature.title}</h3>
                      <p className="text-gray-600 leading-relaxed text-base sm:text-lg">{feature.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Enhanced Benefits Section */}
      <section className="relative z-10 py-24 bg-white/50 backdrop-blur-sm px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 max-w-xl mx-auto lg:mx-0">
              <div className="space-y-6 px-2 sm:px-0">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800">
                  Why Choose ECOSORT?
                </h2>
                <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
                  Join hundreds of residents in Barangay Teodora Alonzo who are already making a difference through our comprehensive waste management platform.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-white/80 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="w-6 h-6 bg-gradient-to-br from-emerald-100 to-green-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                      <CheckIcon className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-gray-700 font-medium">{benefit}</span>
                  </div>
                ))}
              </div>

              <button className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105">
                🌟 Start Your Journey Today
              </button>
            </div>

            <div className="relative max-w-md sm:max-w-none mx-auto lg:mx-0">
              <div className="bg-gradient-to-br from-emerald-100 via-green-200 to-teal-200 rounded-3xl p-10 h-80 sm:h-96 flex items-center justify-center shadow-xl">
                <div className="text-center space-y-6 px-4">
                  <div className="text-7xl sm:text-8xl animate-pulse">🏘️</div>
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-700">United Community</div>
                  <div className="text-emerald-600 font-medium text-lg sm:text-xl">
                    Working together for a cleaner Barangay Teodora Alonzo
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Call to Action */}
      <section className="relative z-10 py-24 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/90 via-green-600/90 to-teal-600/90"></div>
        <div className="absolute inset-0 overflow-hidden hidden sm:block">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-xl animate-float"></div>
          <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-white/5 rounded-full blur-2xl animate-float-reverse"></div>
          <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white/8 rounded-full blur-lg animate-pulse"></div>
        </div>
        
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="space-y-8">
            <div className="text-5xl sm:text-6xl mb-6 animate-bounce">🚀</div>
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-8 leading-tight">
              Ready to Transform Your Community?
            </h2>
            <p className="text-lg sm:text-xl text-emerald-100 mb-10 max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
              Join ECOSORT today and be part of the solution. Recycle, report, and connect with your neighbors for a sustainable future in Barangay Teodora Alonzo.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center px-4 sm:px-0">
              <button className="bg-white text-emerald-600 w-full sm:w-auto px-12 py-5 rounded-2xl font-bold text-xl hover:bg-emerald-50 transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 shadow-2xl flex items-center justify-center gap-3">
                <span>🌟</span>
                Join the Community
              </button>
              <button className="border-3 border-white text-white w-full sm:w-auto px-12 py-5 rounded-2xl font-bold text-xl hover:bg-white hover:text-emerald-600 transition-all duration-300 transform hover:scale-105 shadow-xl">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="relative z-10 bg-gray-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 text-center md:text-left">
            <div className="space-y-4">
              <div className="flex items-center gap-4 justify-center md:justify-start">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                  E
                </div>
                <div>
                  <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                    ECOSORT
                  </span>
                  <p className="text-xs text-gray-400">Barangay Teodora Alonzo</p>
                </div>
              </div>
              <p className="text-gray-400 leading-relaxed px-4 md:px-0">
                Transforming Barangay Teodora Alonzo through comprehensive waste management and community engagement.
              </p>
              <div className="flex gap-2 justify-center md:justify-start text-2xl">
                <span>🌱</span>
                <span>♻️</span>
                <span>🏘️</span>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 text-emerald-400 text-lg">Platform Services</h4>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">♻️</span>
                  Recycling Rewards
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-400">⚠️</span>
                  Violation Reporting
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-400">💬</span>
                  Community Forums
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">📊</span>
                  Impact Tracking
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 text-emerald-400 text-lg">Collection Info</h4>
              <div className="space-y-3 text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400">📅</span>
                  <span>Every Thursday</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">🕐</span>
                  <span>8:00 AM - 12:00 PM</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">📍</span>
                  <span>Barangay Teodora Alonzo</span>
                </div>
                <div className="bg-emerald-800/30 p-3 rounded-lg mt-4">
                  <p className="text-sm text-emerald-200">Next collection in 3 days</p>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 text-emerald-400 text-lg">Get in Touch</h4>
              <div className="space-y-3 text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">📧</span>
                  <span className="text-sm">ecosort.talonzo@gmail.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">📱</span>
                  <span>0912 345 6789</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">🏢</span>
                  <span className="text-sm">Barangay Hall, T. Alonzo</span>
                </div>
                <div className="bg-blue-800/30 p-3 rounded-lg mt-4">
                  <p className="text-sm text-blue-200">24/7 Community Support</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-12 pt-8 text-center px-4">
            <span className="text-gray-400 text-sm block w-full">
              &copy; 2025 ECOSORT. Building a sustainable future for Barangay Teodora Alonzo.
            </span>
          </div>
         

        </div>
      </footer>

      {/* Enhanced CSS Animations */}
      <style>{`
         @keyframes float-random {
          0%, 100% { 
            transform: translateY(0px) translateX(0px) rotate(0deg); 
            opacity: 0.2;
          }
          25% { 
            transform: translateY(-15px) translateX(10px) rotate(90deg); 
            opacity: 0.3;
          }
          50% { 
            transform: translateY(-30px) translateX(-5px) rotate(180deg); 
            opacity: 0.15;
          }
          75% { 
            transform: translateY(-10px) translateX(-15px) rotate(270deg); 
            opacity: 0.25;
          }
        }
        .animate-float-random { 
          animation: float-random 12s ease-in-out infinite; 
        }
        .animate-gradient { 
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-25px) rotate(8deg); }
        }
        
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(25px) rotate(-8deg); }
        }
        
        @keyframes float-random {
          0%, 100% { 
            transform: translateY(0px) translateX(0px) rotate(0deg); 
            opacity: 0.2;
          }
          25% { 
            transform: translateY(-15px) translateX(10px) rotate(90deg); 
            opacity: 0.3;
          }
          50% { 
            transform: translateY(-30px) translateX(-5px) rotate(180deg); 
            opacity: 0.15;
          }
          75% { 
            transform: translateY(-10px) translateX(-15px) rotate(270deg); 
            opacity: 0.25;
          }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        
        @keyframes pulse-fast {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .animate-float { 
          animation: float 6s ease-in-out infinite; 
        }
        
        .animate-float-reverse { 
          animation: float-reverse 8s ease-in-out infinite; 
        }
        
        .animate-float-random { 
          animation: float-random 12s ease-in-out infinite; 
        }
        
        .animate-pulse-slow { 
          animation: pulse-slow 4s ease-in-out infinite; 
        }
        
        .animate-pulse-fast { 
          animation: pulse-fast 2s ease-in-out infinite; 
        }
        
        .animate-gradient { 
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        
        .hover\\:scale-102:hover { 
          transform: scale(1.02); 
        }
        
        .border-3 {
          border-width: 3px;
        }
        
        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #10b981, #059669);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #059669, #047857);
        }
      `}</style>
    </div>
  );
}
