"use client";

import React from "react";
import { PlaneTakeoff, RotateCcw } from "lucide-react";
import PlayerHome from "./PlayerHome";
import PlayerCard from "./PlayerCard";
import { useAppContext } from "@/context/AppContext";
import { useGame, PlayerPosition, PLAYER_CONFIG, canTokenMove, ConnectedPlayer, FLIGHTS, RETURNS } from "@/context/GameContext";
import { getMovementPath, calculateNewPosition, applyBoardRules } from "@/lib/gameLogic";
import { useState, useEffect, useRef } from "react";

interface GameBoardProps {
  onProfileClick?: (player: ConnectedPlayer) => void;
}

const AnimatedToken = ({
  token,
  playerColor,
  isMyTurn,
  canMove,
  moveToken,
  getCellCoords,
  isFlightSource,
  isReturnSource
}: {
  token: any,
  playerColor: string,
  isMyTurn: boolean,
  canMove: boolean,
  moveToken: (id: string) => void,
  getCellCoords: (pos: number | string) => { c: number, r: number } | null,
  isFlightSource: (pos: number) => number | null,
  isReturnSource: (pos: number) => number | null
}) => {
  const [visualPos, setVisualPos] = useState(token.position);
  const [isAnimating, setIsAnimating] = useState(false);
  const [offsetPath, setOffsetPath] = useState<string | null>(null);
  const [walkPathLength, setWalkPathLength] = useState(0);
  const [animDuration, setAnimDuration] = useState(0.6);
  const prevPosRef = useRef(token.position);
  const { players } = useGame();

  const getCellCenterPx = (c: number, r: number) => {
    const CELL_SIZE = 35;
    const CELL_GAP = 4;
    return {
      x: c * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2,
      y: r * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2
    };
  };

  useEffect(() => {
    if (token.position !== prevPosRef.current) {
      const oldPos = prevPosRef.current;
      const newPos = token.position;
      prevPosRef.current = newPos;

      if (token.isAtHome || token.isFinished || newPos === "finish" || oldPos === "home" || oldPos === "finish") {
        setVisualPos(newPos);
        return;
      }

      const possibleRolls = [1, 2, 3, 4, 5, 6];
      let walkPath: (number | string)[] = [];
      let jumpType: "flight" | "return" | null = null;
      let finalWalkDest: number | string | null = null;

      for (const r of possibleRolls) {
        const { pos: wd } = calculateNewPosition({ ...token, position: oldPos, isAtHome: false }, r);
        const { pos: fd, effect } = applyBoardRules(wd);

        if (fd === newPos) {
          walkPath = getMovementPath({ ...token, position: oldPos, isAtHome: false }, r);
          finalWalkDest = wd;
          jumpType = effect || null;
          break;
        }
      }

      if (walkPath.length > 0) {
        const startCoords = getCellCoords(oldPos);
        if (startCoords) {
          const s = getCellCenterPx(startCoords.c, startCoords.r);
          let pathD = `M ${s.x} ${s.y}`;

          // Phase 1: Walking lines
          walkPath.forEach(p => {
            const c = getCellCoords(p);
            if (c) {
              const cp = getCellCenterPx(c.c, c.r);
              pathD += ` L ${cp.x} ${cp.y}`;
            }
          });

          // Phase 2: Arc jump (if applicable)
          if (jumpType && finalWalkDest && finalWalkDest !== newPos) {
            const sc = getCellCoords(finalWalkDest);
            const ec = getCellCoords(newPos);
            if (sc && ec) {
              const sj = getCellCenterPx(sc.c, sc.r);
              const ej = getCellCenterPx(ec.c, ec.r);
              let cx = (sj.x + ej.x) / 2;
              let cy = (sj.y + ej.y) / 2;

              if (jumpType === "flight") {
                const B_MAX = 503;
                const offset = 150;
                if (sc.r === 0 && ec.c === 12) { cx = B_MAX + offset; cy = -offset; }
                else if (sc.c === 12 && ec.r === 12) { cx = B_MAX + offset; cy = B_MAX + offset; }
                else if (sc.r === 12 && ec.c === 0) { cx = -offset; cy = B_MAX + offset; }
                else if (sc.c === 0 && ec.r === 0) { cx = -offset; cy = -offset; }
              } else {
                cx = 251.5; cy = 251.5;
              }
              pathD += ` Q ${cx} ${cy} ${ej.x} ${ej.y}`;
            }
          }

          setOffsetPath(`path('${pathD}')`);
          setWalkPathLength(walkPath.length + (jumpType ? 4 : 0));

          setIsAnimating(false);
          const startTimer = setTimeout(() => setIsAnimating(true), 10);

          const totalDuration = (walkPath.length * 180) + (jumpType ? 800 : 0);
          setAnimDuration(totalDuration / 1000);

          const endTimer = setTimeout(() => {
            setIsAnimating(false);
            setOffsetPath(null);
            setVisualPos(newPos);
          }, totalDuration + 50);

          return () => { clearTimeout(startTimer); clearTimeout(endTimer); };
        }
      } else {
        setVisualPos(newPos);
      }
    }
  }, [token.position]);

  const coords = getCellCoords(visualPos);
  if (!coords) return null;
  const currentPos = getCellCenterPx(coords.c, coords.r);

  const isArc = !!offsetPath && offsetPath.includes("Q");

  return (
    <div
      className={`game-token ${isMyTurn ? "active-token" : ""} ${canMove ? "movable-token" : ""} ${isAnimating ? "animating" : ""}`}
      onClick={() => canMove && moveToken(token.id)}
      style={{
        position: "absolute",
        left: offsetPath ? undefined : `${currentPos.x}px`,
        top: offsetPath ? undefined : `${currentPos.y}px`,
        offsetPath: offsetPath || undefined,
        offsetDistance: offsetPath ? (isAnimating ? "100%" : "0%") : undefined,
        transform: offsetPath ? "none" : "translate(-50%, -50%)",
        transition: isAnimating 
          ? `offset-distance ${animDuration}s cubic-bezier(0.4, 0, 0.2, 1)` 
          : "none",
        background: `radial-gradient(circle at 30% 30%, ${playerColor}, ${playerColor}cc)`,
        boxShadow: isAnimating
          ? `0 20px 40px rgba(0,0,0,0.6), 0 0 25px ${playerColor}`
          : (canMove ? `0 0 15px ${playerColor}` : `0 4px 10px rgba(0,0,0,0.3)`),
        zIndex: isAnimating ? 200 : 100,
        cursor: canMove ? "pointer" : "default",
        width: "28px", height: "28px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)",
      }}>
      <div style={{ position: "absolute", top: "15%", left: "15%", width: "35%", height: "35%", background: "rgba(255,255,255,0.5)", borderRadius: "50%", filter: "blur(1px)" }} />
    </div>
  );
};

