import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PROCEDURE_TYPES = [
  {
    code: 'service_sale',
    name: 'Service Sale',
    description: 'Sell a club service to a member (pilot procedure).',
  },
];

async function main() {
  for (const item of PROCEDURE_TYPES) {
    await prisma.procedureType.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        description: item.description,
        isActive: true,
      },
      create: item,
    });
    console.log(`Seeded procedure type: ${item.code}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
