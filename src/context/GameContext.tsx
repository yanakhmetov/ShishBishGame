import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { useSession } from "next-auth/react";
import { useAppContext } from "@/context/AppContext";

export type PlayerPosition = "top" | "bottom" | "left" | "right";

// Порядок подключения игроков к комнате
const CONNECTION_ORDER: PlayerPosition[] = ["top", "bottom", "right", "left"];

export interface Token {
  id: string;
  player: PlayerPosition;
  position: number | string;
  isAtHome: boolean;
  isFinished: boolean;
}

export interface ConnectedPlayer {
  userId: string;
  name: string;
  image: string | null;
  rating: number;
  position: PlayerPosition;
  wins: number;
  losses: number;
  gamesPlayed: number;
  featuredAchievements: string[];
  avatarX: number;
  avatarY: number;
  avatarZoom: number;
}

export interface Player {
  position: PlayerPosition;
  color: string;
  name: string;
  tokens: Token[];
}

interface GameState {
  players: Record<PlayerPosition, Player>;
  activePlayers: PlayerPosition[];
  connectedPlayers: ConnectedPlayer[];
  playerCount: number;
  currentTurn: PlayerPosition;
  diceValue: number;
  isRolling: boolean;
  gameStatus: "waiting" | "rolling" | "moving" | "switching" | "finished";
  gameStarted: boolean;
  readyStatuses: Record<PlayerPosition, boolean>;
  countdown: number | null;
  countdownStartedAt: number | null;
  isPaused: boolean;
  pauseTimeLeft: number | null;
  pauseStartedAt?: number | null;
  pausedBy: PlayerPosition | null;
  playerPauses: Record<PlayerPosition, number>;
  winner: PlayerPosition | null;
  history: string[];
  roomId: string | null;
  turnTimer: number;
  turnStartedAt: number | null;
  missedTurns: Record<PlayerPosition, number>;
  kickedPlayers: PlayerPosition[];
  initialPlayerCount: number;
}

interface GameContextType extends GameState {
  rollDice: (fromSocket?: boolean) => void;
  moveToken: (tokenId: string, fromSocket?: boolean) => void;
  resetGame: () => void;
  toggleReady: (pos: PlayerPosition, fromSocket?: boolean) => void;
  togglePause: (pos: PlayerPosition, fromSocket?: boolean) => void;
  surrender: (pos: PlayerPosition, fromSocket?: boolean) => void;
  setRoomData: (room: any) => void;
  setRoomId: (id: string) => void;
  refreshRoomData: () => Promise<void>;
  turnTimer: number;
}

import {
  canTokenMove,
  calculateNewPosition,
  applyBoardRules,
  resolveBoardCollisions,
  isWinConditionMet,
  PLAYER_CONFIG,
  FLIGHTS,
  RETURNS
} from "@/lib/gameLogic";
export { PLAYER_CONFIG, FLIGHTS, RETURNS, canTokenMove, calculateNewPosition, applyBoardRules, resolveBoardCollisions, isWinConditionMet };

// Mock players for testing
const MOCK_PLAYERS: ConnectedPlayer[] = [
  { userId: "u1", name: "GoldMaster", image: null, rating: 1450, position: "top", wins: 10, losses: 5, gamesPlayed: 15, featuredAchievements: [], avatarX: 50, avatarY: 50, avatarZoom: 1.0 },
  { userId: "u2", name: "EmeraldKing", image: null, rating: 1320, position: "bottom", wins: 8, losses: 7, gamesPlayed: 15, featuredAchievements: [], avatarX: 50, avatarY: 50, avatarZoom: 1.0 },
  { userId: "u3", name: "CrimsonAce", image: null, rating: 1580, position: "left", wins: 12, losses: 3, gamesPlayed: 15, featuredAchievements: [], avatarX: 50, avatarY: 50, avatarZoom: 1.0 },
  { userId: "u4", name: "SkyRider", image: null, rating: 1200, position: "right", wins: 5, losses: 10, gamesPlayed: 15, featuredAchievements: [], avatarX: 50, avatarY: 50, avatarZoom: 1.0 },
];

