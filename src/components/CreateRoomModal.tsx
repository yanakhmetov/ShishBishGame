import React, { useState, useEffect } from "react";
import { X, Users, Trophy, Lock, Globe, ShieldCheck } from "lucide-react";
import { createPortal } from "react-dom";
import { useAppContext } from "@/context/AppContext";

interface CreateRoomModalProps {
  userRating: number;
  onClose: () => void;
  onCreate: (roomData: any) => void;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ userRating, onClose, onCreate }) => {
  const [mounted, setMounted] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [playerCount, setPlayerCount] = useState(4);
  const [minRating, setMinRating] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [globalScale, setGlobalScale] = useState(1);
  
  useEffect(() => {
    setMounted(true);
    
    // Scaling logic
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
    
    return () => {
      setMounted(false);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const { t } = useAppContext();
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roomName || `Arena #${Math.floor(Math.random() * 9000) + 1000}`,
          maxPlayers: playerCount,
          minRating,
          type: isPrivate ? "private" : "public",
          password: isPrivate ? password : null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create room");
      }
      
      const room = await response.json();
      onCreate(room);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error creating room. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0, 0, 0, 0.8)",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "20px",
      overflow: "hidden"
    }}>
      {/* Scaler Wrapper */}
      <div style={{
        width: "1600px",
        height: "950px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${globalScale})`,
        transformOrigin: "center center",
        pointerEvents: "none",
        flexShrink: 0
      }}>
        <div 
          className="glass" 
          style={{
            width: "100%",
            maxWidth: "500px",
            padding: "2.5rem",
            position: "relative",
            animation: "modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            pointerEvents: "auto",
            margin: "20px"
          }}
        >
          <button 
            onClick={onClose}
            style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", color: "white", cursor: "pointer", opacity: 0.5 }}
          >
            <X size={24} />
          </button>

          <h2 className="glow-text" style={{ fontSize: "1.75rem", marginBottom: "2rem", textAlign: "center" }}>
            {t("createArena")}
          </h2>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Room Name */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "12px", opacity: 0.6, textTransform: "uppercase", letterSpacing: "1px" }}>{t("roomName")}</label>
              <input 
                type="text" 
                placeholder={t("enterRoomName")}
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="glass"
                style={{ padding: "0.8rem 1rem", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {/* Player Count */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "12px", opacity: 0.6, textTransform: "uppercase", letterSpacing: "1px" }}>{t("players")}</label>
                <div style={{ display: "flex", gap: "5px" }}>
                  {[2, 3, 4].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPlayerCount(num)}
                      style={{
                        flex: 1,
                        padding: "0.6rem",
                        borderRadius: "8px",
                        background: playerCount === num ? "var(--accent)" : "rgba(255,255,255,0.05)",
                        color: playerCount === num ? "black" : "white",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: "bold",
                        transition: "all 0.2s"
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Min Rating Slider */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "12px", opacity: 0.6, textTransform: "uppercase", letterSpacing: "1px" }}>{t("minRating")}</label>
                  <span style={{ fontSize: "14px", fontWeight: "800", color: "var(--accent)" }}>{minRating}</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max={userRating}
                  step="50"
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="rating-slider"
                  style={{ marginTop: "10px" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", opacity: 0.4 }}>
                  <span>0</span>
                  <span>Max: {userRating}</span>
                </div>
              </div>
            </div>

            {/* Privacy Toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "12px" }}>
               <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {isPrivate ? <Lock size={20} color="var(--accent)" /> : <Globe size={20} color="#60a5fa" />}
                  <div>
                     <div style={{ fontSize: "14px", fontWeight: "700" }}>{isPrivate ? t("privateRoom") : t("publicRoom")}</div>
                     <div style={{ fontSize: "11px", opacity: 0.5 }}>{isPrivate ? t("accessViaPassword") : t("anyoneCanJoin")}</div>
                  </div>
               </div>
               <button 
                 type="button"
                 onClick={() => setIsPrivate(!isPrivate)}
                 style={{
                   width: "44px",
                   height: "22px",
                   borderRadius: "11px",
                   background: isPrivate ? "var(--accent)" : "rgba(255,255,255,0.1)",
                   position: "relative",
                   border: "none",
                   cursor: "pointer",
                   transition: "background 0.3s"
                 }}
               >
                 <div style={{
                   width: "18px",
                   height: "18px",
                   borderRadius: "50%",
                   background: "white",
                   position: "absolute",
                   top: "2px",
                   left: isPrivate ? "24px" : "2px",
                   transition: "left 0.3s"
                 }} />
               </button>
            </div>

            {isPrivate && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", animation: "modalPop 0.3s ease-out" }}>
                <label style={{ fontSize: "12px", opacity: 0.6, textTransform: "uppercase", letterSpacing: "1px" }}>{t("roomPassword")}</label>
                <input 
                  type="password" 
                  placeholder={t("enterPasswordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass"
                  style={{ padding: "0.8rem 1rem", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white" }}
                />
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isCreating}
              style={{ marginTop: "1rem", height: "50px", fontSize: "16px", opacity: isCreating ? 0.7 : 1 }}
            >
              {isCreating ? t("creatingArena") : t("createArenaAndPlay")}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateRoomModal;
