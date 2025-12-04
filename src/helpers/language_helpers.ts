import type { i18n } from "i18next";

const languageLocalStorageKey = "lang";

export function setAppLanguage(lang: string, i18n: i18n) {
  localStorage.setItem(languageLocalStorageKey, lang);
  i18n.changeLanguage(lang);
  document.documentElement.lang = lang;

  // Sync language to main process for Discord webhook translations
  if (window.vrchatAPI && (lang === "en" || lang === "pl")) {
    window.vrchatAPI.setLanguage(lang).catch((err) => {
      console.error("Failed to sync language to main process:", err);
    });
  }
}

export function updateAppLanguage(i18n: i18n) {
  const localLang = localStorage.getItem(languageLocalStorageKey);
  if (!localLang) {
    return;
  }

  i18n.changeLanguage(localLang);
  document.documentElement.lang = localLang;

  // Sync language to main process
  if (window.vrchatAPI && (localLang === "en" || localLang === "pl")) {
    window.vrchatAPI.setLanguage(localLang).catch((err) => {
      console.error("Failed to sync language to main process:", err);
    });
  }
}
