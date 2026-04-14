import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfileContent } from "@/components/ProfileContent";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email! },
    include: {
      achievements: {
        include: {
          achievement: true
        }
      }
    }
  });

  if (!user) {
    redirect("/login");
  }

  // CATCH-UP LOGIC: Ensure user has achievements they deserve based on stats
  const milestones = [
    { id: "centurion", title: "Centurion", req: user.gamesPlayed >= 100 },
    { id: "victor", title: "Victor", req: user.wins >= 10 },
    { id: "veteran", title: "Battle Hardened", req: user.gamesPlayed >= 10 },
  ];

  let needsRefresh = false;
  for (const m of milestones) {
    if (m.req) {
      // Ensure achievement exists globally
      const ach = await prisma.achievement.upsert({
        where: { title: m.title },
        update: {},
        create: { title: m.title, description: `Achievement for ${m.title}` }
      });
      // Grant to user
      const existing = await prisma.userAchievement.findUnique({
        where: { userId_achievementId: { userId: user.id, achievementId: ach.id } }
      });
      if (!existing) {
        await prisma.userAchievement.create({
          data: { userId: user.id, achievementId: ach.id }
        });
        needsRefresh = true;
      }
    }
  }

  const finalUser = needsRefresh
    ? await prisma.user.findUnique({
      where: { id: user.id },
      include: { achievements: { include: { achievement: true } } }
    })
    : user;

  if (!finalUser) redirect("/login");

  return <ProfileContent user={finalUser} />;
}
