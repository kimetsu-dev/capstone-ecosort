import React, { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext();

const translations = {
  en: {
    // --- Navigation & Menu ---
    "nav.home": "Home",
    "nav.submit": "Submit",
    "nav.rewards": "Rewards",
    "nav.forum": "Forum",
    "nav.leaderboard": "Leaderboard",
    "nav.transactions": "Transactions",
    "nav.ledger": "Public Ledger",
    "nav.ledger_short": "Ledger",
    "nav.logout": "Logout",

    // --- Greetings ---
    "greet.morning": "Good Morning",
    "greet.afternoon": "Good Afternoon",
    "greet.evening": "Good Evening",

    // --- Dashboard: Points & Rank ---
    "dash.points_title": "Your Eco Points",
    "dash.rank": "Your Rank",
    "dash.rank_view": "Click to view",
    "dash.top_recyclers": "Top Recyclers",
    "dash.you": "(You)",

    // --- Dashboard: Calendar & Schedules ---
    "dash.calendar": "Calendar",
    "dash.happening": "Happening Today!",
    "dash.coll_day": "Waste Collection Day",
    "dash.sub_center_open": "Submission Center Open",
    "dash.no_schedule": "No Schedule Available",
    "dash.contact_admin": "Contact your administrator to set up collection schedules",

    // --- Garbage Collection Card ---
    "card.coll_title": "Garbage Collection",
    "card.coll_sub": "Don't miss your garbage collection day",
    "card.coll_time": "Collection Time",
    "card.location": "Location",
    "card.today": "TODAY",

    // --- Submission Card ---
    "card.sub_title": "Recyclable Waste Submission",
    "card.sub_sub": "Drop off your recyclable and sorted waste",
    "card.op_hours": "Operating Hours",

    // --- Ledger / System Integrity Card ---
    "card.ledger_title": "System Integrity",
    "card.ledger_sub": "Verify all transactions on ledger.",
    "card.ledger_pwa_sub": "All data is auditable & transparent",
    "card.view_ledger": "View Public Ledger",

    // --- Recent Activity ---
    "dash.recent_act": "Recent Activity",
    "act.waste_sub": "Submitted waste",
    "act.redeemed": "Redeemed",
    "act.earned": "Earned points",

    // --- User Modal & Achievements ---
    "modal.loading": "Loading profile...",
    "modal.achievements": "Achievements",
    "modal.unlocked": "unlocked",
    "modal.pts_to_unlock": "points to unlock",
    "modal.msg_all": "🎉 All achievements unlocked! You're an eco champion!",
    "modal.msg_some": "Keep going! More achievements await!",
    "modal.msg_none": "Start your eco journey to unlock achievements!",
    
    // Achievement Titles (Static mapping)
    "ach.first_steps": "First Steps",
    "ach.first_steps_desc": "Earned your first 100 points",
    "ach.eco_advocate": "Eco Advocate",
    "ach.eco_advocate_desc": "Reached 500 points milestone",
    "ach.eco_hero": "Eco Hero",
    "ach.eco_hero_desc": "Achieved 1000 points!",
    "ach.green_champ": "Green Champion",
    "ach.green_champ_desc": "Outstanding 2000+ points",

    // --- Settings (Existing) ---
    "settings.title": "Settings",
    "settings.appearance": "Appearance & Display",
    "settings.theme": "Theme Mode",
    "settings.theme_sub": "Choose Light, Dark, or System",
    "settings.language": "Language",
    "settings.language_sub": "Select your preferred language",
    "settings.logout": "Sign Out",
    "opt.light": "Light",
    "opt.dark": "Dark",
    "opt.system": "System Default",
    "opt.english": "English",
    "opt.tagalog": "Filipino / Tagalog",
  },
  tl: {
    // --- Navigation & Menu ---
    "nav.home": "Tahanan",
    "nav.submit": "Magpasa",
    "nav.rewards": "Gantimpala",
    "nav.forum": "Forum",
    "nav.leaderboard": "Liderato",
    "nav.transactions": "Transaksyon",
    "nav.ledger": "Pampublikong Talaan",
    "nav.ledger_short": "Talaan",
    "nav.logout": "Mag-logout",

    // --- Greetings ---
    "greet.morning": "Magandang Umaga",
    "greet.afternoon": "Magandang Hapon",
    "greet.evening": "Magandang Gabi",

    // --- Dashboard: Points & Rank ---
    "dash.points_title": "Ang Iyong Eco Points",
    "dash.rank": "Ang Iyong Ranggo",
    "dash.rank_view": "Pindutin para makita",
    "dash.top_recyclers": "Nangungunang Recyclers",
    "dash.you": "(Ikaw)",

    // --- Dashboard: Calendar & Schedules ---
    "dash.calendar": "Kalendaryo",
    "dash.happening": "Nangyayari Ngayon!",
    "dash.coll_day": "Araw ng Koleksyon ng Basura",
    "dash.sub_center_open": "Bukas ang Submission Center",
    "dash.no_schedule": "Walang Naka-iskedyul",
    "dash.contact_admin": "Kontakin ang admin para sa iskedyul ng koleksyon",

    // --- Garbage Collection Card ---
    "card.coll_title": "Koleksyon ng Basura",
    "card.coll_sub": "Huwag palampasin ang araw ng koleksyon",
    "card.coll_time": "Oras ng Koleksyon",
    "card.location": "Lokasyon",
    "card.today": "NGAYON",

    // --- Submission Card ---
    "card.sub_title": "Pagpasa ng Recyclable",
    "card.sub_sub": "Dalhin dito ang iyong mga na-sort na basura",
    "card.op_hours": "Oras ng Operasyon",

    // --- Ledger / System Integrity Card ---
    "card.ledger_title": "Integridad ng Sistema",
    "card.ledger_sub": "I-verify ang lahat ng transaksyon sa ledger.",
    "card.ledger_pwa_sub": "Lahat ng datos ay auditable at transparent",
    "card.view_ledger": "Tingnan ang Talaan",

    // --- Recent Activity ---
    "dash.recent_act": "Kamakailang Aktibidad",
    "act.waste_sub": "Nagpasa ng basura",
    "act.redeemed": "Nag-claim",
    "act.earned": "Nakatanggap ng points",

    // --- User Modal & Achievements ---
    "modal.loading": "Naglo-load ng profile...",
    "modal.achievements": "Mga Tagumpay",
    "modal.unlocked": "bukas na",
    "modal.pts_to_unlock": "puntos para mabuksan",
    "modal.msg_all": "🎉 Lahat ng tagumpay ay nakuha na! Isa kang eco champion!",
    "modal.msg_some": "Tuloy lang! May mga tagumpay pang naghihintay!",
    "modal.msg_none": "Simulan ang iyong eco journey para makakuha ng achievements!",

    // Achievement Titles
    "ach.first_steps": "Unang Hakbang",
    "ach.first_steps_desc": "Nakuha ang unang 100 points",
    "ach.eco_advocate": "Tagapagtaguyod ng Kalikasan",
    "ach.eco_advocate_desc": "Umabot sa 500 points",
    "ach.eco_hero": "Bayani ng Kalikasan",
    "ach.eco_hero_desc": "Nakamit ang 1000 points!",
    "ach.green_champ": "Kampeon ng Kalikasan",
    "ach.green_champ_desc": "Kahanga-hangang 2000+ points",

    // --- Settings ---
    "settings.title": "Mga Setting",
    "settings.appearance": "Hitsura at Display",
    "settings.theme": "Tema",
    "settings.theme_sub": "Piliin ang Maliwanag, Madilim, o System",
    "settings.language": "Wika",
    "settings.language_sub": "Piliin ang iyong gustong wika",
    "settings.logout": "Mag-logout",
    "opt.light": "Maliwanag",
    "opt.dark": "Madilim",
    "opt.system": "Default ng System",
    "opt.english": "Ingles",
    "opt.tagalog": "Filipino / Tagalog",
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("appLanguage") || "en";
  });

  useEffect(() => {
    localStorage.setItem("appLanguage", language);
  }, [language]);

  const t = (key) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}