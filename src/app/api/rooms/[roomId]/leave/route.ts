import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If game is in progress, also remove from gameState activePlayers
    const fullRoom = await prisma.room.findUnique({
      where: { id: roomId }
    });

    // Get player position BEFORE deletion to update gameState accurately
    const playerRecord = await prisma.roomPlayer.findFirst({
      where: { roomId, userId: user.id }
    });

    const { count } = await prisma.roomPlayer.deleteMany({
      where: { roomId, userId: user.id }
    });

    if (count > 0 && fullRoom && fullRoom.status === "playing" && fullRoom.gameState && playerRecord && playerRecord.position) {
      const pos = playerRecord.position as string;
      let gameState = typeof fullRoom.gameState === 'string' ? JSON.parse(fullRoom.gameState) : (fullRoom.gameState as any);

      // APPLY PENALTY FOR LEAVING DURING THE GAME
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            rating: { decrement: 50 },
            losses: { increment: 1 },
            gamesPlayed: { increment: 1 }
          }
        });
        console.log(`[RATING] User ${user.id} penalized -50 for leaving during game.`);
      } catch (err) {
        console.error("Failed to penalize leaver:", err);
      }

      // Remove from activePlayers and mark as kicked for final state sync
      gameState.activePlayers = gameState.activePlayers.filter((p: string) => p !== pos);
      if (!gameState.kickedPlayers) gameState.kickedPlayers = [];
      if (!gameState.kickedPlayers.includes(pos)) gameState.kickedPlayers.push(pos);

      // CRITICAL FIX: Clear the player data from the persistent players map
      if (pos && gameState.players && gameState.players[pos]) {
        gameState.players[pos] = {
          position: pos,
          name: "Waiting...",
          tokens: [],
          color: gameState.players[pos].color || "#ffffff"
        };
      }

      // If only one left, they win
      if (gameState.activePlayers.length === 1) {
        gameState.winner = gameState.activePlayers[0];
        gameState.gameStatus = "finished";
      } else if (gameState.currentTurn === pos) {
        // ... (existing switch turn logic)
        const CLOCKWISE_ORDER = ["top", "right", "bottom", "left"];
        const currentIndex = CLOCKWISE_ORDER.indexOf(pos);
        let nextPos = pos;
        for (let i = 1; i <= 4; i++) {
          const checkPos = CLOCKWISE_ORDER[(currentIndex + i) % 4];
          if (gameState.activePlayers.includes(checkPos)) {
            nextPos = checkPos;
            break;
          }
        }
        gameState.currentTurn = nextPos;
        gameState.diceValue = 0;
      }

      await prisma.room.update({
        where: { id: roomId },
        data: { gameState: gameState }
      });
    }

    if (count === 0) {
      return NextResponse.json({ message: "Player was not in the room" });
    }

    // Check if any players are left
    const remainingPlayers = await prisma.roomPlayer.count({
      where: { roomId: roomId }
    });

    // If no players left, delete the room
    if (remainingPlayers === 0) {
      await prisma.room.delete({
        where: { id: roomId }
      });
      return NextResponse.json({ message: "Player left and room deleted" });
    }

    // If the person leaving was the host, assign a new host
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { hostId: true }
    });

    if (room?.hostId === user.id) {
      const nextPlayer = await prisma.roomPlayer.findFirst({
        where: { roomId: roomId }
      });
      if (nextPlayer) {
        await prisma.room.update({
          where: { id: roomId },
          data: { hostId: nextPlayer.userId }
        });
      }
    }

    return NextResponse.json({ message: "Player left successfully" });
  } catch (error) {
    console.error("Failed to leave room:", error);
    return NextResponse.json({ error: "Failed to leave room" }, { status: 500 });
  }
}
