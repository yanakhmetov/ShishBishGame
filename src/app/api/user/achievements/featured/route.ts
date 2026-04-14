import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { achievementId, isFeatured } = await request.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { achievements: true }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Count currently featured
    const featuredCount = user.achievements.filter(a => a.isFeatured).length;

    if (isFeatured && featuredCount >= 3) {
      return NextResponse.json({ error: "You can only feature up to 3 achievements" }, { status: 400 });
    }

    await prisma.userAchievement.update({
      where: {
        userId_achievementId: {
          userId: user.id,
          achievementId: achievementId
        }
      },
      data: { isFeatured: isFeatured }
    });

    return NextResponse.json({ message: "Achievement status updated" });
  } catch (error) {
    console.error("Failed to update featured achievement:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
