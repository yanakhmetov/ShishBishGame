"use client";

import React from "react";
import { User, Check, Play } from "lucide-react";
import { useGame, PlayerPosition } from "@/context/GameContext";
import { useSession } from "next-auth/react";
import { useAppContext } from "@/context/AppContext";

const GameLobby = () => {
  const { t } = useAppContext();
  const { connectedPlayers, readyStatuses, toggleReady, countdown, gameStarted, activePlayers, playerCount, winner } = useGame();
  const { data: session } = useSession();

  // Find your current user position dynamically
  let myPosition: PlayerPosition | null = null;
  if (session?.user && (session.user as any).id) {
    const me = connectedPlayers.find(p => p.userId === (session.user as any).id);
    if (me) {
      myPosition = me.position;
    }
  }

  if ((gameStarted && !countdown) || winner) return null;

  return (
    <div className="glass" style={{ 
      marginTop: "1.5rem", 
      padding: "1.5rem", 
      display: "flex", 
      flexDirection: "column", 
      gap: "1.25rem",
      background: "rgba(255, 255, 255, 0.03)",
      border: "1px solid rgba(255, 255, 255, 0.05)"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: "36px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,255,255,0.7)", margin: 0 }}>
            {t("arenaLobby")}
        </h3>
        {countdown !== null && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "var(--accent)",
            color: "white",
            fontSize: "18px",
            fontWeight: "900",
            boxShadow: "0 0 15px var(--accent)",
            animation: "pulse 1s infinite"
          }}>
            {countdown}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
        {(["top", "bottom", "right", "left"] as PlayerPosition[]).slice(0, playerCount).map((pos) => {
          const cp = connectedPlayers.find(p => p.position === pos);
          const isReady = readyStatuses[pos];
          
          return (
            <div key={pos} style={{ textAlign: "center", position: "relative", minWidth: "80px" }}>
               <div style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  margin: "0 auto",
                  background: "rgba(255,255,255,0.03)",
                  border: `2px solid ${isReady ? "#4ade80" : cp ? "#60a5fa" : "rgba(255,255,255,0.1)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: isReady ? "0 0 15px #4ade8055" : "none",
                  position: "relative",
                  transition: "all 0.3s ease",
                  overflow: "hidden"
               }}>
                  {cp?.image ? (
                    <img src={cp.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${cp.avatarZoom ?? 1.0}) translate(${(cp.avatarX ?? 50) - 50}%, ${(cp.avatarY ?? 50) - 50}%)` }} />
                  ) : (
                    <User size={28} color={isReady ? "#4ade80" : cp ? "#60a5fa" : "rgba(255,255,255,0.2)"} />
                  )}
                  {isReady && <div style={{ position: "absolute", bottom: "2px", right: "2px", background: "#4ade80", borderRadius: "50%", padding: "2px", border: "2px solid #1a1a1a" }}><Check size={12} color="black" /></div>}
               </div>
               <div style={{ fontSize: "11px", marginTop: "8px", fontWeight: "600", color: cp ? "white" : "rgba(255,255,255,0.3)" }}>
                 {cp?.name || t("empty")}
               </div>
               {cp && (
                 <div style={{ fontSize: "9px", opacity: 0.5, marginTop: "2px" }}>
                   🏆 {cp.rating}
                 </div>
               )}
               <div style={{ 
                 fontSize: "10px", 
                 fontWeight: "bold", 
                 marginTop: "4px", 
                 color: isReady ? "#4ade80" : "rgba(255,255,255,0.4)" 
               }}>
                 {isReady ? t("ready") : cp ? t("waiting") : ""}
               </div>
            </div>
          );
        })}
      </div>

      {myPosition && (
        <button 
          onClick={() => toggleReady(myPosition)}
          disabled={gameStarted}
          className={`btn-primary ${readyStatuses[myPosition] ? "ready" : ""}`}
          style={{ 
            margin: 0, 
            width: "100%", 
            background: readyStatuses[myPosition] ? "#4ade8022" : "var(--accent)",
            borderColor: readyStatuses[myPosition] ? "#4ade80" : "var(--accent)",
            color: readyStatuses[myPosition] ? "#4ade80" : "black"
          }}
        >
          {readyStatuses[myPosition] ? (
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} /> {t("isReady")}</span>
          ) : (
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><Play size={16} fill="black" /> {t("imReady")}</span>
          )}
        </button>
      )}

      {!gameStarted && (
        <p style={{ fontSize: "11px", textAlign: "center", opacity: 0.5 }}>
            {t("waitForPlayers")}
        </p>
      )}
    </div>
  );
};

export default GameLobby;
