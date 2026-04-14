import { PrismaClient } from './src/generated/client/index.js';
const prisma = new PrismaClient();
async function main() {
  const rooms = await prisma.room.findMany();
  console.log(rooms.map(r => r.gameState ? 'Has state: ' + r.id : 'No state: ' + r.id));
}
main();