const GameBoard = ({ onProfileClick }: GameBoardProps) => {
  const { t } = useAppContext();
  const { players, moveToken, currentTurn, activePlayers, connectedPlayers, diceValue, isRolling } = useGame();

  const size = 13;
  const center = 6;

  const getPerimeterNumber = (c: number, r: number) => {
    if (r === 0) return c + 1;
    if (c === size - 1) return size + r;
    if (r === size - 1) return (size * 2 - 1) + (size - 1 - c);
    if (c === 0) return (size * 3 - 2) + (size - 1 - r);
    return null;
  };

  const getCellCoords = (pos: number | string) => {
    if (typeof pos === "string") {
      if (pos.startsWith("start_")) {
        const num = parseInt(pos.split("_")[1]);
        return getCellCoords(num);
      }
      for (const [key, val] of Object.entries(extraTilesMap)) {
        if (key === pos) return { c: val.c, r: val.r };
      }
      for (const [key, val] of Object.entries(parkingTiles)) {
        if (key === pos) return { c: val.c, r: val.r };
      }
      return null;
    }
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (getPerimeterNumber(c, r) === pos) return { c, r };
      }
    }
    return null;
  };

  const specialPerimLabels: Record<number, string> = {
    9: t("marker_T") + "1", 21: t("marker_T") + "2", 33: t("marker_T") + "3", 45: t("marker_T") + "4",
    11: t("marker_O"), 23: t("marker_O"), 35: t("marker_O"), 47: t("marker_O"),
    17: t("marker_P"), 29: t("marker_P"), 41: t("marker_P"), 5: t("marker_P"),
    8: t("marker_V"), 20: t("marker_V"), 32: t("marker_V"), 44: t("marker_V"),
  };

  const extraTilesMap: Record<string, { c: number; r: number; label: string; player: PlayerPosition }> = {
    "top_extra_5": { c: 6, r: 1, label: "", player: "top" },
    "top_extra_4": { c: 6, r: 2, label: "", player: "top" },
    "top_extra_3": { c: 6, r: 3, label: "3" + t("marker_K"), player: "top" },
    "top_extra_2": { c: 6, r: 4, label: "2" + t("marker_K"), player: "top" },
    "top_extra_1": { c: 6, r: 5, label: "1" + t("marker_K"), player: "top" },

    "bottom_extra_5": { c: 6, r: 11, label: "", player: "bottom" },
    "bottom_extra_4": { c: 6, r: 10, label: "", player: "bottom" },
    "bottom_extra_3": { c: 6, r: 9, label: "3" + t("marker_K"), player: "bottom" },
    "bottom_extra_2": { c: 6, r: 8, label: "2" + t("marker_K"), player: "bottom" },
    "bottom_extra_1": { c: 6, r: 7, label: "1" + t("marker_K"), player: "bottom" },

    "left_extra_5": { c: 1, r: 6, label: "", player: "left" },
    "left_extra_4": { c: 2, r: 6, label: "", player: "left" },
    "left_extra_3": { c: 3, r: 6, label: "3" + t("marker_K"), player: "left" },
    "left_extra_2": { c: 4, r: 6, label: "2" + t("marker_K"), player: "left" },
    "left_extra_1": { c: 5, r: 6, label: "1" + t("marker_K"), player: "left" },

    "right_extra_5": { c: 11, r: 6, label: "", player: "right" },
    "right_extra_4": { c: 10, r: 6, label: "", player: "right" },
    "right_extra_3": { c: 9, r: 6, label: "3" + t("marker_K"), player: "right" },
    "right_extra_2": { c: 8, r: 6, label: "2" + t("marker_K"), player: "right" },
    "right_extra_1": { c: 7, r: 6, label: "1" + t("marker_K"), player: "right" },
  };

  const parkingTiles: Record<string, { c: number; r: number; label: string }> = {
    "T1_p1": { c: 8, r: 1, label: "1" }, "T1_p2": { c: 9, r: 1, label: "2" }, "T1_p3": { c: 10, r: 1, label: "3" },
    "T2_p1": { c: 11, r: 8, label: "1" }, "T2_p2": { c: 11, r: 9, label: "2" }, "T2_p3": { c: 11, r: 10, label: "3" },
    "T3_p1": { c: 4, r: 11, label: "1" }, "T3_p2": { c: 3, r: 11, label: "2" }, "T3_p3": { c: 2, r: 11, label: "3" },
    "T4_p1": { c: 1, r: 4, label: "1" }, "T4_p2": { c: 1, r: 3, label: "2" }, "T4_p3": { c: 1, r: 2, label: "3" },
  };

  const flights: Record<number, number> = { 10: 17, 22: 29, 34: 41, 46: 5 };
  const returns: Record<number, number> = { 15: 8, 27: 20, 39: 32, 3: 44 };

  const getCellOuterEdgePx = (num: number) => {
    const coords = getCellCoords(num);
    if (!coords) return { x: 0, y: 0, c: 0, r: 0 };
    const CELL_SIZE = 35;
    const CELL_GAP = 4;
    const STEP = CELL_SIZE + CELL_GAP; // 39
    const BOARD_MAX = 13 * CELL_SIZE + 12 * CELL_GAP; // 503

    let x = coords.c * STEP + CELL_SIZE / 2;
    let y = coords.r * STEP + CELL_SIZE / 2;

    // Сдвигаем на внешний край грани
    if (coords.r === 0) y = 0;
    else if (coords.r === size - 1) y = BOARD_MAX;
    if (coords.c === 0) x = 0;
    else if (coords.c === size - 1) x = BOARD_MAX;

    return { x, y, c: coords.c, r: coords.r };
  };

  const getCellInnerEdgePx = (num: number) => {
    const coords = getCellCoords(num);
    const CELL_SIZE = 35;
    const CELL_GAP = 4;
    const STEP = CELL_SIZE + CELL_GAP; // 39
    const BOARD_MAX = 503;

    if (!coords) return { x: BOARD_MAX / 2, y: BOARD_MAX / 2, c: 0, r: 0 };
    let x = coords.c * STEP + CELL_SIZE / 2;
    let y = coords.r * STEP + CELL_SIZE / 2;

    // Сдвигаем на внутренний край грани
    if (coords.r === 0) y = CELL_SIZE;
    else if (coords.r === size - 1) y = BOARD_MAX - CELL_SIZE;
    if (coords.c === 0) x = CELL_SIZE;
    else if (coords.c === size - 1) x = BOARD_MAX - CELL_SIZE;

    return { x, y, c: coords.c, r: coords.r };
  };

  const renderCells = () => {
    const tiles = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const pNum = getPerimeterNumber(c, r);
        const isCross = (r === center || c === center);
        const extraData = Object.values(extraTilesMap).find(val => val.c === c && val.r === r);
        const isExtra = !!extraData;
        const isSpecialExtra = isExtra && extraData.label !== ""; // Only 1K, 2K, 3K

        const parkingData = Object.values(parkingTiles).find(val => val.c === c && val.r === r);
        const isParking = !!parkingData;

        if (pNum !== null || isCross || isExtra || isParking) {
          const perimLabel = pNum ? (specialPerimLabels[pNum] || pNum.toString()) : null;
          const isFlightStart = pNum !== null && flights[pNum];
          const isFlightEnd = pNum !== null && Object.values(flights).includes(pNum);
          const isReturnStart = pNum !== null && returns[pNum];
          const isReturnEnd = pNum !== null && Object.values(returns).includes(pNum);
          const playerColor = isExtra ? players[extraData.player].color : undefined;
          const showAsSpecial = isSpecialExtra;

          tiles.push(
            <div
              key={`${r}-${c}`}
              className={`board-tile 
                ${showAsSpecial ? "extra-tile" : ""} 
                ${isParking ? "parking-tile" : ""}
                ${isFlightStart ? "teleport-start" : ""} 
                ${isFlightEnd ? "teleport-end" : ""} 
                ${isReturnStart ? "return-start" : ""} 
                ${isReturnEnd ? "return-end" : ""}
              `}
              style={{
                gridColumn: c + 1,
                gridRow: r + 1,
                background: showAsSpecial ? `linear-gradient(135deg, ${playerColor}22 0%, ${playerColor}11 100%)` :
                  (isParking ? "rgba(255, 255, 255, 0.04)" :
                    (isCross && pNum === null ? "var(--card-bg)" : undefined)),
                borderColor: showAsSpecial ? `${playerColor}66` :
                  (isParking ? "rgba(212, 175, 55, 0.2)" :
                    (isCross && pNum === null ? "rgba(212, 175, 55, 0.1)" : undefined)),
                zIndex: isFlightStart || isReturnStart || isFlightEnd || isReturnEnd ? 15 : 10,
                boxShadow: isExtra ? `inset 0 0 10px ${playerColor}22` :
                  (isParking ? "0 0 10px rgba(212, 175, 55, 0.05)" : undefined),
                borderStyle: "solid",
                borderRadius: isParking ? "6px" : "4px"
              }}
            >
              {perimLabel && <span className="tile-number" style={specialPerimLabels[pNum!] ? { color: "var(--accent)", fontSize: "14px", opacity: 1, fontWeight: "900" } : {}}>{perimLabel}</span>}
              {isExtra && <span style={{ fontWeight: "900", color: playerColor, fontSize: "14px", textShadow: `0 0 8px ${playerColor}44` }}>{extraData.label}</span>}
              {isParking && <span style={{ fontWeight: "800", opacity: 0.6, fontSize: "14px", color: "var(--accent)", fontStyle: "italic" }}>{parkingData.label}</span>}

              {isFlightStart && <PlaneTakeoff size={18} className="teleport-icon" />}
              {isReturnStart && <RotateCcw size={18} className="return-icon" />}
            </div>
          );
        }
      }
    }
    return tiles;
  };

  const renderTokens = () => {
    const allTokens: React.ReactNode[] = [];
    activePlayers.forEach((pPos) => {
      players[pPos].tokens.forEach((token) => {
        if (token.isAtHome || token.isFinished) return;

        const isMyTurn = currentTurn === pPos;
        const canMove = isMyTurn && !isRolling && diceValue > 0 && canTokenMove(token, diceValue, players);

        allTokens.push(
          <AnimatedToken
            key={token.id}
            token={token}
            playerColor={players[pPos].color}
            isMyTurn={isMyTurn}
            canMove={canMove}
            moveToken={moveToken}
            getCellCoords={getCellCoords}
            isFlightSource={(pos) => FLIGHTS[pos] || null}
            isReturnSource={(pos) => RETURNS[pos] || null}
          />
        );
      });
    });
    return allTokens;
  };

  const renderFlightElements = () => {
    const BOARD_MAX = 503;
    return Object.entries(flights).map(([from, to]) => {
      const start = getCellOuterEdgePx(parseInt(from));
      const end = getCellOuterEdgePx(to);
      const offset = 150;
      let cpx = (start.x + end.x) / 2;
      let cpy = (start.y + end.y) / 2;
      if (start.r === 0 && end.c === size - 1) { cpx = BOARD_MAX + offset; cpy = -offset; }
      else if (start.c === size - 1 && end.r === size - 1) { cpx = BOARD_MAX + offset; cpy = BOARD_MAX + offset; }
      else if (start.r === size - 1 && end.c === 0) { cpx = -offset; cpy = BOARD_MAX + offset; }
      else if (start.c === 0 && end.r === 0) { cpx = -offset; cpy = -offset; }
      const pathD = `M ${start.x} ${start.y} Q ${cpx} ${cpy} ${end.x} ${end.y}`;
      return (
        <React.Fragment key={`flight-elements-${from}`}>
          <path d={pathD} fill="none" stroke="#3796d4" strokeWidth="4" strokeDasharray="8,10" strokeOpacity="0.7" className="flight-line" />
          <g>
            <g transform="scale(1.5) rotate(45) translate(-12, -12)">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" fill="#3796d4" filter="url(#plane-glow)" />
            </g>
            <animateMotion dur="10s" repeatCount="indefinite" path={pathD} rotate="auto" />
          </g>
        </React.Fragment>
      );
    });
  };

  const renderReturnElements = () => {
    return Object.entries(returns).map(([from, to]) => {
      const start = getCellInnerEdgePx(parseInt(from));
      const end = getCellInnerEdgePx(to);
      const mid = 503 / 2;
      const pathD = `M ${start.x} ${start.y} Q ${mid} ${mid} ${end.x} ${end.y}`;
      return (
        <React.Fragment key={`return-elements-${from}`}>
          <path d={pathD} fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray="8,10" strokeOpacity="0.7" />
          <g>
            <g transform="scale(1.5) rotate(45) translate(-12, -12)">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" fill="#ef4444" filter="url(#return-glow)" />
            </g>
            <animateMotion dur="12s" repeatCount="indefinite" path={pathD} rotate="auto" />
          </g>
        </React.Fragment>
      );
    });
  };

  const getZoneWrapperStyle = (pos: PlayerPosition): React.CSSProperties => {
    const base: React.CSSProperties = { position: "absolute", zIndex: 30, display: "flex", alignItems: "center", gap: "10px" };
    switch (pos) {
      case "top":
        return { ...base, flexDirection: "column", top: "0px", left: "50%", transform: "translateX(-50%)" };
      case "bottom":
        return { ...base, flexDirection: "column", bottom: "0px", left: "50%", transform: "translateX(-50%)" };
      case "left":
        return { ...base, flexDirection: "row", top: "50%", left: "0px", transform: "translateY(-50%)" };
      case "right":
        return { ...base, flexDirection: "row", top: "50%", right: "0px", transform: "translateY(-50%)" };
    }
  };

  return (
    <div style={{ position: "relative", padding: "165px", width: "fit-content", margin: "0 auto" }}>
      {/* Динамический рендеринг зон только для активных игроков */}
      {activePlayers.map(pos => {
        const color = PLAYER_CONFIG[pos].color;
        const cp = connectedPlayers.find(p => p.position === pos);
        const homeTokenCount = players[pos].tokens.filter(t => t.isAtHome).length;

        const cardElement = cp ? <PlayerCard position={pos} connectedPlayer={cp} color={color} onProfileClick={onProfileClick} /> : null;
        const homeElement = <PlayerHome position={pos} color={color} count={homeTokenCount} />;

        return (
          <div key={`zone-${pos}`} style={getZoneWrapperStyle(pos)}>
            {(pos === "top" || pos === "left") ? (
              <>{cardElement}{homeElement}</>
            ) : (
              <>{homeElement}{cardElement}</>
            )}
          </div>
        );
      })}

      <div className="board-container" style={{ position: "relative", zIndex: 10 }}>
        {renderCells()}{renderTokens()}
        <div className="board-center-area" style={{ gridColumn: center + 1, gridRow: center + 1, zIndex: 20, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "35px", height: "35px", flexShrink: 0, background: "var(--accent)", borderRadius: "4px", boxShadow: "0 0 15px var(--glow)", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: "900", fontSize: "14px" }}>SB</div>
          <div style={{ position: "absolute", bottom: "-14px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "3px", zIndex: 25 }}>
            {activePlayers.map(pPos => {
              const finishedCount = players[pPos].tokens.filter(t => t.isFinished).length;
              if (finishedCount === 0) return null;
              return <div key={pPos} style={{ width: "10px", height: "10px", borderRadius: "50%", background: players[pPos].color, border: "1px solid rgba(255,255,255,0.3)", boxShadow: `0 0 5px ${players[pPos].color}` }}></div>;
            })}
          </div>
        </div>
        <svg viewBox="0 0 503 503" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible", zIndex: 15 }}>
          <defs>
            <filter id="plane-glow"><feGaussianBlur stdDeviation="2" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="return-glow"><feGaussianBlur stdDeviation="2" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {renderFlightElements()}{renderReturnElements()}
        </svg>
      </div>
    </div>
  );
};

export default GameBoard;
