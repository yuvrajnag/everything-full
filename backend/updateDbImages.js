const { PrismaClient } = require('@prisma/client');
const mapping = require('./cloudinary-mapping.json');

const prisma = new PrismaClient();

async function updateDbImages() {
  console.log("Updating database images...");
  const images = await prisma.productImage.findMany();
  
  for (const img of images) {
    if (mapping[img.url]) {
      await prisma.productImage.update({
        where: { id: img.id },
        data: { url: mapping[img.url] }
      });
      console.log(`Updated image ${img.id} to ${mapping[img.url]}`);
    }
  }
  
  console.log("Database images updated!");
}

updateDbImages()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
