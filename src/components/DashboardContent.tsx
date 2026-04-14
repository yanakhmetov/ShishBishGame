"use client";

import React, { useState } from "react";
import { Trophy, Swords, Medal, User as UserIcon, Play, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { useAppContext } from "@/context/AppContext";
import GameRooms from "@/components/GameRooms";

interface DashboardContentProps {
  user: any;
}

export const DashboardContent = ({ user }: DashboardContentProps) => {
  const { t } = useAppContext();
  const router = useRouter();
  const [activeRoom, setActiveRoom] = useState(user.roomsJoined?.[0]?.room || null);
  const [isLeaving, setIsLeaving] = useState(false);

  // Sync active room status on mount (to handle browser "back" navigation)
  React.useEffect(() => {
    const syncActiveRoom = async () => {
      try {
        const res = await fetch("/api/user/active-session");
        if (res.ok) {
          const data = await res.json();
          // Only update if it's different from initial prop to avoid unnecessary re-renders
          if (JSON.stringify(data.room) !== JSON.stringify(activeRoom)) {
            setActiveRoom(data.room);
          }
        }
      } catch (err) {
        console.error("Failed to sync active session:", err);
      }
    };
    syncActiveRoom();
  }, []);

  const handleLeaveRoom = async () => {
    if (!activeRoom) return;
    setIsLeaving(true);
    try {
      const res = await fetch(`/api/rooms/${activeRoom.id}/leave`, { method: "POST" });
      if (res.ok) {
        // Notify others
        import("@/lib/socket").then(({ getSocket }) => {
          getSocket().emit("game-action", { roomId: activeRoom.id, action: "player-left", payload: {} });
        });
        setActiveRoom(null);
      }
    } catch (error) {
      console.error("Failed to leave room:", error);
    } finally {
      setIsLeaving(false);
    }
  };

  const stats = [
    { label: t("rating"), value: user.rating, icon: <Trophy size={20} color="var(--accent)" /> },
    { label: t("wins"), value: user.wins, icon: <Medal size={20} color="#4ade80" /> },
    { label: t("losses"), value: user.losses, icon: <Swords size={20} color="#f87171" /> },
  ];

  return (
    <div style={{ minHeight: "100vh", padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div className="glass" style={{ width: "60px", height: "60px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--accent)", overflow: "hidden" }}>
            {user.image ? (
              <img src={user.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${user.avatarZoom ?? 1.0}) translate(${(user.avatarX ?? 50) - 50}%, ${(user.avatarY ?? 50) - 50}%)` }} />
            ) : (
              <UserIcon size={30} color="var(--accent)" />
            )}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h2 className="glow-text">{user.name}</h2>
              <Link href="/profile" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", textDecoration: "none", color: "var(--accent)", border: "1px solid rgba(255,255,255,0.1)", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
                {t("settings")}
              </Link>
            </div>
            <p style={{ opacity: 0.6, fontSize: "0.9rem" }}>{t("masterOfBoard")}</p>
          </div>
        </div>
        <SignOutButton />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
        {/* Stats Section */}
        <div className="glass" style={{ padding: "2rem" }}>
          <h3 style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Trophy size={20} /> {t("statistics")}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {stats.map((s) => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {s.icon}
                  <span>{s.label}</span>
                </div>
                <span style={{ fontWeight: "700", fontSize: "1.2rem" }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements Section */}
        <div className="glass" style={{ padding: "2rem" }}>
          <h3 style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Medal size={20} /> {t("achievements")}
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {[
              { id: "centurion", title: t("centurionTitle"), desc: t("centurionDesc"), current: user.gamesPlayed || 0, target: 100, icon: <Users size={24} /> },
              { id: "victor", title: t("victorTitle"), desc: t("victorDesc"), current: user.wins || 0, target: 10, icon: <Trophy size={24} /> },
              { id: "veteran", title: t("veteranTitle"), desc: t("veteranDesc"), current: user.gamesPlayed || 0, target: 10, icon: <Medal size={24} /> },
            ].map((ach) => {
              const progress = Math.min(100, (ach.current / ach.target) * 100);
              const isEarned = ach.current >= ach.target;
              
              return (
                <div key={ach.id} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div className="glass" style={{ 
                    width: "50px", 
                    height: "50px", 
                    borderRadius: "12px", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    flexShrink: 0,
                    filter: isEarned ? "none" : "grayscale(1) opacity(0.5)",
                    background: isEarned ? "rgba(96, 165, 250, 0.1)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isEarned ? "var(--accent)" : "rgba(255,255,255,0.05)"}`,
                    color: isEarned ? "var(--accent)" : "white",
                    transition: "all 0.4s ease"
                  }}>
                    {ach.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                       <span style={{ fontSize: "14px", fontWeight: "700", opacity: isEarned ? 1 : 0.7 }}>{ach.title}</span>
                       <span style={{ fontSize: "11px", opacity: 0.5 }}>{ach.current} / {ach.target}</span>
                    </div>
                    <div style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                       <div style={{ 
                         width: `${progress}%`, 
                         height: "100%", 
                         background: isEarned ? "var(--accent)" : "linear-gradient(90deg, #60a5fa33, #60a5fa)", 
                         boxShadow: isEarned ? "0 0 10px var(--accent)" : "none",
                         transition: "width 1s ease-out" 
                       }} />
                    </div>
                    <div style={{ fontSize: "10px", opacity: 0.4, marginTop: "4px" }}>{ach.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Game Rooms Section OR Active Session */}
      {activeRoom ? (
        <div className="glass" style={{ marginTop: "2rem", padding: "3rem", textAlign: "center", border: "1px solid var(--accent)", boxShadow: "0 0 30px rgba(96, 165, 250, 0.1)" }}>
          <div style={{ width: "70px", height: "70px", borderRadius: "50%", background: "rgba(96, 165, 250, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
             <Swords size={36} color="var(--accent)" />
          </div>
          <h3 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "0.5rem" }}>{t("activeBattle")}</h3>
          <p style={{ opacity: 0.6, marginBottom: "2rem" }}>{t("alreadyInArena")} <strong>{activeRoom.name}</strong>. {t("completeOrLeave")}</p>
          
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", maxWidth: "500px", margin: "0 auto" }}>
            <button 
              onClick={handleLeaveRoom}
              disabled={isLeaving}
              className="btn-secondary" 
              style={{ flex: 1, margin: 0, height: "48px", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {isLeaving ? t("leaving") : t("leaveArena")}
            </button>
            <Link href={`/play?roomId=${activeRoom.id}`} style={{ flex: 1 }}>
              <button 
                className="btn-primary" 
                style={{ width: "100%", margin: 0, height: "48px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                <Play size={18} fill="black" /> {t("rejoinGame")}
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <GameRooms user={user} />
      )}

      {/* Quick Start (Optional footer) */}
      <div style={{ marginTop: "3rem", padding: "1rem", textAlign: "center", opacity: 0.5, fontSize: "12px" }}>
        {t("dashboardFooter") || "Select a room to start playing Shish-Bish Arena"}
      </div>
    </div>
  );
};
