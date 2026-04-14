export type PlayerPosition = "top" | "bottom" | "left" | "right";

export interface Token {
  id: string;
  player: PlayerPosition;
  position: number | string;
  isAtHome: boolean;
  isFinished: boolean;
}

export interface Player {
  position: PlayerPosition;
  color: string;
  name: string;
  tokens: Token[];
}

// ПРАВИЛА ПОЗИЦИЙ (Обновлено по запросу пользователя)
export const PLAYER_CONFIG: Record<PlayerPosition, { color: string; startPos: number; endPos: number; entryCell: number; extraPath: string[] }> = {
  top: { color: "#D4AF37", startPos: 7, endPos: 6, entryCell: 6, extraPath: ["top_extra_5", "top_extra_4", "top_extra_3", "top_extra_2", "top_extra_1"] },
  right: { color: "#3498DB", startPos: 19, endPos: 18, entryCell: 18, extraPath: ["right_extra_5", "right_extra_4", "right_extra_3", "right_extra_2", "right_extra_1"] },
  bottom: { color: "#2ECC71", startPos: 31, endPos: 30, entryCell: 30, extraPath: ["bottom_extra_5", "bottom_extra_4", "bottom_extra_3", "bottom_extra_2", "bottom_extra_1"] },
  left: { color: "#E74C3C", startPos: 43, endPos: 42, entryCell: 42, extraPath: ["left_extra_5", "left_extra_4", "left_extra_3", "left_extra_2", "left_extra_1"] },
};

export const FLIGHTS: Record<number, number> = { 10: 17, 22: 29, 34: 41, 46: 5 };
export const RETURNS: Record<number, number> = { 15: 8, 27: 20, 39: 32, 3: 44 };
export const SAFE_SPOTS = [1, 13, 25, 37];

export const DEADLOCK_CONFIG: Record<number, { path: string[], exit: number }> = {
  9: { path: ["T1_p1", "T1_p2", "T1_p3"], exit: 11 },
  21: { path: ["T2_p1", "T2_p2", "T2_p3"], exit: 23 },
  33: { path: ["T3_p1", "T3_p2", "T3_p3"], exit: 35 },
  45: { path: ["T4_p1", "T4_p2", "T4_p3"], exit: 47 },
};

export const getDeadlockInfo = (pos: number | string) => {
  if (typeof pos === "number" && DEADLOCK_CONFIG[pos]) return { entry: pos, step: -1 };

  for (const entryKey of Object.keys(DEADLOCK_CONFIG)) {
    const entry = parseInt(entryKey);
    const idx = DEADLOCK_CONFIG[entry].path.indexOf(pos as string);
    if (idx !== -1) return { entry, step: idx };
  }
  return null;
};

/**
 * Compares two positions, handling numeric and start_X aliases.
 * "start_7" is logically the same cell as numeric 7 for collision purposes.
 */
export const comparePositions = (p1: number | string, p2: number | string): boolean => {
  if (p1 === p2) return true;
  if (typeof p1 === "number" && p2 === `start_${p1}`) return true;
  if (typeof p2 === "number" && p1 === `start_${p2}`) return true;
  if (typeof p1 === "string" && p1.startsWith("start_") && 
      typeof p2 === "string" && p2.startsWith("start_")) {
    return p1 === p2;
  }
  return false;
};

/**
 * Calculates relative distance from startPos (0 to 48)
 */
export const getRelativeDistance = (pos: number | string, startPos: number): number => {
  if (typeof pos === "string") {
    if (pos.startsWith("start_")) return 0;
    return 100; // Far away for extra paths
  }

  // Numeric position equal to startPos means it completed the circuit (Dist 48)
  if (pos === startPos) return 48;

  let dist = pos - startPos;
  if (dist < 0) dist += 48;
  return dist;
};

/**
 * Checks if a cell is occupied and by whom
 */
export const getOccupant = (pos: number | string, allPlayers: Record<PlayerPosition, Player>): PlayerPosition | null => {
  for (const posKey of Object.keys(allPlayers)) {
    const p = allPlayers[posKey as PlayerPosition];
    if (p.tokens.some(t => {
      if (t.isAtHome || t.isFinished) return false;
      return comparePositions(t.position, pos);
    })) {
      return p.position;
    }
  }
  return null;
};

/**
 * Checks if a token can move based on the dice roll and board state
 */
