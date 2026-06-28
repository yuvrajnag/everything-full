import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const rawProducts = [
  { id: "1", brand: "extreme", tag: "NEW", title: "EVERYTHING X", category: "Devices", description: "Next-level flagship performance and industry-leading cooling for unstoppable gaming.", price: "₹79,999", imageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647289/everything_store/products/ex.png", hoverImageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647301/everything_store/products/ex_poster.png", hasConfig: true },
  { id: "2", brand: "edge", tag: "NEW", title: "EVERYTHING EDGE", category: "Devices", description: "Designed to stay light while providing unbelievable power and performance.", price: "₹49,999", imageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647239/everything_store/products/ee.png", hoverImageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647249/everything_store/products/ee_poster.png", hasConfig: true },
  { id: "13", brand: "extreme", title: "EVERYTHING PC", category: "Computing", description: "A powerhouse rig built for everything.", price: "₹1,49,999", imageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647270/everything_store/products/ep.png", hoverImageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647273/everything_store/products/ep_poster.png", hasConfig: true },
  { id: "6", brand: "edge", tag: "UPCOMING", title: "EVERYTHING LENS", category: "Wearables", description: "Crystal clear vision and augmented reality capabilities.", price: "₹29,999", imageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647274/everything_store/products/es.png", hoverImageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647278/everything_store/products/es_poster.png", hasConfig: false },
  { id: "10", brand: "extreme", tag: "OUT OF STOCK", title: "EVERYTHING DISPLAY X1", category: "Computing", description: "High refresh rate monitor for competitive gamers.", price: "₹49,999", imageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647236/everything_store/products/edx.png", hasConfig: false },
  { id: "8", brand: "edge", title: "EVERYTHING WATCH", category: "Wearables", description: "Keep track of your life and fitness on your wrist.", price: "₹14,999", imageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647285/everything_store/products/ew.png", hoverImageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647287/everything_store/products/ew_poster.png", hasConfig: false },
  { id: "4", brand: "edge", title: "EVERYTHING HEADPHONES", category: "Audio", description: "Premium over-ear noise-canceling headphones.", price: "₹19,999", imageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647250/everything_store/products/eh.png", hoverImageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647252/everything_store/products/eh_poster.png", hasConfig: false },
  { id: "11", brand: "extreme", title: "EVERYTHING KEYBOARD X1", category: "Computing", description: "Mechanical precision for the ultimate gaming setup.", price: "₹14,999", imageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647254/everything_store/products/ekx.png", hoverImageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647260/everything_store/products/ekx_poster.png", hasConfig: false },
  { id: "7", brand: "edge", title: "EVERYTHING TAB", category: "Devices", description: "Vibrant display and massive battery for endless entertainment.", price: "₹39,999", imageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647280/everything_store/products/et.png", hoverImageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647283/everything_store/products/et_poster.png", hasConfig: true },
  { id: "3", brand: "edge", title: "EVERYTHING EARPHONES", category: "Audio", description: "Immersive sound, deep bass, and comfortable fit.", price: "₹9,999", imageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647241/everything_store/products/eee-v3.png", hoverImageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647245/everything_store/products/eee_poster.png", hasConfig: false },
  { id: "12", brand: "extreme", title: "EVERYTHING MOUSE X1", category: "Computing", description: "Ultra-lightweight wireless mouse with pinpoint accuracy.", price: "₹9,999", imageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647267/everything_store/products/emx.png", hoverImageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647268/everything_store/products/emx_poster.png", hasConfig: false },
  { id: "9", brand: "extreme", title: "EVERYTHING BUDS", category: "Audio", description: "Extreme bass and low-latency audio for gaming.", price: "₹12,999", imageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647231/everything_store/products/eb.png", hoverImageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647234/everything_store/products/eb_poster.png", hasConfig: false },
  { id: "5", brand: "edge", title: "EVERYTHING LAPTOP E1", category: "Computing", description: "Ultra-thin, lightweight, and powerful for professionals.", price: "₹89,999", imageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647262/everything_store/products/el.png", hoverImageUrl: "https://res.cloudinary.com/drpczmiay/image/upload/v1782647266/everything_store/products/el_poster.png", hasConfig: true },
];

async function main() {
  console.log("Seeding database...");
  
  // Create categories map
  const categories = ["Devices", "Computing", "Wearables", "Audio"];
  const categoryMap = new Map();
  
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { name: cat },
      update: {},
      create: { name: cat, slug: cat.toLowerCase() }
    });
    categoryMap.set(cat, created.id);
  }

  for (const p of rawProducts) {
    const basePrice = parseInt(p.price.replace(/\D/g, '')) * 100; // in paise
    const slug = p.title.toLowerCase().replace(/\s+/g, '-');
    
    // Create product
    const product = await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        id: p.id,
        slug,
        brand: p.brand,
        title: p.title,
        categoryId: categoryMap.get(p.category),
        description: p.description,
        basePrice,
        isConfigurable: p.hasConfig,
        tag: p.tag || null,
        images: {
          create: [
            { url: p.imageUrl, isPrimary: true },
            ...(p.hoverImageUrl ? [{ url: p.hoverImageUrl, isPrimary: false }] : [])
          ]
        },
        variants: {
          create: [
            {
              sku: `SKU-${p.id}-DEFAULT`,
              price: basePrice,
              inventory: {
                create: {
                  stockCount: p.tag === "OUT OF STOCK" ? 0 : 100,
                  reserved: 0
                }
              }
            }
          ]
        }
      }
    });
    console.log(`Created product: ${product.title}`);
  }
  
  console.log("Seeding finished.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
