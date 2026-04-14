import { prisma } from './src/lib/prisma';

async function main() {
  const users = await prisma.user.findMany();
  console.log("All Users:", users);
  
  const players = await prisma.roomPlayer.findMany({ include: { user: true } });
  console.log("All Players:", players);
}

main().catch(console.error).finally(() => prisma.$disconnect());