const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameProviderProps {
  children: React.ReactNode;
  playerCount?: 2 | 3 | 4;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children, playerCount = 4 }) => {
  const { data: session } = useSession();
  const { t } = useAppContext();
  const [gameState, setGameState] = useState<GameState>({
    players: {
      left: { position: "left", color: PLAYER_CONFIG.left.color, name: "Empty", tokens: [] },
      top: { position: "top", color: PLAYER_CONFIG.top.color, name: "Empty", tokens: [] },
      right: { position: "right", color: PLAYER_CONFIG.right.color, name: "Empty", tokens: [] },
      bottom: { position: "bottom", color: PLAYER_CONFIG.bottom.color, name: "Empty", tokens: [] },
    },
    activePlayers: [],
    connectedPlayers: [],
    playerCount: playerCount,
    currentTurn: "top",
    diceValue: 1,
    isRolling: false,
    gameStatus: "waiting",
    gameStarted: false,
    readyStatuses: { top: false, bottom: false, left: false, right: false },
    countdown: null,
    countdownStartedAt: null,
    isPaused: false,
    pauseTimeLeft: null,
    pauseStartedAt: null,
    pausedBy: null,
    playerPauses: { top: 2, bottom: 2, left: 2, right: 2 },
    winner: null,
    history: ["Waiting for arena data..."],
    turnTimer: 40,
    turnStartedAt: null,
    missedTurns: { top: 0, bottom: 0, left: 0, right: 0 },
    kickedPlayers: [],
    initialPlayerCount: playerCount,
    roomId: null,
  });

  // Refs for socket handlers to avoid effect re-runs - Init with null first
  const rollDiceRef = useRef<any>(null);
  const moveTokenRef = useRef<any>(null);
  const toggleReadyRef = useRef<any>(null);
  const togglePauseRef = useRef<any>(null);
  const surrenderRef = useRef<any>(null);

  const syncStateToDb = (state: GameState) => {
    if (!state.roomId) return;
    fetch(`/api/rooms/${state.roomId}/state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state)
    }).catch(console.error);
  };

  useEffect(() => {
    rollDiceRef.current = rollDice;
    moveTokenRef.current = moveToken;
    toggleReadyRef.current = toggleReady;
    togglePauseRef.current = togglePause;
    surrenderRef.current = surrender;
  });

  const setRoomData = useCallback((room: any) => {
    if (!room || !room.players) return;

    setGameState(prev => {
      // Hydrate persistent game state from PostgreSQL if it exists and hasn't been locally started yet
      if (room.gameState && !prev.gameStarted) {
        const hydratedState = { ...room.gameState, roomId: room.id };

        // Accurately compute the remaining pause time based on when the pause was started
        if (hydratedState.isPaused && hydratedState.pauseStartedAt) {
          const elapsedSeconds = Math.floor((Date.now() - hydratedState.pauseStartedAt) / 1000);
          const remaining = Math.max(0, 90 - elapsedSeconds);
          hydratedState.pauseTimeLeft = remaining;
          if (remaining === 0) {
            hydratedState.isPaused = false;
            hydratedState.pauseStartedAt = null;
            hydratedState.pausedBy = null;
          }
        }

        // Accurately compute the remaining countdown time
        if (hydratedState.countdownStartedAt) {
          const elapsedSeconds = Math.floor((Date.now() - hydratedState.countdownStartedAt) / 1000);
          const remaining = Math.max(0, 5 - elapsedSeconds);
          if (remaining > 0) {
            hydratedState.countdown = remaining;
          } else {
            // If countdown finished while we were away, mark game as started
            hydratedState.countdown = null;
            hydratedState.gameStarted = true;
          }
        }

        // Accurately compute the remaining turn timer
        if (hydratedState.gameStarted && !hydratedState.isPaused && hydratedState.turnStartedAt) {
          const elapsedSeconds = Math.floor((Date.now() - hydratedState.turnStartedAt) / 1000);
          const remaining = Math.max(0, 40 - elapsedSeconds);
          hydratedState.turnTimer = remaining;
        }

        // Overwrite the local state entirely with the DB snapshot to restore the session
        return hydratedState;
      }

      // 1. Sync game-wide state if game is in progress
      let updatedGameState = { ...prev };
      if (prev.gameStarted && room.gameState) {
        const dbState = typeof room.gameState === 'string' ? JSON.parse(room.gameState) : room.gameState;
        updatedGameState = {
          ...updatedGameState,
          activePlayers: dbState.activePlayers || prev.activePlayers,
          winner: dbState.winner || prev.winner,
          gameStatus: dbState.gameStatus || prev.gameStatus,
          currentTurn: dbState.currentTurn || prev.currentTurn,
        };
      }


      // Deep compare readiness and players to avoid redundant updates from Postgres
      const allPositions: PlayerPosition[] = ["top", "bottom", "right", "left"];
      const isReadinessSame = allPositions.every(pos => {
        const p = room.players.find((p: any) => p.position === pos);
        return (p?.isReady || false) === prev.readyStatuses[pos];
      });

      const isPlayersSame = room.players.length === prev.connectedPlayers.length && 
                           room.players.every((p: any) => prev.connectedPlayers.some(cp => cp.userId === p.userId && cp.position === p.position));
      
      // If nothing actually changed in Postgres, don't trigger a re-render
      // This prevents the "fighting" between socket and polling
      if (isReadinessSame && isPlayersSame) return prev;

      const newPlayers = { ...prev.players };
      const newReady = { ...prev.readyStatuses };
      const connected: ConnectedPlayer[] = [];
      const active: PlayerPosition[] = [];

      // Find all positions currently occupied in the DB
      const occupiedPositions = room.players.map((p: any) => p.position);

      // Clean up players that have left
      (["top", "bottom", "right", "left"] as PlayerPosition[]).forEach(pos => {
        if (!occupiedPositions.includes(pos)) {
          newPlayers[pos] = { position: pos, name: "Waiting...", tokens: [], color: newPlayers[pos].color };
          newReady[pos] = false;
        }
      });

      room.players.forEach((p: any) => {
        const pos = p.position as PlayerPosition;
        active.push(pos);
        newReady[pos] = p.isReady;

        const playerName = p.playerName || `#${p.userId.slice(-4)}`;

        // CRITICAL BUG FIX: If the user at this position has changed, reset their tokens!
        // Otherwise, a new user inheriting the same position will see the previous user's tokens.
        const prevInSlot = prev.connectedPlayers.find(cp => cp.position === pos);
        const isNewUserInSlot = prevInSlot && prevInSlot.userId !== p.userId;

        if (isNewUserInSlot) {
            console.log(`[setRoomData] Slot ${pos} changed from ${prevInSlot.userId} to ${p.userId}. Resetting tokens.`);
            newPlayers[pos].tokens = []; // Force reset below
        }

        connected.push({
          userId: p.userId,
          name: playerName,
          image: p.playerImage || null,
          rating: p.playerRating || 0,
          position: pos,
          wins: p.playerWins || 0,
          losses: p.playerLosses || 0,
          gamesPlayed: p.playerGamesPlayed || 0,
          featuredAchievements: p.playerFeaturedAchievements || [],
          avatarX: p.playerAvatarX ?? 50,
          avatarY: p.playerAvatarY ?? 50,
          avatarZoom: p.playerAvatarZoom ?? 1.0
        });

        // Setup tokens if missing or if user changed
        if (!newPlayers[pos].tokens || newPlayers[pos].tokens.length === 0) {
          newPlayers[pos].tokens = [1, 2, 3].map(i => ({
            id: `${pos}-${i}`,
            player: pos,
            position: "home",
            isAtHome: true,
            isFinished: false
          }));
        }
        newPlayers[pos].name = playerName;
      });

      return {
        ...updatedGameState,
        players: newPlayers,
        connectedPlayers: connected,
        activePlayers: prev.gameStarted ? updatedGameState.activePlayers : active,
        readyStatuses: newReady,
        playerCount: room.maxPlayers,
        // Only clear history if game hasn't started yet
        history: prev.gameStarted ? prev.history : []
      };
    });
  }, []);

  const refreshRoomData = useCallback(async () => {
    if (!gameState.roomId) return;
    try {
      const res = await fetch(`/api/rooms/${gameState.roomId}/join?action=sync`, { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        setRoomData(result.room);
      }
    } catch (err) {
      console.error("Failed to refresh room data:", err);
    }
  }, [gameState.roomId, setRoomData]);



  const setRoomId = useCallback((id: string) => {
    setGameState(prev => ({ ...prev, roomId: id }));
    getSocket().emit("join-room", id);
  }, []);

  const togglePause = (pos: PlayerPosition, fromSocket = false, explicitState?: boolean) => {
    // Determine target state based on current local state
    const isCurrentlyPaused = gameState.isPaused;
    const targetState = typeof explicitState === "boolean" ? explicitState : !isCurrentlyPaused;

    if (!fromSocket && gameState.roomId) {
      getSocket().emit("game-action", { roomId: gameState.roomId, action: "togglePause", payload: { pos, explicitState: targetState } });
    }

    setGameState(prev => {
      // If we are already at the target state, ignore the echoed event to prevent double-toggling
      if (prev.isPaused === targetState) return prev;

      if (!targetState) {
        // Shift turnStartedAt forward by the duration of the pause
        const elapsedOnTurnSoFar = 40 - prev.turnTimer;
        const newStartedAt = Date.now() - (elapsedOnTurnSoFar * 1000);

        const newState: GameState = {
          ...prev,
          isPaused: false,
          pauseTimeLeft: null,
          pauseStartedAt: null,
          pausedBy: null,
          turnStartedAt: newStartedAt
        };
        if (!fromSocket) syncStateToDb(newState);
        return newState;
      }

      if (prev.playerPauses[pos] <= 0) {
        alert(t("noPausesMsg"));
        return prev;
      }

      const newPauses = { ...prev.playerPauses, [pos]: prev.playerPauses[pos] - 1 };

      addHistory(`${prev.players[pos].name} ${t("tookPauseMsg")}`);
      const newState: GameState = { ...prev, isPaused: true, pauseTimeLeft: 90, pauseStartedAt: Date.now(), pausedBy: pos, playerPauses: newPauses };
      if (!fromSocket) syncStateToDb(newState);
      return newState;
    });
  };

  const surrender = (pos: PlayerPosition, fromSocket = false) => {
    if (!fromSocket && gameState.roomId) {
      getSocket().emit("game-action", { roomId: gameState.roomId, action: "surrender", payload: { pos } });
    }
    setGameState(prev => {
      addHistory(`${prev.players[pos].name} ${t("surrenderedMsg")}`);
      const nextActive = prev.activePlayers.filter(p => p !== pos);
      let newState: GameState;
      if (nextActive.length === 1) {
        newState = {
          ...prev,
          activePlayers: nextActive,
          winner: nextActive[0],
          gameStarted: false,
          readyStatuses: { top: false, bottom: false, left: false, right: false },
          countdown: null,
          countdownStartedAt: null
        };
      } else {
        newState = { ...prev, activePlayers: nextActive };
      }
      if (!fromSocket) syncStateToDb(newState);
      return newState;
    });
  };

  const toggleReady = useCallback((pos: PlayerPosition, fromSocket = false, explicitState?: boolean) => {
    if (gameState.gameStarted) return;

    // Determine the target state. We use the current state from gameState for the emit
    const targetState = typeof explicitState === "boolean" ? explicitState : !gameState.readyStatuses[pos];

    // Broadcast if we are the initiator
    if (!fromSocket && gameState.roomId) {
      // Send the exact target state to ensure everyone (including us via echo) sets the same value
      getSocket().emit("game-action", { roomId: gameState.roomId, action: "toggleReady", payload: { pos, explicitState: targetState } });

      // Save it to the database (only initiator does this)
      fetch(`/api/rooms/${gameState.roomId}/ready`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: pos, isReady: targetState })
      }).catch(err => console.error("Failed to save ready state", err));
    }

    setGameState(prev => {
      // Strictly use explicitState if provided (from socket), otherwise toggle.
      // This prevents the "double toggle" echo issue.
      const finalState = typeof explicitState === "boolean" ? explicitState : !prev.readyStatuses[pos];

      // If we are already at the target state, don't trigger a re-render
      if (prev.readyStatuses[pos] === finalState) return prev;

      const nextReady = { ...prev.readyStatuses, [pos]: finalState };
      return { ...prev, readyStatuses: nextReady };
    });
  }, [gameState.roomId, gameState.gameStarted, gameState.readyStatuses]);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCountdown = (initialCount?: number, startTime?: number) => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    const countAtStart = initialCount ?? 5;
    const startedAt = startTime ?? Date.now();

    setGameState(p => {
      const newState = { ...p, countdown: countAtStart, countdownStartedAt: startedAt };
      // Only sync to DB if this is a fresh start (not from hydration check)
      if (!startTime) syncStateToDb(newState);
      return newState;
    });

    let currentCount = countAtStart;
    countdownIntervalRef.current = setInterval(() => {
      currentCount--;
      if (currentCount <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        startGame();
      } else {
        setGameState(p => ({ ...p, countdown: currentCount }));
      }
    }, 1000);
  };

  const clearCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setGameState(p => {
      const newState = { ...p, countdown: null, countdownStartedAt: null };
      syncStateToDb(newState);
      return newState;
    });
  };

  const startGame = () => {
    setGameState(prev => {
      const newState: GameState = {
        ...prev,
        gameStarted: true,
        gameStatus: "waiting",
        countdown: null,
        diceValue: 0,
        countdownStartedAt: null,
        currentTurn: "top", // Начинает верхний игрок
        history: [], // Clear history on start
        turnTimer: 40,
        turnStartedAt: Date.now(),
        missedTurns: { top: 0, bottom: 0, left: 0, right: 0 },
        kickedPlayers: [],
        initialPlayerCount: prev.activePlayers.length
      };
      syncStateToDb(newState); // Everyone syncing this exact initial state is safe
      return newState;
    });
  };

  const addHistory = (msg: string) => {
    setGameState(prev => ({ ...prev, history: [msg, ...prev.history].slice(0, 50) }));
  };

  const switchTurn = (fromSocket = false) => {
    setGameState(prev => {
      const CLOCKWISE_ORDER: PlayerPosition[] = ["top", "right", "bottom", "left"];
      const currentIndex = CLOCKWISE_ORDER.indexOf(prev.currentTurn);
      let nextPos = prev.currentTurn;

      for (let i = 1; i <= 4; i++) {
        const checkPos = CLOCKWISE_ORDER[(currentIndex + i) % 4];
        if (prev.activePlayers.includes(checkPos)) {
          nextPos = checkPos;
          break;
        }
      }

      const newState: GameState = { ...prev, currentTurn: nextPos, diceValue: 0, gameStatus: "waiting", turnTimer: 40, turnStartedAt: Date.now() };

      if (!fromSocket) {
        // Broadcast the turn change instantly to all players via socket
        if (prev.roomId) {
          getSocket().emit("game-action", {
            roomId: prev.roomId,
            action: "switchTurn",
            payload: { nextTurn: nextPos }
          });
        }
        syncStateToDb(newState);
      }

      return newState;
    });
  };

  const handleTimeout = useCallback(() => {
    setGameState(prev => {
      const pos = prev.currentTurn;
      const newMissed = { ...prev.missedTurns, [pos]: prev.missedTurns[pos] + 1 };

      addHistory(`${prev.players[pos].name} ${t("timedOut")} (${newMissed[pos]}/2)`);

      if (newMissed[pos] >= 2) {
        // Player leaves the game
        addHistory(`${prev.players[pos].name} ${t("removedInactivity")}`);
        const nextActive = prev.activePlayers.filter(p => p !== pos);

        let newState: GameState;
        if (nextActive.length === 1) {
          newState = {
            ...prev,
            activePlayers: nextActive,
            winner: nextActive[0],
            gameStarted: false,
            missedTurns: newMissed,
            turnStartedAt: null,
            kickedPlayers: [...prev.kickedPlayers, pos],
            readyStatuses: { top: false, bottom: false, left: false, right: false }
          };
        } else {
          // Switch turn immediately after removal
          const CLOCKWISE_ORDER: PlayerPosition[] = ["top", "right", "bottom", "left"];
          const currentIndex = CLOCKWISE_ORDER.indexOf(pos);
          let nextPos = pos;
          for (let i = 1; i <= 4; i++) {
            const checkPos = CLOCKWISE_ORDER[(currentIndex + i) % 4];
            if (nextActive.includes(checkPos)) {
              nextPos = checkPos;
              break;
            }
          }
          newState = {
            ...prev,
            activePlayers: nextActive,
            currentTurn: nextPos,
            diceValue: 0,
            gameStatus: "waiting",
            turnTimer: 40,
            missedTurns: newMissed,
            turnStartedAt: Date.now(),
            kickedPlayers: [...prev.kickedPlayers, pos]
          };
        }

        if (prev.roomId) {
          getSocket().emit("game-action", { roomId: prev.roomId, action: "player-timeout-kick", payload: { kickedPos: pos, nextState: newState } });
        }
        syncStateToDb(newState);
        return newState;
      } else {
        // Just skip turn
        const CLOCKWISE_ORDER: PlayerPosition[] = ["top", "right", "bottom", "left"];
        const currentIndex = CLOCKWISE_ORDER.indexOf(pos);
        let nextPos = pos;
        for (let i = 1; i <= 4; i++) {
          const checkPos = CLOCKWISE_ORDER[(currentIndex + i) % 4];
          if (prev.activePlayers.includes(checkPos)) {
            nextPos = checkPos;
            break;
          }
        }

        const newState: GameState = { ...prev, currentTurn: nextPos, diceValue: 0, gameStatus: "waiting", turnTimer: 40, missedTurns: newMissed, turnStartedAt: Date.now() };
        if (prev.roomId) {
          getSocket().emit("game-action", { roomId: prev.roomId, action: "switchTurn", payload: { nextTurn: nextPos, missedTurns: newMissed } });
        }
        syncStateToDb(newState);
        return newState;
      }
    });
  }, [gameState.roomId, gameState.activePlayers]);

  // Turn Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (gameState.gameStarted && !gameState.isPaused && !gameState.winner) {
      interval = setInterval(() => {
        setGameState(prev => {
          if (prev.turnTimer <= 1) {
            if (interval) clearInterval(interval);

            // Only the active player (or the host if active player is gone) should trigger the handleTimeout
            // To keep it simple but safe: we check if WE are the active user.
            const activeUser = prev.connectedPlayers.find(p => p.position === prev.currentTurn);
            const isMyTurn = (session?.user as any)?.id === activeUser?.userId;

            // If the active user is not present at all, the first connected player handles it
            const isHostCheck = !activeUser && prev.connectedPlayers[0]?.userId === (session?.user as any)?.id;

            if (isMyTurn || isHostCheck) {
              // Trigger timeout via a separate call to avoid nested state updates in a clean way
              // Or just return the timed-out state. 
              // Actually, calling handleTimeout() inside setGameState is bad.
              // I'll use a ref to trigger it outside.
              return { ...prev, turnTimer: 0 };
            }
            return { ...prev, turnTimer: 0 };
          }
          return { ...prev, turnTimer: prev.turnTimer - 1 };
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState.gameStarted, gameState.isPaused, gameState.currentTurn, gameState.winner, session?.user]);

  // Separate effect to catch turnTimer === 0 and trigger logic
  useEffect(() => {
    if (gameState.turnTimer === 0 && gameState.gameStarted && !gameState.isPaused && !gameState.winner) {
      const activeUser = gameState.connectedPlayers.find(p => p.position === gameState.currentTurn);
      const isMyTurn = (session?.user as any)?.id === activeUser?.userId;
      const isHostCheck = !activeUser && gameState.connectedPlayers[0]?.userId === (session?.user as any)?.id;

      if (isMyTurn || isHostCheck) {
        handleTimeout();
      }
    }
  }, [gameState.turnTimer, gameState.gameStarted, gameState.isPaused, gameState.winner]);

  const isRollingRef = useRef(false);
  const animationFiredRef = useRef(false);
  const moveFiredRef = useRef(false);

  const rollDice = useCallback((fromSocket = false, forcedValue?: number) => {
    if (isRollingRef.current) return;
    if (gameState.isRolling && !fromSocket) return;

    isRollingRef.current = true;
    let val: number;
    if (!fromSocket) {
      val = Math.floor(Math.random() * 6) + 1;
      if (gameState.roomId) {
        getSocket().emit("game-action", { roomId: gameState.roomId, action: "rollDice", payload: { value: val } });
      }
    } else {
      if (forcedValue === undefined) { isRollingRef.current = false; return; }
      val = forcedValue;
    }

    animationFiredRef.current = false;
    setGameState(prev => ({ ...prev, isRolling: true, gameStatus: "rolling" }));

    setTimeout(() => {
      setGameState(current => {
        const alreadyFired = animationFiredRef.current;
        const player = current.players[current.currentTurn];
        const activeUser = current.connectedPlayers.find(p => p.position === current.currentTurn);
        const currentUserId = (session?.user as any)?.id;
        const isMyTurn = currentUserId && activeUser?.userId === currentUserId;

        let newState: GameState = {
          ...current,
          isRolling: false,
          gameStatus: "moving",
          diceValue: val,
          missedTurns: { ...current.missedTurns, [current.currentTurn]: 0 },
          turnTimer: val === 6 ? 40 : current.turnTimer,
          turnStartedAt: val === 6 ? Date.now() : current.turnStartedAt
        };

        if (!alreadyFired) {
          animationFiredRef.current = true;
          const logMsg = `${player.name} ${val}`;
          addHistory(logMsg);

          if (isMyTurn && !fromSocket) {
            const canMove = player.tokens.some(t => canTokenMove(t, val, current.players));
            console.log(`[rollDice] Result: ${val}, CanMove: ${canMove}`);

            if (!canMove && val !== 6) {
              console.log("[rollDice] No moves available, switching turn in 1.2s...");
              setTimeout(() => switchTurn(false), 1200);
            } else if (!canMove && val === 6) {
              console.log("[rollDice] 6 rolled but no moves possible, reset for re-roll.");
              setTimeout(() => {
                setGameState(s => {
                  const resetState: GameState = { ...s, diceValue: 0, gameStatus: "waiting" };
                  syncStateToDb(resetState);
                  return resetState;
                });
                if (current.roomId) {
                  getSocket().emit("game-action", { roomId: current.roomId, action: "roll-reset", payload: {} });
                }
              }, 1000);
            }
            syncStateToDb(newState);
          }
        }

        return newState;
      });

      isRollingRef.current = false;
    }, 800);
  }, [gameState.roomId, gameState.isRolling, gameState.players, gameState.currentTurn, gameState.connectedPlayers, session?.user]);

  // Logic moved to @/lib/gameLogic

  const moveToken = useCallback((tokenId: string, fromSocket = false) => {
    // Reset guard for ALL calls to ensure every move is processed by all clients
    moveFiredRef.current = false;

    if (!fromSocket && gameState.roomId) {
      // PRE-EMIT SECURITY CHECK
      const activeUser = gameState.connectedPlayers.find(p => p.position === gameState.currentTurn);
      const currentUserId = (session?.user as any)?.id;
      if (currentUserId !== activeUser?.userId) {
        console.warn("[moveToken] Prevented move: not your turn.");
        return;
      }
      getSocket().emit("game-action", { roomId: gameState.roomId, action: "moveToken", payload: { tokenId } });
    }

    setGameState(prev => {
      const alreadyFired = moveFiredRef.current;
      moveFiredRef.current = true;

      const playerPos = prev.currentTurn;
      const player = prev.players[playerPos];
      const token = player.tokens.find(t => t.id === tokenId);

      const activeUser = prev.connectedPlayers.find(p => p.position === prev.currentTurn);
      const currentUserId = (session?.user as any)?.id;
      const isMyMove = currentUserId && activeUser?.userId === currentUserId;

      if (fromSocket && isMyMove) return prev;
      if (!["waiting", "moving"].includes(prev.gameStatus) || prev.isRolling || !prev.gameStarted) return prev;
      if (!token || !canTokenMove(token, prev.diceValue, prev.players)) return prev;

      const { pos: rawPos, finished } = calculateNewPosition(token, prev.diceValue);
      const { pos: finalPos, effect } = applyBoardRules(rawPos);

      const updatedTokens = player.tokens.map(t =>
        t.id === tokenId
          ? { ...t, position: finished ? "finish" : finalPos, isAtHome: false, isFinished: finished }
          : t
      );

      let nextPlayersMap = { ...prev.players, [playerPos]: { ...player, tokens: updatedTokens } };

      const isSix = prev.diceValue === 6;
      const isFlight = effect === "flight";
      let hasCaptured = false;

      if (!finished) {
        // Resolve collisions at walk destination (rawPos)
        const { nextPlayers: nextAfterWalk, capturedNames: names1 } = resolveBoardCollisions(nextPlayersMap, rawPos, playerPos, tokenId);

        let allCaptured = [...names1];
        if (rawPos !== finalPos) {
          // Resolve collisions at final jump destination (finalPos)
          const { nextPlayers: nextAfterJump, capturedNames: names2 } = resolveBoardCollisions(nextAfterWalk, finalPos, playerPos, tokenId);
          nextPlayersMap = nextAfterJump;
          allCaptured = [...allCaptured, ...names2];
        } else {
          nextPlayersMap = nextAfterWalk;
        }

        // Only genuine captures (not shifts) give an extra roll
        hasCaptured = allCaptured.some(n => !n.startsWith("SHIFT:"));

        // Log all events (Shifts and Captures)
        allCaptured.forEach(name => {
          if (name.startsWith("SHIFT:")) {
            addHistory(name.replace("SHIFT:", ""));
          } else {
            addHistory(`${player.name} ${t("capturedMsg")} ${name}! ${t("extraRollMsg")}`);
          }
        });
      }

      const deservesExtraRoll = (isSix || isFlight || hasCaptured) && effect !== "return";

      // ONLY the player whose turn it is manages history and turn advancement
      if (!alreadyFired && isMyMove && !fromSocket) {
        // If it's a 6, a Flight, or a Capture, don't switch turn (player rolls again)
        if (!deservesExtraRoll) {
          setTimeout(() => switchTurn(false), 500);
        } else {
          if (isFlight) addHistory(`${player.name} ${t("landedOnFlight")} ${t("extraRollMsg")}`);
        }
      }

      const newState: GameState = {
        ...prev,
        players: nextPlayersMap,
        diceValue: 0,
        gameStatus: deservesExtraRoll ? "waiting" : "switching",
        // Reset missed turns for current player since they acted
        missedTurns: { ...prev.missedTurns, [playerPos]: 0 },
        // If they deserve an extra roll, reset timer
        turnTimer: deservesExtraRoll ? 40 : prev.turnTimer,
        turnStartedAt: deservesExtraRoll ? Date.now() : prev.turnStartedAt
      };

      // Winner detection: all 3 tokens must be on the positions 1K, 2K, 3K
      if (isWinConditionMet(nextPlayersMap[playerPos])) {
        const winMsg = `🏆 ${nextPlayersMap[playerPos].name} ${t("victoryMsg")}!`;
        newState.winner = playerPos;
        newState.gameStarted = false;
        // Reset readiness for the next game
        newState.readyStatuses = { top: false, bottom: false, left: false, right: false };
        newState.countdown = null;
        newState.countdownStartedAt = null;
        newState.history = [winMsg, ...newState.history].slice(0, 50);
      }

      if (!alreadyFired && isMyMove && !fromSocket) {
        syncStateToDb(newState);
      }

      return newState;
    });
  }, [gameState.roomId, gameState.gameStatus, gameState.isRolling, gameState.gameStarted, gameState.players, gameState.currentTurn, gameState.diceValue, gameState.activePlayers, session?.user]);

  const resetGame = () => { };

  // Unified Pause Countdown Handler
  // This effectively runs on both "fresh pause taken" and "rehydration from DB"
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (gameState.isPaused && gameState.pauseTimeLeft !== null && gameState.pauseTimeLeft > 0) {
      interval = setInterval(() => {
        setGameState(s => {
          if (s.pauseTimeLeft === null) return s;

          if (s.pauseTimeLeft <= 1) {
            if (interval) clearInterval(interval);
            const newState: GameState = { ...s, isPaused: false, pauseTimeLeft: null, pauseStartedAt: null, pausedBy: null };
            syncStateToDb(newState);
            return newState;
          }
          return { ...s, pauseTimeLeft: s.pauseTimeLeft - 1 };
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState.isPaused]); // Only trigger when isPaused flips

  // Initialize Socket.io - Stable version
  useEffect(() => {
    if (!gameState.roomId) return;
    const socket = getSocket();

    const onConnect = () => {
      console.log("Connected to socket");
      socket.emit("join-room", gameState.roomId);
    };

    const onUpdate = (data: any) => {
      const { action, payload } = data;

      switch (action) {
        case "rollDice":
          rollDiceRef.current(true, payload.value);
          break;
        case "switchTurn":
          // Directly apply the turn change to local state — fast, no DB roundtrip
          setGameState(prev => ({
            ...prev,
            currentTurn: payload.nextTurn,
            diceValue: 0,
            gameStatus: "waiting",
            turnTimer: 40,
            missedTurns: payload.missedTurns || prev.missedTurns
          }));
          break;
        case "moveToken":
          moveTokenRef.current(payload.tokenId, true);
          break;
        case "toggleReady":
          toggleReadyRef.current(payload.pos, true, payload.explicitState);
          break;
        case "togglePause":
          togglePauseRef.current(payload.pos, true, payload.explicitState);
          break;
        case "surrender":
          surrenderRef.current(payload.pos, true);
          break;
        case "player-timeout-kick":
          setGameState(payload.nextState);
          break;
        case "roll-reset":
          setGameState(prev => ({ ...prev, diceValue: 0 }));
          break;
        case "player-joined":
        case "player-left":
          // When someone joins or leaves, refresh the room data from DB
          refreshRoomData();
          break;
      }
    };

    socket.on("connect", onConnect);
    socket.on("game-update", onUpdate);

    // Initial join if already connected
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("game-update", onUpdate);
    };
  }, [gameState.roomId]);

  // Handle countdown trigger - Simple & Synchronized via stabilized socket
  useEffect(() => {
    if (gameState.gameStarted || gameState.winner || gameState.activePlayers.length === 0) return;

    // Check if room is full AND everyone is ready
    const isRoomFull = gameState.activePlayers.length === gameState.playerCount;
    const allReady = isRoomFull && gameState.activePlayers.every(p => gameState.readyStatuses[p]);

    if (allReady && countdownIntervalRef.current === null) {
      if (gameState.countdownStartedAt) {
        // Resume existing countdown
        console.log("DEBUG: Resuming countdown from DB...");
        const elapsedSeconds = Math.floor((Date.now() - gameState.countdownStartedAt) / 1000);
        const remaining = Math.max(0, 5 - elapsedSeconds);
        if (remaining > 0) {
          startCountdown(remaining, gameState.countdownStartedAt);
        } else {
          startGame();
        }
      } else if (gameState.countdown === null) {
        // Start fresh countdown
        console.log("DEBUG: Starting fresh countdown...");
        startCountdown();
      }
    } else if (!allReady && countdownIntervalRef.current !== null) {
      console.log("DEBUG: Conditions no longer met, clearing timer...");
      clearCountdown();
    }
  }, [gameState.readyStatuses, gameState.activePlayers, gameState.gameStarted, gameState.countdownStartedAt, gameState.countdown, gameState.playerCount]);

  return (
    <GameContext.Provider value={{ ...gameState, rollDice, moveToken, resetGame, toggleReady, togglePause, surrender, setRoomData, setRoomId, refreshRoomData }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within GameProvider");
  return context;
};
