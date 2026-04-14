"use client";

import React, { useEffect, useState } from "react";
import GameBoard from "@/components/GameBoard";
import { Dice } from "@/components/Dice";
import GameChat from "@/components/GameChat";
import GameLobby from "@/components/GameLobby";
import InGameMenu from "@/components/InGameMenu";
import { useSearchParams, useRouter } from "next/navigation";
import { GameProvider, useGame } from "@/context/GameContext";
import { useSession } from "next-auth/react";

import PlayerProfileModal from "@/components/PlayerProfileModal";
import { ConnectedPlayer } from "@/context/GameContext";
import { useAppContext } from "@/context/AppContext";

function PlayPageContent() {
  const { t } = useAppContext();
  const { diceValue, isRolling, rollDice, currentTurn, players, history, gameStarted, setRoomData, setRoomId, isPaused, pauseTimeLeft, pausedBy, togglePause, connectedPlayers, gameStatus, winner, turnTimer } = useGame();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const roomId = searchParams?.get("roomId");
  const [isJoining, setIsJoining] = useState(true);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [roomData, setRoomDataLocal] = useState<any>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<ConnectedPlayer | null>(null);

  const me = connectedPlayers.find(p => p.userId === (session?.user as any)?.id);
  const myPosition = me?.position;
// ... (rest of component)

  const handleLeaveRoom = async () => {
    if (!roomId) return;
    try {
      // 1. Notify socket FIRST while connection is still alive
      const { getSocket } = await import("@/lib/socket");
      getSocket().emit("game-action", { roomId, action: "player-left", payload: {} });
      
      // 2. Perform DB leave
      await fetch(`/api/rooms/${roomId}/leave`, { method: "POST" });
      
      // 3. ONLY THEN redirect
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to leave:", err);
      router.push("/dashboard");
    }
  };

  useEffect(() => {
    if (roomId) {
      setRoomId(roomId);
    }
  }, [roomId, setRoomId]);

  useEffect(() => {
    const fetchRoomState = async (isInitial = false) => {
      if (!roomId) return;
      try {
        // Only POST on initial join, otherwise GET. Actually the route POST /join handles existing users correctly by just returning them.
        const suffix = isInitial ? "" : "?action=sync";
        const res = await fetch(`/api/rooms/${roomId}/join${suffix}`, { method: "POST" });

        if (res.ok) {
          const result = await res.json();
          setRoomDataLocal(result.room);

          if (isInitial) {
            import("@/lib/socket").then(({ getSocket }) => {
              getSocket().emit("game-action", { roomId, action: "player-joined", payload: {} });
            });
          }
        } else {
          const errorData = await res.json();
          setJoinError(errorData.error || t("failedJoinArena"));
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setJoinError(t("somethingWentWrong"));
      } finally {
        setIsJoining(false);
      }
    };

    fetchRoomState(true);
  }, [roomId]);

  // Sync with GameContext
  useEffect(() => {
    if (roomData) {
      setRoomData(roomData);
    }
  }, [roomData, setRoomData]);

  if (joinError) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(20px)" }}>
        <div className="glass" style={{ padding: "3rem", textAlign: "center", border: "1px solid rgba(248, 113, 113, 0.3)", boxShadow: "0 0 40px rgba(248, 113, 113, 0.1)" }}>
          <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "rgba(248, 113, 113, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
            <span style={{ fontSize: "40px" }}>🚫</span>
          </div>
          <h2 className="glow-text" style={{ color: "#f87171", marginBottom: "1rem" }}>{t("arenaUnavailable")}</h2>
          <p style={{ opacity: 0.7, marginBottom: "2rem", maxWidth: "300px" }}>
            {joinError === "Room is full"
              ? t("arenaFull")
              : joinError}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="btn-primary"
            style={{ width: "100%", background: "#f87171", borderColor: "#f87171", color: "white" }}
          >
            {t("backToDashboard")}
          </button>
        </div>
      </div>
    );
  }

  if (isJoining && roomId) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <h2 className="glow-text">{t("enteringArena")}</h2>
        <div className="loader" style={{ marginTop: "1rem" }}></div>
      </div>
    );
  }

  const isBtnDisabled = isRolling || !gameStarted || currentTurn !== myPosition || diceValue > 0 || gameStatus === "switching";

  return (
    <div className="container" style={{ padding: "1rem 2rem", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start" }}>
      <InGameMenu />
      <div style={{ textAlign: "center", marginBottom: "2rem", zIndex: 20 }}>
        <h1 className="glow-text" style={{ fontSize: "2.5rem", fontWeight: "900", textTransform: "uppercase", fontStyle: "italic", background: "linear-gradient(to right, #60a5fa, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>
          {roomData?.name || "Shish-Bish Arena"}
        </h1>
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "0.5rem", alignItems: "center" }}>
          {roomData?.shortId && (
            <span style={{ fontSize: "12px", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "4px", opacity: 0.7, border: "1px solid rgba(255,255,255,0.1)" }}>
              ID: #{roomData.shortId}
            </span>
          )}
          <p style={{ color: "rgba(156, 163, 175, 0.6)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em", margin: 0 }}>
            {t("turnLabel")}: <span style={{ color: players[currentTurn].color, fontWeight: "bold" }}>{players[currentTurn].name}</span>
            <span style={{ 
              marginLeft: "10px", 
              color: turnTimer <= 10 ? "#f87171" : "#60a5fa", 
              fontWeight: "900",
              background: "rgba(255,255,255,0.05)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "12px",
              fontFamily: "monospace",
              boxShadow: turnTimer <= 10 ? "0 0 10px rgba(248, 113, 113, 0.2)" : "none"
            }}>
              {String(turnTimer).padStart(2, '0')}s
            </span>
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", justifyContent: "center", gap: "2.5rem", width: "100%", maxWidth: "1600px", flexWrap: "nowrap" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem", padding: "2rem", background: "rgba(255, 255, 255, 0.02)", borderRadius: "32px", border: "1px solid rgba(255, 255, 255, 0.05)", backdropFilter: "blur(10px)", boxShadow: "0 20px 50px rgba(0,0,0,0.2)", width: "300px", minWidth: "300px", maxWidth: "300px", flexShrink: 0 }}>
          <div><Dice value={diceValue} rolling={isRolling} size={80} /></div>
          {/* ... existing roll section ... */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
            {isPaused ? (
              <button
                onClick={() => { if (myPosition === pausedBy) togglePause(myPosition) }}
                className={myPosition === pausedBy ? "btn-action-primary glow-pulse" : "btn-secondary"}
                style={{ 
                  width: "100%", 
                  height: "70px",
                  margin: 0,
                  opacity: myPosition === pausedBy ? 1 : 0.7,
                  cursor: myPosition === pausedBy ? "pointer" : "wait",
                  background: myPosition === pausedBy 
                    ? "rgba(74, 222, 128, 0.15)" 
                    : "rgba(248, 113, 113, 0.1)",
                  borderColor: myPosition === pausedBy ? "#4ade80" : "#f87171",
                  color: myPosition === pausedBy ? "#4ade80" : "#f87171",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "2px",
                  boxShadow: myPosition === pausedBy 
                    ? "0 0 30px rgba(74, 222, 128, 0.2)" 
                    : "0 0 30px rgba(248, 113, 113, 0.15)",
                  pointerEvents: myPosition === pausedBy ? "auto" : "none"
                }}
              >
                <span style={{ fontSize: "18px", fontWeight: "900", letterSpacing: "2px" }}>
                  {myPosition === pausedBy ? `${t("resume")} ${pauseTimeLeft}s` : `${t("pausedText")} ${pauseTimeLeft}s`}
                </span>
              </button>
            ) : (
              <button
                onClick={() => rollDice()}
                disabled={isBtnDisabled}
                className="btn-action-primary"
                style={{
                  width: "100%",
                  height: "70px",
                  margin: 0,
                  boxShadow: `0 0 20px ${players[currentTurn].color}33`,
                  borderColor: players[currentTurn].color,
                  opacity: isBtnDisabled ? 0.5 : 1,
                  cursor: isBtnDisabled ? "not-allowed" : "pointer"
                }}
              >
                {!gameStarted ? t("waitingLabel") : isRolling ? t("rolling") : (currentTurn === myPosition ? t("rollDiceBtn") : `${t("waitingFor")} ${players[currentTurn].name}...`)}
              </button>
            )}
            <div className="glass no-scrollbar" style={{ padding: "1rem", fontSize: "0.8rem", height: "135px", overflowY: "auto" }}>
              <h4 style={{ fontSize: "10px", opacity: 0.5, marginBottom: "0.5rem", textTransform: "uppercase" }}>{t("diceLog")}</h4>
              {history.map((h, i) => {
                const parts = h.split(" ");
                const lastPart = parts[parts.length - 1];
                const isRoll = !isNaN(Number(lastPart)) && parts.length > 1;
                
                return (
                  <div key={i} style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    marginBottom: "6px", 
                    opacity: i === 0 ? 1 : 0.6,
                    fontSize: "11px",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                    paddingBottom: "4px"
                  }}>
                    <span style={{ fontWeight: i === 0 ? "700" : "400" }}>
                      {isRoll ? parts.slice(0, -1).join(" ") : h}
                    </span>
                    {isRoll && (
                      <span style={{ 
                        color: "var(--accent)", 
                        fontWeight: "900",
                        background: "rgba(255,255,255,0.05)",
                        padding: "0 6px",
                        borderRadius: "4px"
                      }}>
                        {lastPart}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <GameLobby />
          </div>
        </div>
        <div style={{ position: "relative", transition: "transform 0.3s ease", display: "flex", justifyContent: "center" }}>
          <div className="glass" style={{ padding: "0.5rem", width: "fit-content", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
             <GameBoard onProfileClick={(p) => setSelectedPlayer(p)} />
          </div>
          
          {winner && (
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(12px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              borderRadius: "24px",
              border: "2px solid rgba(255,215,0,0.3)",
              boxShadow: "0 0 100px rgba(255,215,0,0.1) inset"
            }}>
               <div style={{ fontSize: "80px", marginBottom: "1.5rem" }}>🏆</div>
               <h2 className="glow-text" style={{ fontSize: "3rem", marginBottom: "0.5rem", color: "#fbbf24" }}>{t("victory")}</h2>
               <p style={{ fontSize: "1.25rem", color: "white", marginBottom: "3rem", opacity: 0.9 }}>
                  <span style={{ color: players[winner].color, fontWeight: "bold" }}>{players[winner].name}</span> {t("conqueredArena")}
               </p>
               <button 
                 onClick={handleLeaveRoom}
                 className="btn-primary"
                 style={{ 
                    padding: "1rem 3rem", 
                    fontSize: "1.25rem", 
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)"
                 }}
               >
                 {t("leaveArenaBtn")}
               </button>
            </div>
          )}
        </div>
        <div style={{ minWidth: "320px", alignSelf: "stretch" }}>
          <GameChat />
        </div>
      </div>

      {selectedPlayer && (
        <PlayerProfileModal 
          player={selectedPlayer} 
          onClose={() => setSelectedPlayer(null)} 
        />
      )}
    </div>
  );
}

export default function PlayPage() {
  return (
    <GameProvider playerCount={4}>
      <PlayPageContent />
    </GameProvider>
  );
}
