"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Swords } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { ThemeLanguageToggle } from "@/components/ThemeLanguageToggle";

export default function LandingPage() {
  const { t } = useAppContext();
  const [globalScale, setGlobalScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const targetWidth = 1200; 
      const targetHeight = 800;
      const vw = window.innerWidth - 40;
      const vh = window.innerHeight - 40;
      const widthScale = vw / targetWidth;
      const heightScale = vh / targetHeight;
      const scale = Math.min(1, widthScale, heightScale);
      setGlobalScale(scale);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div style={{ 
      width: "100vw", 
      height: "100vh", 
      overflow: "hidden", 
      position: "fixed",
      top: 0,
      left: 0,
      background: "var(--background)",
      zIndex: 100
    }}>
      <div 
        style={{ 
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "1200px",
          height: "800px",
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center",
          transform: `translate(-50%, -50%) scale(${globalScale})`,
          transformOrigin: "center center",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          flexShrink: 0
        }}
      >
        <ThemeLanguageToggle />
        <div style={{ textAlign: "center" }}>
          <div style={{ marginBottom: "2rem" }}>
            <Swords size={80} color="var(--accent)" style={{ marginBottom: "1rem" }} />
            <h1 className="glow-text" style={{ fontSize: "4rem", marginBottom: "0.5rem" }}>{t("title")}</h1>
            <p style={{ fontSize: "1.2rem", opacity: 0.7, maxWidth: "600px", margin: "0 auto" }}>
              {t("subtitle")}
            </p>
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <Link href="/login" className="btn-primary" style={{ padding: "15px 40px", fontSize: "1.1rem" }}>
              {t("signIn")}
            </Link>
            <Link href="/register" className="btn-secondary" style={{ padding: "15px 40px", fontSize: "1.1rem" }}>
              {t("register")}
            </Link>
          </div>

          <div style={{ marginTop: "4rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2rem", maxWidth: "900px", margin: "4rem auto 0" }}>
            <div className="glass" style={{ padding: "1.5rem" }}>
              <h4 style={{ color: "var(--accent)", marginBottom: "0.5rem" }}>{t("realTime")}</h4>
              <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>{t("realTimeDesc")}</p>
            </div>
            <div className="glass" style={{ padding: "1.5rem" }}>
              <h4 style={{ color: "var(--accent)", marginBottom: "0.5rem" }}>{t("rankings")}</h4>
              <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>{t("rankingsDesc")}</p>
            </div>
            <div className="glass" style={{ padding: "1.5rem" }}>
              <h4 style={{ color: "var(--accent)", marginBottom: "0.5rem" }}>{t("achievements")}</h4>
              <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>{t("achievementsDesc")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
