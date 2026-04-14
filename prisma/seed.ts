import { PrismaClient } from "../src/generated/client/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const achievements = [
    { title: "First Win", description: "Won your first game of Shish-Bish" },
    { title: "Grandmaster", description: "Reach a rating of 2000" },
    { title: "Streak", description: "Win 5 games in a row" },
  ];

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { title: achievement.title },
      update: {},
      create: achievement,
    });
  }

  console.log("Seed finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
