import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext"; // IMPORT

import { FiArrowLeft, FiSettings, FiLogOut, FiGlobe } from "react-icons/fi"; // Added FiGlobe
import { FaPalette } from "react-icons/fa";

import { auth } from "../firebase";
import { signOut } from "firebase/auth";

export default function AdminSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage(); // USE HOOK

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleBackNavigation = () => {
    const currentPath = location.pathname;
    if (currentPath === "/adminsettings") {
      navigate("/adminprofile");
    } else {
      navigate(-1);
    }
  };

  const settingsSections = [
    {
      id: "appearance",
      title: t("settings.appearance"),
      icon: FaPalette,
      items: [
        {
          id: "theme",
          title: t("settings.theme"),
          subtitle: t("settings.theme_sub"),
          type: "select",
          value: theme,
          options: [
            { label: t("opt.light"), value: "light" },
            { label: t("opt.dark"), value: "dark" },
            { label: t("opt.system"), value: "system" },
          ],
          onChange: (val) => setTheme(val),
          color: "from-purple-500 to-indigo-600",
          icon: FiSettings,
        },
      ],
    },
    // NEW LANGUAGE SECTION
    {
      id: "language",
      title: t("settings.language"),
      icon: FiGlobe,
      items: [
        {
          id: "lang_select",
          title: t("settings.language"),
          subtitle: t("settings.language_sub"),
          type: "select",
          value: language,
          options: [
            { label: t("opt.english"), value: "en" },
            { label: t("opt.tagalog"), value: "tl" },
          ],
          onChange: (val) => setLanguage(val),
          color: "from-blue-500 to-cyan-600",
          icon: FiGlobe,
        },
      ],
    },
  ];

  return (
    <div
      className={`min-h-screen transition-all duration-500 ${
        theme === "dark"
          ? "bg-gradient-to-br from-slate-900 via-gray-900 to-emerald-900"
          : "bg-gradient-to-br from-gray-50 via-white to-emerald-50"
      } relative overflow-hidden`}
    >
      <div className="relative z-10 px-4 sm:px-6 py-6 sm:py-8 max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-10 animate-slide-down">
          <button
            onClick={handleBackNavigation}
            className={`p-3 sm:p-4 rounded-2xl transition-all duration-300 group flex items-center justify-center ${
              theme === "dark"
                ? "bg-white/10 hover:bg-white/20 border border-white/10 text-gray-300 hover:text-white"
                : "bg-black/10 hover:bg-black/20 border border-black/10 text-gray-700 hover:text-black"
            }`}
          >
            <FiArrowLeft className="text-xl sm:text-2xl transition-transform group-hover:-translate-x-1" />
          </button>

          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/25">
              <FiSettings className="text-white text-2xl sm:text-3xl animate-spin-slow" />
            </div>
            <h1
              className={`text-xl sm:text-3xl font-extrabold ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              {t("settings.title")}
            </h1>
          </div>
        </header>

        {/* Sections */}
        <div className="space-y-10">
          {settingsSections.map((section, idx) => {
            const SectionIcon = section.icon || FiSettings;
            return (
              <div
                key={section.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${idx * 150}ms` }}
              >
                <div
                  className={`${
                    theme === "dark"
                      ? "bg-white/5 border-white/10"
                      : "bg-white/80 border-black/10"
                  } backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-xl border relative`}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <SectionIcon className="text-white text-xl sm:text-2xl" />
                    </div>
                    <h2
                      className={`text-lg sm:text-xl font-bold ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {section.title}
                    </h2>
                  </div>

                  <div className="space-y-5">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon || FiSettings;
                      return (
                        <div
                          key={item.id}
                          className={`p-4 sm:p-5 ${
                            theme === "dark"
                              ? "bg-white/5 hover:bg-white/10 border-white/10"
                              : "bg-white/50 hover:bg-white/80 border-black/10"
                          } rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] group`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div
                                className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r ${item.color} rounded-xl flex items-center justify-center shadow-md`}
                              >
                                <ItemIcon className="text-white text-lg sm:text-xl" />
                              </div>
                              <div>
                                <h3
                                  className={`font-semibold ${
                                    theme === "dark"
                                      ? "text-white"
                                      : "text-gray-900"
                                  }`}
                                >
                                  {item.title}
                                </h3>
                                <p
                                  className={`text-sm ${
                                    theme === "dark"
                                      ? "text-gray-400"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {item.subtitle}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center sm:ml-4">
                              {item.type === "select" && (
                                <select
                                  value={item.value}
                                  onChange={(e) => item.onChange(e.target.value)}
                                  className={`ml-0 sm:ml-2 p-2 rounded-lg border text-sm sm:text-base ${
                                    theme === "dark"
                                      ? "bg-gray-800 border-gray-600 text-white"
                                      : "bg-white border-gray-300 text-gray-900"
                                  }`}
                                >
                                  {item.options.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Logout */}
        <div className="mt-10 animate-fade-in">
          <button
            onClick={handleLogout}
            className="w-full py-4 sm:py-5 bg-gradient-to-r from-red-500 to-pink-600 rounded-3xl shadow-2xl text-white font-bold text-lg sm:text-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
          >
            <FiLogOut className="text-2xl sm:text-3xl" />
            <span>{t("settings.logout")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}