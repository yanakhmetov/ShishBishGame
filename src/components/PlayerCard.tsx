"use client";

import React from "react";
import { Star, Crown } from "lucide-react";
import { PlayerPosition, ConnectedPlayer, useGame } from "@/context/GameContext";

interface PlayerCardProps {
  position: PlayerPosition;
  connectedPlayer: ConnectedPlayer;
  color: string;
  onProfileClick?: (player: ConnectedPlayer) => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ position, connectedPlayer, color, onProfileClick }) => {
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
          ? `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`
          : "rgba(255, 255, 255, 0.02)",
        backdropFilter: "blur(16px)",
        borderRadius: "16px",
        border: `1.5px solid ${isActive ? `${color}aa` : `${color}33`}`,
        boxShadow: isActive
          ? `0 0 25px ${color}22, inset 0 0 20px ${color}08`
          : `0 4px 20px rgba(0,0,0,0.2)`,
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Индикатор активного хода */}
      {isActive && (
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "2px",
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          animation: "shimmer 2s infinite",
        }} />
      )}

      {/* Аватар (ВВЕРХУ) */}
      <div style={{
        position: "relative",
        flexShrink: 0,
        marginTop: "10px",
        width: "48px",
        height: "48px",
        minWidth: "48px",
        minHeight: "48px",
        overflow: "hidden",
        borderRadius: "50%",
        border: `2px solid ${isActive ? color : `${color}66`}`,
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
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            border: `2px solid ${isActive ? color : `${color}66`}`,
            background: `linear-gradient(135deg, ${color}44, ${color}22)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
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
            <Crown size={12} fill={color} color={color} />
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
          fontSize: "11px",
          fontWeight: "800",
          color: isActive ? color : "var(--foreground)",
          textAlign: "center",
          width: "100%",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          textShadow: isActive ? `0 0 10px ${color}44` : "none",
        }}>
          {connectedPlayer.name}
        </div>

        {/* Рейтинг */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "3px",
          fontSize: "10px",
          fontWeight: "700",
          color: "rgba(255, 255, 255, 0.4)",
        }}>
          <Star size={10} fill="var(--accent)" color="var(--accent)" style={{ opacity: 0.7 }} />
          <span>{connectedPlayer.rating}</span>
        </div>
      </div>
    </div>
  );
};


export default PlayerCard;
