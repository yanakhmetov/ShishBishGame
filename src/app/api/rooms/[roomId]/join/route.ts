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

    // Check if room exists and get player count
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        players: true
      }
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    const isAlreadyInRoom = room.players.find(p => p.userId === user.id);
    
    // Check if player's rating is sufficient (only for new players joining)
    if (!isAlreadyInRoom && action !== "sync" && user.rating < (room.minRating || 0)) {
      return NextResponse.json({ 
        error: `Your rating (${user.rating}) is below the required minimum (${room.minRating}) for this arena.` 
      }, { status: 403 });
    }

    // Only add to the room if they are not already in it AND this is a real join request (not just a state sync)
    if (!isAlreadyInRoom && action !== "sync") {
      // Check if room is full
      if (room.players.length >= room.maxPlayers) {
        return NextResponse.json({ error: "Room is full" }, { status: 400 });
      }

      // Find next available position
      const positions = ["top", "bottom", "right", "left"];
      const usedPositions = room.players.map(p => p.position);
      const availablePosition = positions.find(pos => !usedPositions.includes(pos)) || "bottom";

      // Add player to the room
      await prisma.roomPlayer.create({
        data: {
          roomId: roomId,
          userId: user.id,
          position: availablePosition,
          isReady: false
        }
      });
    }

    // Fetch room refreshed
    const updatedRoom = await prisma.room.findUnique({
      where: { id: roomId }
    });

    if (!updatedRoom) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Fetch players with users via direct queries to bypass adapter-pg join bugs
    const rawPlayers = await prisma.roomPlayer.findMany({
      where: { roomId: updatedRoom.id }
    });

    // Manually fetch each user based on userId
    const flattenedPlayers = await Promise.all(
      rawPlayers.map(async (p) => {
        const user = await prisma.user.findUnique({ 
          where: { id: p.userId },
          include: {
            achievements: {
              where: { isFeatured: true },
              include: { achievement: true }
            }
          }
        });
        
        console.log(`SERVER DEBUG: Direct User Fetch for ${p.userId} -> Name: ${user?.name}`);

        return {
          ...p,
          playerName: user?.name || user?.email?.split("@")[0] || `#${p.userId.slice(-4)}`,
          playerImage: user?.image || null,
          playerRating: user?.rating || 0,
          playerWins: user?.wins || 0,
          playerLosses: user?.losses || 0,
          playerGamesPlayed: user?.gamesPlayed || 0,
          playerFeaturedAchievements: user?.achievements?.map((a: any) => a.achievement.title) || [],
          playerAvatarX: user?.avatarX ?? 50,
          playerAvatarY: user?.avatarY ?? 50,
          playerAvatarZoom: user?.avatarZoom ?? 1.0
        };
      })
    );

    return NextResponse.json({ 
      message: "Joined room successfully", 
      room: { ...updatedRoom, players: flattenedPlayers } 
    });
  } catch (error) {
    console.error("Failed to join room:", error);
    return NextResponse.json({ error: "Failed to join room" }, { status: 500 });
  }
}
