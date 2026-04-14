import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/DashboardContent";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email! },
    include: {
      achievements: {
        include: {
          achievement: true,
        },
      },
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
    },
  });

  if (!user) {
    redirect("/login");
  }

  return <DashboardContent user={user} />;
}
