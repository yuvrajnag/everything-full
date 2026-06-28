import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Please provide the email address of the user to promote.");
    console.error("Usage: npx ts-node src/promoteAdmin.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.error(`User with email ${email} not found.`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { email },
    data: { role: 'ADMIN' }
  });

  console.log(`✅ Success! User ${email} has been promoted to ADMIN.`);
  console.log(`They can now access the Admin Dashboard at /admin`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
