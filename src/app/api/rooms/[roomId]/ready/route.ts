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

    const { position, isReady } = await request.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update readiness in logic
    const player = await prisma.roomPlayer.findUnique({
      where: {
        roomId_userId: {
          roomId: roomId,
          userId: user.id
        }
      }
    });

    if (!player) {
      return NextResponse.json({ error: "Player not in room" }, { status: 404 });
    }

    await prisma.roomPlayer.update({
      where: { id: player.id },
      data: { isReady }
    });

    return NextResponse.json({ message: "Readiness updated" });
  } catch (error) {
    console.error("Failed to update readiness:", error);
    return NextResponse.json({ error: "Failed to update readiness" }, { status: 500 });
  }
}
