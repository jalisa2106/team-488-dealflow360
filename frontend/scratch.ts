import { prisma } from './src/lib/db/prisma';

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true }});
  console.log(users);
}
main();
