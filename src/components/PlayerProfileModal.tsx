import React, { useState } from "react";
import { X, Trophy, Swords, Medal, Target, User as UserIcon } from "lucide-react";
import { createPortal } from "react-dom";
import { ConnectedPlayer } from "@/context/GameContext";
import { useAppContext } from "@/context/AppContext";

interface PlayerProfileModalProps {
  player: ConnectedPlayer;
  onClose: () => void;
}

const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({ player, onClose }) => {
  const { t } = useAppContext();
  const [isZoomed, setIsZoomed] = useState(false);
  const [scale, setScale] = useState(1);
  const [globalScale, setGlobalScale] = useState(1);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
    // Scaling logic matching dashboard/create modal
    const handleResize = () => {
      const targetWidth = 1600; 
      const targetHeight = 950;
      const vw = window.innerWidth - 40;
      const vh = window.innerHeight - 40;
      const widthScale = vw / targetWidth;
      const heightScale = vh / targetHeight;
      const scaleValue = Math.min(1, widthScale, heightScale);
      setGlobalScale(scaleValue);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      setMounted(false);
      window.removeEventListener("resize", handleResize);
    }
  }, []);
  
  const stats = [
    { label: t("currentRating"), value: player.rating, icon: <Trophy size={20} color="var(--accent)" /> },
    { label: t("totalWins"), value: player.wins, icon: <Medal size={20} color="#4ade80" /> },
    { label: t("totalLosses"), value: player.losses, icon: <Swords size={20} color="#f87171" /> },
    { label: t("gamesPlayed"), value: player.gamesPlayed, icon: <Target size={20} color="#60a5fa" /> },
  ];

  const winRate = player.gamesPlayed > 0 
    ? Math.round((player.wins / player.gamesPlayed) * 100) 
    : 0;

  if (!mounted) return null;

  const modalContent = (
    <>
      <div style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
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
            className="glass no-scrollbar" 
            style={{
              width: "100%",
              maxWidth: "450px",
              height: "calc(100% - 20px)",
              padding: "3rem",
              position: "relative",
              borderRadius: "32px",
              animation: "modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
              border: "1px solid rgba(255,255,255,0.1)",
              pointerEvents: "auto",
              margin: "10px",
              overflowY: "auto"
            }}
          >
          {/* Close Button */}
          <button 
            onClick={onClose}
            style={{ position: "absolute", top: "24px", right: "24px", background: "none", border: "none", color: "white", cursor: "pointer", opacity: 0.5 }}
          >
            <X size={24} />
          </button>

          {/* User Large Avatar */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", marginBottom: "3rem" }}>
             <div 
               onClick={() => player.image && setIsZoomed(true)}
               title="Click to zoom"
               className="glass" 
               style={{ 
                 width: "120px", 
                 height: "120px", 
                 borderRadius: "50%", 
                 display: "flex", 
                 alignItems: "center", 
                 justifyContent: "center",
                 border: `3px solid var(--accent)`,
                 boxShadow: `0 0 40px rgba(96, 165, 250, 0.2)`,
                 overflow: "hidden",
                 cursor: player.image ? "zoom-in" : "default"
               }}>
               {player.image ? (
                 <img src={player.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${player.avatarZoom ?? 1.0}) translate(${(player.avatarX ?? 50) - 50}%, ${(player.avatarY ?? 50) - 50}%)` }} />
               ) : (
                 <UserIcon size={48} color="var(--accent)" />
               )}
             </div>
             <div style={{ textAlign: "center" }}>
               <h2 className="glow-text" style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>{player.name}</h2>
             </div>
          </div>

          {/* Stat Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
            {stats.map((s) => (
              <div key={s.label} className="glass" style={{ padding: "1.25rem", background: "rgba(255,255,255,0.02)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  {s.icon}
                  <span style={{ fontSize: "10px", opacity: 0.5, textTransform: "uppercase" }}>{s.label}</span>
                </div>
                <div style={{ fontSize: "1.25rem", fontWeight: "800" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Win Rate Progress Bar */}
          {/* Showcase Achievements */}
          {player.featuredAchievements && player.featuredAchievements.length > 0 && (
            <div style={{ marginTop: "2rem", paddingTop: "2rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
               <h4 style={{ fontSize: "11px", opacity: 0.5, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "1rem", textAlign: "center" }}>
                 {t("featuredShowcase")}
               </h4>
               <div style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
                  {player.featuredAchievements.map((title) => (
                    <div key={title} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                      <div className="achievement-badge" title={title} style={{ 
                        width: "65px", 
                        height: "65px", 
                        borderRadius: "50%", 
                        background: "rgba(96, 165, 250, 0.1)", 
                        border: "1px solid rgba(96, 165, 250, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        overflow: "hidden",
                        boxShadow: "0 0 25px rgba(96, 165, 250, 0.2)"
                      }}>
                        <div className="shimmer-effect" />
                        <Medal size={30} color="var(--accent)" style={{ position: "relative", zIndex: 1 }} />
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: "700", opacity: 0.8, maxWidth: "70px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {title}
                      </span>
                    </div>
                  ))}
               </div>

               <style>{`
                 @keyframes badgeShimmer {
                   0% { transform: translateX(-150%) skewX(-25deg); }
                   100% { transform: translateX(150%) skewX(-25deg); }
                 }
                 .achievement-badge {
                   transition: all 0.3s ease;
                 }
                 .achievement-badge:hover {
                   transform: translateY(-5px) scale(1.1);
                   border-color: var(--accent);
                   box-shadow: 0 0 30px rgba(96, 165, 250, 0.4);
                 }
                 .shimmer-effect {
                   position: absolute;
                   top: 0; left: 0; width: 100%; height: 100%;
                   background: linear-gradient(
                     90deg,
                     transparent,
                     rgba(255, 255, 255, 0.1),
                     rgba(255, 255, 255, 0.2),
                     rgba(255, 255, 255, 0.1),
                     transparent
                   );
                   animation: badgeShimmer 3s infinite linear;
                 }
               `}</style>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Zoom Overlay */}
      {isZoomed && player.image && (
        <div 
          onWheel={(e) => {
            const delta = e.deltaY * -0.001; // Scroll direction
            const newScale = Math.min(Math.max(0.5, scale + delta), 5);
            setScale(newScale);
          }}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.92)",
            backdropFilter: "blur(50px)",
            zIndex: 11000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            animation: "modalPop 0.3s ease-out",
            cursor: "zoom-out"
          }}
          onClick={() => setIsZoomed(false)}
        >
           <button 
             onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}
             style={{ position: "absolute", top: "40px", right: "40px", background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: "50px", height: "50px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
           >
             <X size={30} />
           </button>

           <div style={{ 
             display: "flex", 
             flexDirection: "column",
             alignItems: "center", 
             gap: "2rem",
             pointerEvents: "none"
           }}>
             <div style={{ 
               overflow: "hidden",
               borderRadius: "24px",
               boxShadow: "0 0 100px rgba(0,0,0,0.8)",
               transform: `scale(${scale})`,
               transition: "transform 0.1s ease-out"
             }}>
               <img 
                 src={player.image} 
                 alt="Zoomed" 
                 style={{ 
                   maxWidth: "80vh", 
                   maxHeight: "80vh", 
                   display: "block",
                   objectFit: "cover",
                   transform: `scale(${player.avatarZoom ?? 1.0}) translate(${(player.avatarX ?? 50) - 50}%, ${(player.avatarY ?? 50) - 50}%)`,
                 }} 
               />
             </div>
             
             <div style={{ textAlign: "center", animation: "modalPop 0.5s ease-out" }}>
                <h2 className="glow-text" style={{ fontSize: "2.5rem", marginBottom: "0.25rem" }}>{player.name}</h2>
             </div>
           </div>
        </div>
      )}
    </>
  );

  return createPortal(modalContent, document.body);
};

export default PlayerProfileModal;
