"use client";

import { useAppContext } from "@/context/AppContext";
import { Moon, Sun, Languages } from "lucide-react";

export const ThemeLanguageToggle = () => {
  const { theme, toggleTheme, language, setLanguage } = useAppContext();

  return (
    <div className="nav-controls">
      <button 
        className="toggle-btn" 
        onClick={() => setLanguage(language === "en" ? "ru" : "en")}
        title={language === "en" ? "Switch to Russian" : "Переключить на русский"}
      >
        <span style={{ fontSize: "12px", fontWeight: "bold" }}>{language.toUpperCase()}</span>
      </button>

      <button 
        className="toggle-btn" 
        onClick={toggleTheme}
        title={theme === "dark" ? "Switch to Light Mode" : "Переключить на светлую тему"}
      >
        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </div>
  );
};