export const canTokenMove = (token: Token, roll: number, allPlayers: Record<PlayerPosition, Player>): boolean => {
  if (token.isFinished) return false;

  const dl = getDeadlockInfo(token.position);
  if (dl) {
    // Step -1 (Tx): needs 1 to move to p1
    // Step 0 (p1): needs 2 to move to p2
    // Step 1 (p2): needs 3 to move to p3
    // Step 2 (p3): needs 1 to move to O
    const requiredRoll = [1, 2, 3, 1][dl.step + 1];
    return roll === requiredRoll;
  }

  const config = PLAYER_CONFIG[token.player];

  // Rule for entering from home
  if (token.isAtHome) {
    if (roll !== 6) return false;
    // Rule: if start position is occupied by OWN token, can't enter
    // We check both the numeric 7 and "start_7"
    const occupant = getOccupant(config.startPos, allPlayers);
    if (occupant === token.player) return false;

    if (occupant && SAFE_SPOTS.includes(config.startPos)) return false;
    return true;
  }

  // Check for finish stretch
  if (typeof token.position === "string" && token.position.includes("extra")) {
    const extraIdx = config.extraPath.indexOf(token.position);
    const targetIdx = extraIdx + roll;
    if (targetIdx >= config.extraPath.length) return false;

    const targetPos = config.extraPath[targetIdx];
    if (getOccupant(targetPos, allPlayers)) return false;

    return true;
  }

  // Normal move logic
  if (typeof token.position === "number" || (typeof token.position === "string" && token.position.startsWith("start_"))) {
    const currentDist = getRelativeDistance(token.position, config.startPos);
    const nextDist = currentDist + roll;

    const { pos: rawPos } = calculateNewPosition(token, roll);
    const { pos: finalPos } = applyBoardRules(rawPos);

    // Global Blockage Rule: Cannot step THROUGH anyone
    for (let d = 1; d < roll; d++) {
      const stepDist = currentDist + d;
      let stepPos: number | string;

      const entryDist = getRelativeDistance(config.entryCell, config.startPos);
      if (stepDist <= entryDist) {
        stepPos = (config.startPos + stepDist);
        if (stepPos > 48) stepPos -= 48;
      } else {
        const extraIdx = stepDist - entryDist - 1;
        if (extraIdx >= config.extraPath.length) return false; // Too far
        stepPos = config.extraPath[extraIdx];
      }

      if (getOccupant(stepPos, allPlayers)) return false;
    }

    const occupant = getOccupant(finalPos, allPlayers);
    // Standard landing on own rule, but allow if it's a deadlock shift
    if (occupant === token.player) {
      if (typeof finalPos === "number" && DEADLOCK_CONFIG[finalPos]) {
        // OK to land on own in deadlock to push them
      } else {
        return false;
      }
    }

    // Safety check for safe spots
    if (occupant && typeof finalPos === "number" && SAFE_SPOTS.includes(finalPos)) return false;

    return true;
  }

  return false;
};

/**
 * Calculates the new position of a token after a move
 */
export const calculateNewPosition = (token: Token, roll: number): { pos: number | string, finished: boolean } => {
  const dl = getDeadlockInfo(token.position);
  if (dl) {
    const nextPosList = [...DEADLOCK_CONFIG[dl.entry].path, DEADLOCK_CONFIG[dl.entry].exit];
    const nextPos = nextPosList[dl.step + 1];
    return { pos: nextPos, finished: false };
  }

  const config = PLAYER_CONFIG[token.player];

  if (token.isAtHome) return { pos: `start_${config.startPos}`, finished: false };

  // Extra path movement
  if (typeof token.position === "string" && !token.position.startsWith("start_") && token.position.includes("extra")) {
    const extraIdx = config.extraPath.indexOf(token.position);
    return { pos: config.extraPath[extraIdx + roll], finished: false };
  }

  // Perimeter movement
  if (typeof token.position === "number" || (typeof token.position === "string" && token.position.startsWith("start_"))) {
    const currentDist = getRelativeDistance(token.position, config.startPos);
    const nextDist = currentDist + roll;

    if (nextDist > 48) {
      const extraIdx = nextDist - 49;
      return { pos: config.extraPath[extraIdx], finished: false };
    } else {
      let nextPos = (config.startPos + nextDist);
      if (nextPos > 48) nextPos -= 48;
      return { pos: nextPos, finished: false };
    }
  }

  return { pos: token.position, finished: false };
};

/**
 * Calculates every cell a token visits during a move for animation purposes.
 */
export const getMovementPath = (token: Token, roll: number): (number | string)[] => {
  const path: (number | string)[] = [];
  
  // Starting position from home
  if (token.isAtHome) {
    const config = PLAYER_CONFIG[token.player];
    return [`start_${config.startPos}`];
  }

  // Intermediate steps
  for (let i = 1; i <= roll; i++) {
    const { pos } = calculateNewPosition(token, i);
    path.push(pos);
  }

  return path;
};

/**
 * Applies board rules like flights and returns
 */
export const applyBoardRules = (pos: number | string): { pos: number | string, effect?: "flight" | "return" } => {
  if (typeof pos === "string") return { pos };

  if (FLIGHTS[pos]) {
    return { pos: FLIGHTS[pos], effect: "flight" };
  }
  if (RETURNS[pos]) {
    return { pos: RETURNS[pos], effect: "return" };
  }
  return { pos };
};

/**
 * Resolves all board collisions (captures, deadlock shifts, exit shifts)
 */
