import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PROCEDURE_TYPES = [
  {
    code: 'service_sale',
    name: 'Service Sale',
    description: 'Sell a club service to a member (pilot procedure).',
  },
  {
    code: 'expense',
    name: 'Member Expense',
    description: 'Record a member expense with optional partial payments.',
  },
  {
    code: 'product_sale',
    name: 'Product Sale',
    description: 'Sell a product to a club member with optional payment.',
  },
  {
    code: 'member_debt',
    name: 'Member Debt',
    description: 'Create a free-form club member debt (debit) with optional payment of deadline.',
  },
  {
    code: 'membership',
    name: 'Membership',
    description: 'Register a club membership subscription with payment tracking.',
  },
  {
    code: 'course_subscription',
    name: 'Course Subscription',
    description: 'Subscribe a member to a course with payment and deadline management.',
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
