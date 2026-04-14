import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/rooms - List all waiting rooms
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawSearch = searchParams.get("search") || "";
    
    let whereClause: any = { status: "waiting" };
    
    if (rawSearch) {
      if (rawSearch.startsWith("#")) {
        const idSearch = rawSearch.substring(1).toUpperCase();
        whereClause.shortId = { equals: idSearch };
      } else {
        whereClause.name = { contains: rawSearch, mode: "insensitive" };
      }
    }

    const rooms = await prisma.room.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { players: true }
        },
        host: {
          select: { 
            name: true,
            image: true,
            avatarX: true,
            avatarY: true,
            avatarZoom: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error("Failed to fetch rooms:", error);
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 });
  }
}

// POST /api/rooms - Create a new room
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, maxPlayers, minRating, type, password } = body;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if room name already exists
    const existingRoom = await prisma.room.findUnique({
      where: { name }
    });

    if (existingRoom) {
      return NextResponse.json({ error: "An arena with this name already exists" }, { status: 400 });
    }

    // Generate a unique 6-character code
    const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create room and add host as the first player
    const room = await prisma.room.create({
      data: {
        name,
        shortId,
        maxPlayers: maxPlayers || 4,
        minRating: minRating || 0,
        type: type || "public",
        password,
        hostId: user.id,
        players: {
          create: {
            userId: user.id,
            position: "top",
            isReady: true
          }
        }
      }
    });

    // Fetch host details and flatten via direct user fetch
    const rawPlayers = await prisma.roomPlayer.findMany({
      where: { roomId: room.id }
    });

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

    return NextResponse.json({ ...room, players: flattenedPlayers });
  } catch (error) {
    console.error("Failed to create room:", error);
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