export const resolveBoardCollisions = (
  players: Record<PlayerPosition, Player>,
  targetPos: number | string,
  landingPlayerPos: PlayerPosition,
  movingTokenId?: string,
  capturedNames: string[] = []
): { nextPlayers: Record<PlayerPosition, Player>, capturedNames: string[] } => {

  // Find if anyone is at the target cell (excluding the token that just landed there)
  let occupantPos: PlayerPosition | null = null;
  let occupantTokenId: string | null = null;

  for (const pKey of Object.keys(players) as PlayerPosition[]) {
    const occupant = players[pKey].tokens.find(t =>
      !t.isAtHome && !t.isFinished && comparePositions(t.position, targetPos) && t.id !== movingTokenId
    );
    if (occupant) {
      occupantPos = pKey;
      occupantTokenId = occupant.id;
      break;
    }
  }

  // If no one is there, we're done
  if (!occupantPos) return { nextPlayers: players, capturedNames };

  const dl = getDeadlockInfo(targetPos);

  // Rule: В ТУПИКАХ НЕ РУБЯТ (Do not capture in deadlock zones)
  if (dl) {
    // Current occupant MUST shift forward
    const nextPos = [...DEADLOCK_CONFIG[dl.entry].path, DEADLOCK_CONFIG[dl.entry].exit][dl.step + 1];

    // 1. Recurse to clear the next position first
    // When shifting, we treat the current occupant as the 'moving' one
    const { nextPlayers: shiftedPlayers, capturedNames: moreCaptures } = resolveBoardCollisions(players, nextPos, occupantPos, occupantTokenId!, capturedNames);

    // 2. Move the occupant from targetPos to nextPos
    const finalPlayers = { ...shiftedPlayers };
    finalPlayers[occupantPos] = {
      ...finalPlayers[occupantPos],
      tokens: finalPlayers[occupantPos].tokens.map(t =>
        (t.id === occupantTokenId) ? { ...t, position: nextPos } : t
      )
    };

    return { nextPlayers: finalPlayers, capturedNames: moreCaptures };
  }

  // Check if it's an Exit Cell (O)
  const isExit = Object.values(DEADLOCK_CONFIG).some(d => d.exit === targetPos);
  if (isExit) {
    if (occupantPos === landingPlayerPos) {
      // Own token at O: shift forward on perimeter
      const nextPos = (targetPos as number === 48) ? 1 : (targetPos as number + 1);

      // Notify about the shift through a reserved capture name starting with "SHIFT:"
      capturedNames.push(`SHIFT:${players[occupantPos].name} was pushed forward from exit!`);

      const { nextPlayers: shiftedPlayers, capturedNames: moreCaptures } = resolveBoardCollisions(players, nextPos, occupantPos, occupantTokenId!, capturedNames);

      const finalPlayers = { ...shiftedPlayers };
      finalPlayers[occupantPos] = {
        ...finalPlayers[occupantPos],
        tokens: finalPlayers[occupantPos].tokens.map(t =>
          (t.id === occupantTokenId) ? { ...t, position: nextPos } : t
        )
      };
      return { nextPlayers: finalPlayers, capturedNames: moreCaptures };
    } else {
      // Opponent token at O: RUBBIT!
      const finalPlayers = { ...players };
      finalPlayers[occupantPos] = {
        ...finalPlayers[occupantPos],
        tokens: finalPlayers[occupantPos].tokens.map(t =>
          (t.id === occupantTokenId) ? { ...t, position: "home", isAtHome: true } : t
        )
      };
      capturedNames.push(players[occupantPos].name);
      return { nextPlayers: finalPlayers, capturedNames };
    }
  }

  // Rule 2: Cannot capture on safe spots (1, 13, 25, 37)
  if (typeof targetPos === "number" && SAFE_SPOTS.includes(targetPos)) {
    return { nextPlayers: players, capturedNames };
  }

  // Normal perimeter collision
  if (occupantPos !== landingPlayerPos) {
    // Capture opponent
    const finalPlayers = { ...players };
    finalPlayers[occupantPos] = {
      ...finalPlayers[occupantPos],
      tokens: finalPlayers[occupantPos].tokens.map(t =>
        (t.id === occupantTokenId) ? { ...t, position: "home", isAtHome: true } : t
      )
    };
    capturedNames.push(players[occupantPos].name);
    return { nextPlayers: finalPlayers, capturedNames };
  }

  // Otherwise (landing on own on normal cell), logic usually prevents this in canTokenMove
  return { nextPlayers: players, capturedNames };
};

/**
 * Checks if a player has met the win condition:
 * tokens on positions 1K, 2K, and 3K (extra_1, extra_2, extra_3)
 */
export const isWinConditionMet = (player: Player): boolean => {
  const winPositions = [
    `${player.position}_extra_1`,
    `${player.position}_extra_2`,
    `${player.position}_extra_3`,
  ];
  const occupiedWinPositions = winPositions.filter(pos =>
    player.tokens.some(t => t.position === pos)
  );
  return occupiedWinPositions.length === 3;
};
