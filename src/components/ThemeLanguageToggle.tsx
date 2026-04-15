"use client";

import { useAppContext } from "@/context/AppContext";
import { Moon, Sun, Maximize, Minimize } from "lucide-react";
import { useState, useEffect } from "react";

export const ThemeLanguageToggle = () => {
  const { theme, toggleTheme, language, setLanguage, t } = useAppContext();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="nav-controls">
      <button 
        className="toggle-btn" 
        onClick={() => setLanguage(language === "en" ? "ru" : "en")}
        title={language === "en" ? t("switchToRussian") : t("switchToEnglish")}
      >
        <span style={{ fontSize: "12px", fontWeight: "bold" }}>{language.toUpperCase()}</span>
      </button>

      <button 
        className="toggle-btn" 
        onClick={toggleTheme}
        title={theme === "dark" ? t("switchToLight") : t("switchToDark")}
      >
        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <button 
        className="toggle-btn" 
        onClick={toggleFullscreen}
        title={isFullscreen ? t("exitFullscreen") : t("enterFullscreen")}
      >
        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
      </button>
    </div>
  );
};
