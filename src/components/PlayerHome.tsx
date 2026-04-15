import { useGame, canTokenMove } from "@/context/GameContext";
import { useAppContext } from "@/context/AppContext";

interface PlayerHomeProps {
  position: "top" | "bottom" | "left" | "right";
  color: string;
  count?: number;
}

const PlayerHome: React.FC<PlayerHomeProps> = ({ position, color, count = 3 }) => {
  const { t } = useAppContext();
  const { currentTurn, isRolling, diceValue, moveToken, players } = useGame();
  const isVertical = position === "left" || position === "right";

  const baseStyle: React.CSSProperties = {
    display: "flex",
    gap: "6px",
    padding: isVertical ? "12px 8px" : "8px 12px",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "12px",
    border: `1px solid ${color}44`,
    boxShadow: `0 0 15px ${color}11`,
    flexDirection: isVertical ? "column" : "row",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.3s ease",
    backdropFilter: "blur(10px)",
  };

  const tokenStyle: React.CSSProperties = {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    background: `radial-gradient(circle at 30% 30%, ${color}, ${color}cc)`,
    boxShadow: `0 3px 8px rgba(0,0,0,0.4), 0 0 6px ${color}88`,
    position: "relative",
    border: "1.5px solid rgba(255,255,255,0.2)",
  };

  return (
    <div className={`player-home-${position} group`} style={baseStyle}>
      {!isVertical && (
        <div style={{
          fontSize: "10px",
          fontWeight: "900",
          color: color,
          textTransform: "uppercase",
          opacity: 0.8,
          marginRight: "6px",
          letterSpacing: "1px"
        }}>
          {t(`pos${position.charAt(0).toUpperCase() + position.slice(1)}` as any)}
        </div>
      )}

      {isVertical && (
        <div style={{
          fontSize: "10px",
          fontWeight: "900",
          color: color,
          textTransform: "uppercase",
          opacity: 0.8,
          marginBottom: "6px",
          letterSpacing: "1px",
          writingMode: "vertical-rl",
          transform: "rotate(180deg)"
        }}>
          {t(`pos${position.charAt(0).toUpperCase() + position.slice(1)}` as any)}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: isVertical ? "column" : "row", gap: "6px" }}>
        {[...Array(count)].map((_, i) => {
          const homeTokens = players[position].tokens.filter(t => t.isAtHome);
          const targetToken = homeTokens[i];
          const canMove = currentTurn === position && !isRolling && diceValue === 6 && targetToken && canTokenMove(targetToken, diceValue, players);

          return (
            <div key={i} className="token-wrapper" style={{ position: "relative" }}>
              <div 
                style={{
                  ...tokenStyle,
                  boxShadow: canMove 
                    ? `0 0 15px ${color}, 0 3px 8px rgba(0,0,0,0.4)` 
                    : tokenStyle.boxShadow,
                  cursor: canMove ? "pointer" : "default"
                }} 
                className={`game-token-home ${canMove ? "movable-home-token" : ""}`}
                onClick={() => canMove && moveToken(targetToken.id)}
              >
                <div style={{
                  position: "absolute",
                  top: "15%",
                  left: "15%",
                  width: "35%",
                  height: "35%",
                  background: "rgba(255,255,255,0.5)",
                  borderRadius: "50%",
                  filter: "blur(1px)"
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerHome;
