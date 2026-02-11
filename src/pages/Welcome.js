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

const DownloadIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const CloseIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const InfoIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Installation Instructions Modal
function InstallInstructionsModal({ isOpen, onClose }) {
  const { isDark } = useTheme();
  const [selectedOS, setSelectedOS] = useState('auto');

  useEffect(() => {
    const detectOS = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
      if (/android/.test(userAgent)) return 'android';
      if (/windows/.test(userAgent)) return 'windows';
      if (/mac/.test(userAgent)) return 'mac';
      return 'windows';
    };
    
    if (selectedOS === 'auto') {
      setSelectedOS(detectOS());
    }
  }, [selectedOS]);

  if (!isOpen) return null;

  const instructions = {
    android: {
      browser: 'Chrome',
      steps: [
        'Open ECOSORT in Chrome browser',
        'Tap the menu (three dots) in the top right corner',
        'Select "Add to Home screen" or "Install app"',
        'Tap "Add" or "Install" to confirm',
        'The app will be added to your home screen',
        'Open ECOSORT from your home screen to use it like a native app'
      ],
      note: 'For other Android browsers like Firefox or Samsung Internet, look for "Add to Home screen" in the browser menu.'
    },
    ios: {
      browser: 'Safari',
      steps: [
        'Open ECOSORT in Safari browser',
        'Tap the Share button (square with arrow pointing up) at the bottom',
        'Scroll down and tap "Add to Home Screen"',
        'Edit the name if desired, then tap "Add"',
        'The app icon will appear on your home screen',
        'Open ECOSORT from your home screen for the full app experience'
      ],
      note: 'Installation only works in Safari on iOS. Other browsers like Chrome will not show the install option.'
    },
    windows: {
      browser: 'Chrome / Edge',
      steps: [
        'Open ECOSORT in Chrome or Edge browser',
        'Look for the install icon (⊕ or computer icon) in the address bar',
        'Click the install icon or go to menu → "Install ECOSORT"',
        'Click "Install" in the popup dialog',
        'The app will open in its own window',
        'Access ECOSORT from your Start Menu or Desktop shortcut'
      ],
      note: 'The installed app works offline and provides push notifications for waste collection schedules.'
    },
    mac: {
      browser: 'Chrome / Safari',
      steps: [
        'Open ECOSORT in Chrome or Safari',
        'In Chrome: Click the install icon in the address bar',
        'In Safari: Go to File → "Add to Dock"',
        'Click "Install" to confirm',
        'The app will appear in your Applications folder',
        'Open ECOSORT from your Dock or Applications for quick access'
      ],
      note: 'Safari support may vary. Chrome provides the most reliable installation experience on macOS.'
    }
  };

  const currentInstructions = instructions[selectedOS] || instructions.windows;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className={`relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
          isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 px-6 py-4 border-b ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <DownloadIcon className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold">Install ECOSORT</h2>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* OS Selector */}
          <div>
            <label className={`block text-sm font-semibold mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Select Your Operating System
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'android', label: '🤖 Android', icon: '📱' },
                { id: 'ios', label: '🍎 iOS', icon: '📱' },
                { id: 'windows', label: '🪟 Windows', icon: '💻' },
                { id: 'mac', label: '🍎 macOS', icon: '💻' }
              ].map((os) => (
                <button
                  key={os.id}
                  onClick={() => setSelectedOS(os.id)}
                  className={`p-3 rounded-xl font-medium transition-all ${
                    selectedOS === os.id
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                      : isDark
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <div className="text-2xl mb-1">{os.icon}</div>
                  <div className="text-xs">{os.label.replace(/[🤖🍎🪟]/g, '')}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className={`p-5 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-4">
              <InfoIcon className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-lg">Browser: {currentInstructions.browser}</h3>
            </div>
            
            <ol className="space-y-3">
              {currentInstructions.steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </span>
                  <span className={`flex-1 pt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {step}
                  </span>
                </li>
              ))}
            </ol>

            {currentInstructions.note && (
              <div className={`mt-4 p-3 rounded-lg border ${
                isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
              }`}>
                <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                  <strong>Note:</strong> {currentInstructions.note}
                </p>
              </div>
            )}
          </div>

          {/* Benefits */}
          <div className={`p-5 rounded-xl ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
            <h3 className="font-bold mb-3 text-emerald-600 dark:text-emerald-400">
              Benefits of Installing
            </h3>
            <ul className="space-y-2">
              {[
                'Works offline - access features without internet',
                'Faster loading times and smoother performance',
                'Push notifications for waste collection schedules',
                'Takes up less space than a regular app',
                'Quick access from your home screen or desktop'
              ].map((benefit, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Troubleshooting */}
          <div className={`p-4 rounded-xl border ${
            isDark ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <h4 className="font-bold mb-2 text-sm">Troubleshooting</h4>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              If you don't see the install option, try: (1) Make sure you're using the recommended browser, 
              (2) Check if you're already running the app in standalone mode, (3) Try refreshing the page, 
              (4) Ensure you're using HTTPS connection.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`sticky bottom-0 px-6 py-4 border-t ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

// PWA Install Component
function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = window.navigator.standalone === true;
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkInstalled();

    // Listen for install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    // Listen for successful installation
    const installedHandler = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // For iOS or browsers that don't support beforeinstallprompt
      setShowInstructions(true);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      
      setDeferredPrompt(null);
      setIsVisible(false);
    } catch (error) {
      console.error('Install prompt error:', error);
      setShowInstructions(true);
    }
  };

  const handleShowInstructions = () => {
    setShowInstructions(true);
  };

  // Don't show if already installed
  if (isInstalled) return null;

  // Always show the install prompt prominently
  return (
    <>
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-green-500/10 backdrop-blur-xl border border-emerald-200/30 dark:border-emerald-700/30 rounded-3xl p-4 sm:p-6 mt-6 sm:mt-8 max-w-md mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/50 via-teal-50/50 to-green-50/50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-green-900/20"></div>
        <div className="relative text-center space-y-3 sm:space-y-4">
          <div className="flex items-center justify-center gap-2 mb-2 sm:mb-3">
            <SparkleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-emerald-800 dark:text-emerald-300 text-sm sm:text-base">Install ECOSORT App</span>
            <SparkleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed px-2">
            Get the full experience! Install ECOSORT on your device for offline access, faster performance, and notifications.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={handleInstallClick}
              className="flex-1 px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl sm:rounded-2xl font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 text-xs sm:text-sm flex items-center justify-center gap-2"
            >
              <DownloadIcon className="w-4 h-4" />
              Install Now
            </button>
            <button
              onClick={handleShowInstructions}
              className="px-4 sm:px-6 py-2 sm:py-2.5 bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-300 rounded-xl sm:rounded-2xl font-medium hover:shadow-md transition-all duration-200 text-xs sm:text-sm border border-emerald-200 dark:border-emerald-600"
            >
              How to Install
            </button>
          </div>
        </div>
      </div>

      <InstallInstructionsModal 
        isOpen={showInstructions} 
        onClose={() => setShowInstructions(false)} 
      />
    </>
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
                    ? 'text-white border-white/30 hover:bg-white/10' 
                    : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-12 sm:pt-16 lg:pt-24 pb-8 sm:pb-12 lg:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 mb-4 sm:mb-6">
              <SparkleIcon className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Sustainable Waste Management Platform
              </span>
            </div>

            <h1 className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-4 sm:mb-6 lg:mb-8 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Transform Your Waste
              <br />
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 bg-clip-text text-transparent">
                Into Rewards
              </span>
            </h1>

            <p className={`text-base sm:text-lg lg:text-xl max-w-3xl mx-auto mb-6 sm:mb-8 lg:mb-10 leading-relaxed px-4 ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Join ECOSORT and earn points for every recyclable item you properly segregate. 
              Redeem rewards, report violations, and connect with your community for a cleaner, 
              sustainable future.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
              <button
                onClick={() => navigate('/signup')}
                className="group w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200 flex items-center justify-center gap-2"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Install PWA Button - Now prominently displayed */}
          <InstallPWAButton />
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-12 sm:py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-black mb-3 sm:mb-4 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Everything You Need for
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"> Sustainable Living</span>
            </h2>
            <p className={`text-sm sm:text-base lg:text-lg max-w-2xl mx-auto ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Comprehensive tools to manage waste, earn rewards, and make a positive environmental impact
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-8 transition-all duration-500 hover:scale-102 ${
                    isDark 
                      ? 'bg-white/5 hover:bg-white/10 border border-white/10' 
                      : 'bg-white hover:bg-gray-50 border border-gray-100 shadow-lg hover:shadow-xl'
                  } ${activeFeature === index ? 'ring-2 ring-emerald-500' : ''}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                  
                  <div className="relative">
                    <div className={`w-12 h-12 sm:w-16 sm:h-16 mb-4 sm:mb-6 rounded-xl sm:rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}>
                      <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>

                    <h3 className={`text-lg sm:text-xl font-bold mb-2 sm:mb-3 ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {feature.title}
                    </h3>

                    <p className={`text-xs sm:text-sm leading-relaxed ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 py-12 sm:py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 ${
            isDark 
              ? 'bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-700/30' 
              : 'bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100'
          }`}>
            <div className="text-center mb-6 sm:mb-8">
              <h2 className={`text-2xl sm:text-3xl font-black mb-3 sm:mb-4 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Why Choose ECOSORT?
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl ${
                    isDark ? 'bg-white/5' : 'bg-white/70'
                  }`}
                >
                  <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                    <CheckIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <span className={`text-sm sm:text-base ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {benefit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`relative z-10 py-12 sm:py-16 lg:py-20 ${
        isDark 
          ? 'bg-gradient-to-br from-emerald-900 via-teal-900 to-green-900' 
          : 'bg-gradient-to-br from-emerald-600 via-teal-600 to-green-600'
      }`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-6 sm:mb-8">
            <CoinsIcon className="w-16 h-16 sm:w-20 sm:h-20 mx-auto text-white opacity-90 mb-4 sm:mb-6" />
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-3 sm:mb-4">
              Ready to Make a Difference?
            </h2>
            <p className={`text-sm sm:text-base lg:text-lg max-w-2xl mx-auto ${
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