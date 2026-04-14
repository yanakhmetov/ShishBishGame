import { prisma } from './src/lib/prisma';
async function main() {
  const rooms = await prisma.room.findMany();
  console.log(rooms.map((r: any) => r.gameState ? 'Has state: ' + r.id : 'No state: ' + r.id));
}
main();
