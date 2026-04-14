import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        roomsJoined: {
          where: {
            room: {
              status: { in: ["waiting", "playing"] }
            }
          },
          include: {
            room: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const activeRoom = user.roomsJoined[0]?.room || null;

    return NextResponse.json({ room: activeRoom });
  } catch (error) {
    console.error("Failed to fetch active session:", error);
    return NextResponse.json({ error: "Failed to fetch active session" }, { status: 500 });
  }
}
