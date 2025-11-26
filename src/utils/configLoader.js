// utils/configLoader.js
// Shared configuration loading logic for all components

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// Minimal fallback configurations - admin creates actual categories
export const DEFAULT_SEVERITY_LEVELS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

// Load categories from Firebase with proper fallbacks
export const loadCategories = async (includeAll = true) => {
  try {
    const categoriesDoc = await getDoc(doc(db, "report_categories", "categories"));
    
    if (categoriesDoc.exists()) {
      const data = categoriesDoc.data();
      let categories = data.categories || [];
      
      // Ensure all categories have required fields
      categories = categories.map(cat => ({
        id: cat.id,
        label: cat.label,
        icon: cat.icon || "❓" // Add default icon if missing
      }));
      
      // Add 'all' category for filtering if needed and not already present
      if (includeAll && !categories.find(cat => cat.id === 'all')) {
        categories.unshift({ id: "all", label: "All Reports", icon: "📋" });
      }
      
      return categories;
    }
  } catch (error) {
    console.error("Error loading categories:", error);
  }
  
  // Return empty array or just 'all' category if admin hasn't created categories yet
  return includeAll ? [{ id: "all", label: "All Reports", icon: "📋" }] : [];
};

// Load severity levels from Firebase with proper fallbacks
export const loadSeverityLevels = async () => {
  try {
    const severityDoc = await getDoc(doc(db, "report_categories", "severity_levels"));
    
    if (severityDoc.exists()) {
      const data = severityDoc.data();
      return data.levels || DEFAULT_SEVERITY_LEVELS;
    }
  } catch (error) {
    console.error("Error loading severity levels:", error);
  }
  
  return DEFAULT_SEVERITY_LEVELS;
};

// Get categories for report form (exclude 'all')
export const getReportCategories = async () => {
  const categories = await loadCategories(false);
  return categories.filter(cat => cat.id !== 'all');
};

// Get categories for forum filtering (include 'all')
export const getForumCategories = async () => {
  return await loadCategories(true);
};

// Get categories for admin management (include 'all' but mark it as non-deletable)
export const getAdminCategories = async () => {
  const categories = await loadCategories(true);
  return categories.map(cat => ({
    ...cat,
    isDeletable: cat.id !== 'all'
  }));
};