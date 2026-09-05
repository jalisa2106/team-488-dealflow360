const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const res = await prisma.quote.findUniqueOrThrow({
      where: { id: "17BE2F91-7F01-4DFA-A8DB-459991CA895D" },
      include: {
        customer: { include: { tier: true } },
        salesRep: { select: { id: true, name: true, role: true, email: true } },
        quoteLines: {
          include: {
            product: { include: { category: true } },
            subscriptionPlan: true,
          },
        },
        approvalRequests: {
          orderBy: { step: 'asc' },
          include: {
            reviewer: { select: { id: true, name: true, role: true } },
            actions: { orderBy: { createdAt: 'desc' } },
          },
        },
        negotiations: {
          orderBy: { createdAt: 'desc' },
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        },
      },
    });
    console.log('Success:', res.id);
  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
