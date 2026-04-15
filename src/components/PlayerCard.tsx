"use client";

import React from "react";
import { Star, Crown } from "lucide-react";
import { PlayerPosition, ConnectedPlayer, useGame } from "@/context/GameContext";

interface PlayerCardProps {
  position: PlayerPosition;
  connectedPlayer: ConnectedPlayer;
  color: string;
  isMe?: boolean;
  onProfileClick?: (player: ConnectedPlayer) => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ position, connectedPlayer, color, isMe, onProfileClick }) => {
  const { currentTurn } = useGame();
  const isActive = currentTurn === position;

  // Генерируем инициалы из никнейма
  const initials = connectedPlayer.name
    .split(/(?=[A-Z])/)
    .map(s => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`player-card ${isActive ? "player-card-active" : ""}`}
      onClick={() => onProfileClick?.(connectedPlayer)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        width: "105px",
        height: "105px",
        cursor: "pointer",
        background: isActive
          ? `linear-gradient(135deg, ${color}22 0%, ${color}12 100%)`
          : "rgba(255, 255, 255, 0.02)",
        backdropFilter: "blur(16px)",
        borderRadius: "16px",
        border: `2px solid ${isActive ? color : `${color}33`}`,
        boxShadow: isActive
          ? `0 0 30px ${color}44, inset 0 0 20px ${color}22`
          : `0 4px 20px rgba(0,0,0,0.2)`,
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
        overflow: "visible", // Allowed for crown overflow
        flexShrink: 0,
        animation: isActive ? "active-player-pulse 2s infinite ease-in-out" : "none"
      }}
    >
      {/* Метка "ВАШ ХОД" */}
      {isActive && isMe && (
        <div style={{
          position: "absolute",
          top: "-25px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "var(--accent)",
          color: "black",
          padding: "2px 10px",
          borderRadius: "10px",
          fontSize: "10px",
          fontWeight: "900",
          whiteSpace: "nowrap",
          boxShadow: "0 0 15px var(--glow)",
          zIndex: 10,
          animation: "bounce-subtle 1.5s infinite"
        }}>
          YOUR TURN
        </div>
      )}

      {/* Индикатор активного хода */}
      {isActive && (
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "3px",
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          animation: "shimmer 1.5s infinite",
          borderRadius: "16px 16px 0 0"
        }} />
      )}

      {/* Аватар (ВВЕРХУ) */}
      <div style={{
        position: "relative",
        flexShrink: 0,
        marginTop: "10px",
        width: "52px",
        height: "52px",
        minWidth: "52px",
        minHeight: "52px",
        overflow: "hidden",
        borderRadius: "50%",
        border: `2.5px solid ${isActive ? color : `${color}66`}`,
        boxShadow: isActive ? `0 0 15px ${color}66` : "none",
        transition: "all 0.3s ease"
      }}>
        {connectedPlayer.image ? (
          <img
            src={connectedPlayer.image}
            alt={connectedPlayer.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${connectedPlayer.avatarZoom ?? 1.0}) translate(${(connectedPlayer.avatarX ?? 50) - 50}%, ${(connectedPlayer.avatarY ?? 50) - 50}%)`,
            }}
          />
        ) : (
          <div style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${color}44, ${color}22)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            fontWeight: "900",
            color: color,
          }}>
            {initials}
          </div>
        )}

        {isActive && (
          <div style={{
            position: "absolute",
            top: "-6px",
            right: "-4px",
            animation: "bounce-subtle 1.5s infinite",
          }}>
            <Crown size={14} fill={color} color="#fff" />
          </div>
        )}
      </div>

      {/* Информация (НИЖЕ) */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2px",
        width: "100%",
        padding: "0 8px",
      }}>
        {/* Никнейм */}
        <div style={{
          fontSize: "12px",
          fontWeight: "900",
          color: isActive ? "#fff" : "var(--foreground)",
          textAlign: "center",
          width: "100%",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          textShadow: isActive ? `0 0 15px ${color}` : "none",
          transition: "all 0.3s ease"
        }}>
          {isMe ? "YOU" : connectedPlayer.name}
        </div>

        {/* Рейтинг */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "3px",
          fontSize: "10px",
          fontWeight: "700",
          color: isActive ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.4)",
        }}>
          <Star size={10} fill="var(--accent)" color="var(--accent)" style={{ opacity: 0.7 }} />
          <span>{connectedPlayer.rating}</span>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes active-player-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default PlayerCard;
