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

    const { name, image, avatarX, avatarY, avatarZoom } = await request.json();

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: name || undefined,
        image: image || undefined,
        avatarX: avatarX !== undefined ? Number(avatarX) : undefined,
        avatarY: avatarY !== undefined ? Number(avatarY) : undefined,
        avatarZoom: avatarZoom !== undefined ? Number(avatarZoom) : undefined
      },
    });

    return NextResponse.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        image: updatedUser.image,
      },
    });
  } catch (error) {
    console.error("CRITICAL: Failed to update profile:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
