import React, { useEffect, useState } from "react";
import { Users, Lock, ChevronRight, Globe, Plus, Loader2, Search, RotateCw, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import CreateRoomModal from "./CreateRoomModal";

const GameRooms = ({ user }: { user: any }) => {
  const { t } = useAppContext();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [passwordRoom, setPasswordRoom] = useState<any | null>(null);
  const [enteredPassword, setEnteredPassword] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const fetchRooms = async (search?: string) => {
    try {
      if (search === undefined) setIsLoading(true);
      const url = new URL("/api/rooms", window.location.origin);
      if (search) url.searchParams.set("search", search);
      
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms(searchQuery);
  }, [searchQuery]);

  const handleJoinClick = (room: any) => {
    if (room.type === "private") {
      setPasswordRoom(room);
      setEnteredPassword("");
      setJoinError("");
    } else {
      router.push(`/play?roomId=${room.id}`);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordRoom) return;
    
    setIsJoining(true);
    setJoinError("");
    
    try {
      const res = await fetch(`/api/rooms/${passwordRoom.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: enteredPassword })
      });
      
      if (res.ok) {
        router.push(`/play?roomId=${passwordRoom.id}`);
      } else {
        const data = await res.json();
        setJoinError(data.error || t("incorrectPassword"));
      }
    } catch (err) {
      setJoinError(t("errorJoining"));
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="glass" style={{ marginTop: "2rem", padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "1.25rem" }}>
          <Users size={24} color="var(--accent)" />
          {t("activeRooms")}
        </h3>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", opacity: 0.4 }} />
            <input 
              type="text"
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass"
              style={{ 
                padding: "0.5rem 1rem 0.5rem 2.25rem", 
                fontSize: "12px", 
                width: "200px",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "white"
              }}
            />
          </div>
          <button 
            className="btn-secondary" 
            onClick={() => fetchRooms(searchQuery)}
            disabled={isLoading}
            style={{ fontSize: "12px", padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <RotateCw size={16} className={isLoading ? "animate-spin" : ""} /> {t("refresh")}
          </button>
          <button 
            className="btn-secondary" 
            onClick={() => setIsModalOpen(true)}
            style={{ fontSize: "12px", padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Plus size={16} /> {t("createRoom")}
          </button>
        </div>
      </div>

      {isModalOpen && (
        <CreateRoomModal 
          userRating={user.rating || 1200}
          onClose={() => setIsModalOpen(false)} 
          onCreate={(data: any) => {
            setIsModalOpen(false);
            router.push(`/play?roomId=${data.id}`);
          }} 
        />
      )}

      {isLoading && rooms.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", opacity: 0.5 }}>
          <Loader2 className="animate-spin" size={32} />
          <p style={{ marginTop: "1rem" }}>{t("searchingArenas")}</p>
        </div>
      ) : rooms.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", opacity: 0.5 }}>
          <p>{t("noRoomsFound")}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
          {rooms.map((room) => {
            const playersCount = room._count?.players || 0;
            const isFull = playersCount >= room.maxPlayers;
            const isRatingTooLow = user.rating < (room.minRating || 0);
            const canJoin = !isFull && !isRatingTooLow;
            
            return (
              <div key={room.id} className="glass" style={{ 
                padding: "1.5rem", 
                background: !canJoin ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)",
                opacity: !canJoin ? 0.6 : 1,
                position: "relative",
                transition: "transform 0.3s ease",
                cursor: !canJoin ? "default" : "pointer"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div>
                    <h4 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "8px" }}>
                      {room.name}
                      <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", opacity: 0.6, fontWeight: "normal" }}>
                        #{room.shortId}
                      </span>
                    </h4>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "11px", opacity: 0.6 }}>
                      {room.type === "private" ? <Lock size={12} /> : <Globe size={12} />}
                      <span>{room.type.toUpperCase()}</span>
                      <span>•</span>
                      <span>🏆 {room.minRating}+</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                      <div style={{ 
                        width: "24px", 
                        height: "24px", 
                        borderRadius: "50%", 
                        overflow: "hidden", 
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(255,255,255,0.05)",
                        flexShrink: 0
                      }}>
                        {room.host.image ? (
                          <img 
                            src={room.host.image} 
                            alt="" 
                            style={{ 
                              width: "100%", 
                              height: "100%", 
                              objectFit: "cover", 
                              transform: `scale(${room.host.avatarZoom ?? 1.0}) translate(${(room.host.avatarX ?? 50) - 50}%, ${(room.host.avatarY ?? 50) - 50}%)`
                            }} 
                          />
                        ) : (
                          <Users size={12} style={{ margin: "6px", opacity: 0.3 }} />
                        )}
                      </div>
                      <span style={{ fontSize: "10px", opacity: 0.4 }}>{room.host.name}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: isFull ? "var(--accent)" : "#4ade80" }}>
                      {playersCount}/{room.maxPlayers}
                    </div>
                    <div style={{ fontSize: "9px", opacity: 0.5, textTransform: "uppercase" }}>{t("players")}</div>
                  </div>
                </div>

                {isFull ? (
                  <div style={{ fontSize: "12px", textAlign: "center", padding: "0.5rem", background: "rgba(255,255,255,0.05)", borderRadius: "8px", color: "rgba(255,255,255,0.4)" }}>
                    {t("arenaFull")}
                  </div>
                ) : isRatingTooLow ? (
                  <div style={{ fontSize: "12px", textAlign: "center", padding: "0.5rem", background: "rgba(248,113,113,0.1)", borderRadius: "8px", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
                    {t("ratingTooLow")}
                  </div>
                ) : room.type === "private" ? (
                  <button 
                    onClick={() => handleJoinClick(room)}
                    className="btn-secondary" 
                    style={{ width: "100%", fontSize: "12px", gap: "8px" }}
                  >
                    <Lock size={14} /> {t("enterPassword")}
                  </button>
                ) : (
                  <button 
                    onClick={() => handleJoinClick(room)}
                    className="btn-primary" 
                    style={{ width: "100%", fontSize: "12px", height: "36px", margin: 0 }}
                  >
                    {t("joinArena")} <ChevronRight size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Password Modal */}
      {passwordRoom && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          padding: "20px"
        }}>
          <div className="glass" style={{
            width: "100%",
            maxWidth: "400px",
            padding: "2.5rem",
            position: "relative",
            animation: "modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
          }}>
            <button 
              onClick={() => setPasswordRoom(null)}
              style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", color: "white", cursor: "pointer", opacity: 0.5 }}
            >
              <X size={24} />
            </button>

            <h2 className="glow-text" style={{ fontSize: "1.5rem", marginBottom: "1rem", textAlign: "center" }}>
              {t("privateArena")}
            </h2>
            <p style={{ textAlign: "center", fontSize: "14px", opacity: 0.6, marginBottom: "2rem" }}>
              {t("enterPasswordForRoom") || t("enterPasswordFor")} <strong>{passwordRoom.name}</strong>
            </p>

            <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <input 
                  type="password" 
                  autoFocus
                  placeholder={t("password")}
                  value={enteredPassword}
                  onChange={(e) => setEnteredPassword(e.target.value)}
                  className="glass"
                  style={{ padding: "0.8rem 1rem", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white", textAlign: "center", fontSize: "18px", letterSpacing: "4px" }}
                />
                {joinError && <div style={{ color: "#f87171", fontSize: "12px", textAlign: "center", marginTop: "4px" }}>{joinError}</div>}
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                disabled={isJoining}
                style={{ height: "48px", fontSize: "16px" }}
              >
                {isJoining ? t("joining") : t("confirmJoin")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRooms;
