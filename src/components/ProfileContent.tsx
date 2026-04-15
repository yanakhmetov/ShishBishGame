"use client";

import React, { useState } from "react";
import { User as UserIcon, Camera, ChevronLeft, Save, Loader2, Link as LinkIcon, Medal, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { ThemeLanguageToggle } from "./ThemeLanguageToggle";

interface ProfileContentProps {
  user: any;
}

export const ProfileContent = ({ user }: ProfileContentProps) => {
  const { t } = useAppContext();
  const router = useRouter();
  const [name, setName] = useState(user.name || "");
  const [image, setImage] = useState(user.image || "");
  const [avatarX, setAvatarX] = useState(user.avatarX ?? 50);
  const [avatarY, setAvatarY] = useState(user.avatarY ?? 50);
  const [avatarZoom, setAvatarZoom] = useState(user.avatarZoom ?? 1.0);
  const [featuredMap, setFeaturedMap] = useState<Record<string, boolean>>(
    Object.fromEntries(user.achievements?.map((ua: any) => [ua.achievementId, ua.isFeatured]) || [])
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [globalScale, setGlobalScale] = useState(1);

  // Scaling logic
  React.useEffect(() => {
    const handleResize = () => {
      const targetWidth = 1600; 
      const targetHeight = 950;
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

  const toggleFeatured = async (achievementId: string) => {
    const isCurrentlyFeatured = featuredMap[achievementId];
    const newValue = !isCurrentlyFeatured;
    
    // Check limit on client side too
    const currentCount = Object.values(featuredMap).filter(v => v).length;
    if (newValue && currentCount >= 3) {
      alert("You can only feature up to 3 achievements");
      return;
    }

    try {
      const res = await fetch("/api/user/achievements/featured", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ achievementId, isFeatured: newValue })
      });
      if (res.ok) {
        setFeaturedMap(prev => ({ ...prev, [achievementId]: newValue }));
      } else {
        const err = await res.json();
        alert(err.error || "Error updating achievement");
      }
    } catch (e) {
      alert("Failed to update achievement");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, image, avatarX, avatarY, avatarZoom }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Profile updated successfully!" });
        router.refresh();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

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
      {/* Background Dim Backdrop */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(20px)",
        pointerEvents: "none"
      }} />

      {/* Main Scaled Block */}
      <div 
        style={{ 
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "1600px",
          height: "950px",
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center",
          transform: `translate(-50%, -50%) scale(${globalScale})`,
          transformOrigin: "center center",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          flexShrink: 0,
          padding: "2rem"
        }}
      >
        <ThemeLanguageToggle />
        
        <div 
          className="glass no-scrollbar" 
          style={{ 
            padding: "3rem", 
            borderRadius: "32px", 
            position: "relative", 
            overflowY: "auto", 
            width: "100%", 
            maxWidth: "800px",
            maxHeight: "90%",
            background: "rgba(15, 15, 15, 0.8)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
          }}
        >
          {/* Background Glow */}
          <div style={{ position: "absolute", top: "-100px", right: "-100px", width: "300px", height: "300px", background: "var(--accent)", borderRadius: "50%", filter: "blur(120px)", opacity: 0.1, pointerEvents: "none" }} />

          {/* Close Button */}
          <button 
            onClick={() => router.push("/dashboard")}
            style={{ 
              position: "absolute", 
              top: "24px", 
              right: "24px", 
              background: "rgba(255,255,255,0.05)", 
              border: "1px solid rgba(255,255,255,0.1)", 
              color: "white", 
              width: "40px", 
              height: "40px", 
              borderRadius: "50%", 
              cursor: "pointer", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              transition: "all 0.3s ease",
              zIndex: 10
            }}
            className="hover-scale"
          >
            <X size={20} />
          </button>

          <h1 className="glow-text" style={{ fontSize: "2.5rem", marginBottom: "3rem", textAlign: "center" }}>{t("personalCabinet")}</h1>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            {/* Avatar Preview */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
              <div className="glass" style={{ 
                width: "140px", 
                height: "140px", 
                borderRadius: "50%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                border: "3px solid var(--accent)",
                boxShadow: "0 0 30px rgba(96, 165, 250, 0.2)",
                overflow: "hidden",
                background: "rgba(255,255,255,0.02)"
              }}>
                {image ? (
                  <img src={image} alt="Avatar" style={{ 
                      width: "100%", 
                      height: "100%", 
                      objectFit: "cover", 
                      transform: `scale(${avatarZoom}) translate(${avatarX - 50}%, ${avatarY - 50}%)`,
                      transition: "transform 0.1s ease-out"
                  }} />
                ) : (
                  <UserIcon size={64} style={{ opacity: 0.2 }} />
                )}
              </div>
              <p style={{ fontSize: "0.9rem", opacity: 0.5 }}>{t("avatarPreview")}</p>

              {/* Focus Controls */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", maxWidth: "300px", marginTop: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", opacity: 0.6 }}>
                      <span>{t("horizontalFocus")}</span>
                      <span>{avatarX}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" value={avatarX} 
                      onChange={(e) => setAvatarX(parseInt(e.target.value))}
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", opacity: 0.6 }}>
                      <span>{t("verticalFocus")}</span>
                      <span>{avatarY}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" value={avatarY} 
                      onChange={(e) => setAvatarY(parseInt(e.target.value))}
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", opacity: 0.6 }}>
                      <span>{t("scaleZoom")}</span>
                      <span>{avatarZoom.toFixed(1)}x</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="3.0" step="0.1" value={avatarZoom} 
                      onChange={(e) => setAvatarZoom(parseFloat(e.target.value))}
                      style={{ width: "100%" }}
                    />
                  </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
              {/* Nickname Input */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <label style={{ fontSize: "12px", opacity: 0.6, textTransform: "uppercase", letterSpacing: "1.5px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <UserIcon size={14} /> {t("nickname")}
                </label>
                <input 
                  type="text"
                  placeholder={t("nicknamePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass"
                  style={{ padding: "1rem 1.5rem", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: "1rem" }}
                />
              </div>

              {/* Avatar URL Input */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <label style={{ fontSize: "12px", opacity: 0.6, textTransform: "uppercase", letterSpacing: "1.5px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <LinkIcon size={14} /> {t("avatarUrl")}
                </label>
                <input 
                  type="url"
                  placeholder={t("avatarUrlPlaceholder")}
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="glass"
                  style={{ padding: "1rem 1.5rem", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: "1rem" }}
                />
              </div>
            </div>

            {/* Featured Achievements Selection */}
            <div style={{ padding: "1.5rem", background: "rgba(255,255,255,0.02)", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <h3 style={{ fontSize: "1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "10px" }}>
                <Medal size={20} color="var(--accent)" /> {t("showcaseAchievements")}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                {user.achievements?.length > 0 ? (
                  user.achievements.map((ua: any) => {
                    const isFeatured = featuredMap[ua.achievementId];
                    
                    return (
                      <div 
                        key={ua.achievementId}
                        onClick={() => toggleFeatured(ua.achievementId)}
                        style={{ 
                          padding: "10px 15px", 
                          borderRadius: "12px", 
                          background: isFeatured ? "rgba(96, 165, 250, 0.15)" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${isFeatured ? "var(--accent)" : "rgba(255,255,255,0.1)"}`,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          boxShadow: isFeatured ? "0 0 15px rgba(96, 165, 250, 0.2)" : "none"
                        }}
                      >
                          <Medal size={16} color={isFeatured ? "var(--accent)" : "rgba(255,255,255,0.3)"} />
                          <span style={{ fontSize: "12px", color: isFeatured ? "white" : "rgba(255,255,255,0.6)" }}>{ua.achievement.title}</span>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ fontSize: "12px", opacity: 0.4, padding: "20px", textAlign: "center", width: "100%", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "16px" }}>
                    {t("noMilestones")}
                  </div>
                )}
              </div>
              <p style={{ fontSize: "11px", opacity: 0.3, marginTop: "1rem", textAlign: "center" }}>
                {t("visibleToOthers")}
              </p>
            </div>

            {message && (
              <div style={{ 
                padding: "1rem", 
                borderRadius: "12px", 
                background: message.type === "success" ? "rgba(74, 222, 128, 0.1)" : "rgba(248, 113, 113, 0.1)",
                border: `1px solid ${message.type === "success" ? "#4ade80" : "#f87171"}`,
                color: message.type === "success" ? "#4ade80" : "#f87171",
                fontSize: "14px",
                animation: "modalPop 0.3s ease-out"
              }}>
                {message.text}
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isUpdating}
              style={{ 
                height: "60px", 
                width: "100%",
                fontSize: "1.1rem", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                gap: "12px",
                marginTop: "1rem"
              }}
            >
              {isUpdating ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Save size={20} />
              )}
              {isUpdating ? t("savingChanges") : t("saveProfile")}
            </button>
          </form>

          <div style={{ marginTop: "4rem", paddingTop: "2rem", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h4 style={{ fontSize: "14px", marginBottom: "4px" }}>{t("email")}</h4>
              <p style={{ fontSize: "12px", opacity: 0.4 }}>{user.email}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <h4 style={{ fontSize: "14px", marginBottom: "4px" }}>{t("accountId")}</h4>
              <p style={{ fontSize: "12px", opacity: 0.4 }}>#{user.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
