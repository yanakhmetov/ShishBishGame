"use client";

import React, { useState } from "react";
import { Menu, X, Flag, Coffee, LogOut, Timer, Loader2 } from "lucide-react";
import { useGame, PlayerPosition } from "@/context/GameContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAppContext } from "@/context/AppContext";
import Link from "next/link";

const InGameMenu = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams?.get("roomId");
  const [isOpen, setIsOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const { t } = useAppContext();
  const { isPaused, pauseTimeLeft, playerPauses, togglePause, surrender, gameStarted, connectedPlayers } = useGame();
  const { data: session } = useSession();

  const me = connectedPlayers.find(p => p.userId === (session?.user as any)?.id);
  const myPosition = me?.position || "top";

  const handleLeave = async () => {
    if (!roomId) {
      router.push("/dashboard");
      return;
    }

    try {
      setIsLeaving(true);
      const res = await fetch(`/api/rooms/${roomId}/leave`, { method: "POST" });
      if (res.ok) {
        // Notify others immediately so they don't have to wait for a refresh
        import("@/lib/socket").then(({ getSocket }) => {
          getSocket().emit("game-action", { roomId, action: "player-left", payload: {} });
        });
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error leaving room:", error);
      router.push("/dashboard"); // Exit anyway if server fails
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", top: "20px", right: "140px", zIndex: 2000 }}>


      <button
        onClick={() => setIsOpen(!isOpen)}
        className="toggle-btn"
        style={{ border: isOpen ? "1px solid white" : "1px solid var(--accent)" }}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div className="glass" style={{
          position: "absolute",
          top: "60px",
          right: "0",
          width: "220px",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          animation: "cardFadeIn 0.3s ease forwards"
        }}>
          <div style={{ padding: "0 0.5rem 0.5rem 0.5rem", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "10px", opacity: 0.5, textTransform: "uppercase" }}>{t("gameMenu")}</span>
          </div>

          <button
            className="btn-secondary"
            onClick={() => { togglePause(myPosition); setIsOpen(false); }}
            disabled={!gameStarted || (playerPauses[myPosition] <= 0 && !isPaused)}
            style={{
              justifyContent: "flex-start",
              gap: "12px",
              padding: "0.85rem 1.2rem",
              background: isPaused ? "rgba(74, 222, 128, 0.1)" : "rgba(255,255,255,0.02)",
              borderColor: isPaused ? "#4ade80" : "rgba(255,255,255,0.1)",
              color: isPaused ? "#4ade80" : "white",
              boxShadow: isPaused ? "0 0 20px rgba(74, 222, 128, 0.2)" : "none",
              position: "relative",
              overflow: "hidden",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            }}
          >
            {isPaused ? (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                <Timer size={18} className="animate-pulse" />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700" }}>{t("resume")} {pauseTimeLeft}s</span>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                <Coffee size={18} />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "12px", fontWeight: "600" }}>{t("takePause")}</span>
                  <span style={{ fontSize: "9px", opacity: 0.5 }}>{playerPauses[myPosition]} {t("chargesRemaining")}</span>
                </div>
              </div>
            )}
          </button>

          <button
            className="btn-secondary"
            onClick={() => { if (confirm(t("surrenderConfirm"))) surrender(myPosition); setIsOpen(false); }}
            disabled={!gameStarted}
            style={{ justifyContent: "flex-start", gap: "10px", padding: "0.75rem 1rem", color: "#f87171" }}
          >
            <Flag size={18} />
            <span style={{ fontSize: "12px" }}>{t("surrender")}</span>
          </button>

          <button
            className="btn-secondary"
            onClick={handleLeave}
            disabled={isLeaving}
            style={{ justifyContent: "flex-start", gap: "10px", padding: "0.75rem 1rem", width: "100%", opacity: isLeaving ? 0.7 : 1 }}
          >
            {isLeaving ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
            <span style={{ fontSize: "12px" }}>{isLeaving ? t("exiting") : t("exitToLobby")}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default InGameMenu;
