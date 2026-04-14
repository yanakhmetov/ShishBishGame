import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gameState = await request.json();

    // Use updateMany for an ATOMIC check-and-set of the room status
    // This ensures that the rating logic only runs ONCE for the transition to "finished"
    const updateResult = await prisma.room.updateMany({
      where: {
        id: roomId,
        status: { not: "finished" }
      },
      data: {
        gameState: gameState,
        status: gameState.winner ? "finished" : (gameState.gameStarted ? "playing" : "waiting")
      }
    });

    // If we successfully updated from non-finished to something else, AND there is a winner
    if (updateResult.count > 0 && gameState.winner) {
      console.log(`[RATING] Game JUST finished in room ${roomId}. Processing rewards...`);
      
      // Fetch the room with players to know who to reward
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { players: true }
      });

      if (room) {
        const initialCount = gameState.initialPlayerCount || room.maxPlayers || 2;
        const winReward = initialCount === 2 ? 20 : (initialCount === 3 ? 30 : 40);

        for (const p of room.players) {
          const pos = p.position as string;
          let ratingChange = -10;
          let winBonus = 0;
          let lossBonus = 1;

          if (pos === gameState.winner) {
            ratingChange = winReward;
            winBonus = 1;
            lossBonus = 0;
          } else if (gameState.kickedPlayers?.includes(pos)) {
            ratingChange = -50;
          }

          try {
            const updated = await prisma.user.update({
              where: { id: p.userId },
              data: {
                rating: { increment: ratingChange },
                wins: { increment: winBonus },
                losses: { increment: lossBonus },
                gamesPlayed: { increment: 1 }
              }
            });

            // CHECK ACHIEVEMENTS
            const milestones = [
              { id: "centurion", title: "Centurion", req: updated.gamesPlayed >= 100 },
              { id: "victor", title: "Victor", req: updated.wins >= 10 },
              { id: "veteran", title: "Battle Hardened", req: updated.gamesPlayed >= 10 },
            ];

            for (const m of milestones) {
              if (m.req) {
                 // Ensure achievement exists
                 const ach = await prisma.achievement.upsert({
                   where: { title: m.title },
                   update: {},
                   create: { title: m.title, description: `Achievement for ${m.title}` }
                 });
                 // Grant to user if not already earned
                 await prisma.userAchievement.upsert({
                   where: { userId_achievementId: { userId: p.userId, achievementId: ach.id } },
                   update: {},
                   create: { userId: p.userId, achievementId: ach.id }
                 });
              }
            }

            console.log(`[RATING] OK: ${p.userId} (${pos}) updated.`);
          } catch (uErr) {
            console.error(`[RATING] ERR: ${p.userId}:`, uErr);
          }
        }
      }
    }

    return NextResponse.json({ message: "Game state processed", updated: updateResult.count > 0 });

    return NextResponse.json({ message: "Game state saved successfully", status: updatedRoom.status });
  } catch (error) {
    console.error("Failed to save game state:", error);
    return NextResponse.json({ error: "Failed to save game state" }, { status: 500 });
  }
}
