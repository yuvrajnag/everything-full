import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Storage/RAM tiers offered on configurable products.
 * `extra` is the surcharge over the product's base price, in paise.
 *
 * These are real Variant rows so the price the customer sees on the product
 * page is the price the server charges. (Previously the surcharge existed only
 * in the React component and the backend always billed the base variant.)
 */
const CONFIG_TIERS = [
  { label: '12GB+256GB', extra: 0 },
  { label: '16GB+512GB', extra: 10_000_00 },
  { label: '24GB+1TB', extra: 25_000_00 },
] as const;

interface SeedProduct {
  id: string;
  brand: string;
  tag?: string;
  title: string;
  category: string;
  description: string;
  /** Rupees, as displayed in the catalogue. */
  price: string;
  /** Path under frontend/public. */
  imageUrl: string;
  hoverImageUrl?: string;
  hasConfig: boolean;
  /** Units on hand for each variant. */
  stock: number;
}

const rawProducts: SeedProduct[] = [
  { id: '1', brand: 'extreme', tag: 'NEW', title: 'EVERYTHING X', category: 'Devices', description: 'Next-level flagship performance and industry-leading cooling for unstoppable gaming.', price: '₹79,999', imageUrl: '/products/ex.png', hoverImageUrl: '/products/ex_poster.png', hasConfig: true, stock: 100 },
  { id: '2', brand: 'edge', tag: 'NEW', title: 'EVERYTHING EDGE', category: 'Devices', description: 'Designed to stay light while providing unbelievable power and performance.', price: '₹49,999', imageUrl: '/products/ee.png', hoverImageUrl: '/products/ee_poster.png', hasConfig: true, stock: 100 },
  { id: '13', brand: 'extreme', title: 'EVERYTHING PC', category: 'Computing', description: 'A powerhouse rig built for everything.', price: '₹1,49,999', imageUrl: '/products/ep.png', hoverImageUrl: '/products/ep_poster.png', hasConfig: true, stock: 40 },
  { id: '6', brand: 'edge', tag: 'UPCOMING', title: 'EVERYTHING LENS', category: 'Wearables', description: 'Crystal clear vision and augmented reality capabilities.', price: '₹29,999', imageUrl: '/products/es.png', hoverImageUrl: '/products/es_poster.png', hasConfig: false, stock: 0 },
  { id: '10', brand: 'extreme', title: 'EVERYTHING DISPLAY X1', category: 'Computing', description: 'High refresh rate monitor for competitive gamers.', price: '₹49,999', imageUrl: '/products/edx.png', hoverImageUrl: '/products/edx_f1.png', hasConfig: false, stock: 0 },
  { id: '8', brand: 'edge', title: 'EVERYTHING WATCH', category: 'Wearables', description: 'Keep track of your life and fitness on your wrist.', price: '₹14,999', imageUrl: '/products/ew.png', hoverImageUrl: '/products/ew_poster.png', hasConfig: false, stock: 100 },
  { id: '4', brand: 'edge', title: 'EVERYTHING HEADPHONES', category: 'Audio', description: 'Premium over-ear noise-canceling headphones.', price: '₹19,999', imageUrl: '/products/eh.png', hoverImageUrl: '/products/eh_poster.png', hasConfig: false, stock: 100 },
  { id: '11', brand: 'extreme', title: 'EVERYTHING KEYBOARD X1', category: 'Computing', description: 'Mechanical precision for the ultimate gaming setup.', price: '₹14,999', imageUrl: '/products/ekx.png', hoverImageUrl: '/products/ekx_poster.png', hasConfig: false, stock: 100 },
  { id: '7', brand: 'edge', title: 'EVERYTHING TAB', category: 'Devices', description: 'Vibrant display and massive battery for endless entertainment.', price: '₹39,999', imageUrl: '/products/et.png', hoverImageUrl: '/products/et_poster.png', hasConfig: true, stock: 100 },
  { id: '3', brand: 'edge', title: 'EVERYTHING EARPHONES', category: 'Audio', description: 'Immersive sound, deep bass, and comfortable fit.', price: '₹9,999', imageUrl: '/products/eee-v3.png', hoverImageUrl: '/products/eee_poster.png', hasConfig: false, stock: 100 },
  { id: '12', brand: 'extreme', title: 'EVERYTHING MOUSE X1', category: 'Computing', description: 'Ultra-lightweight wireless mouse with pinpoint accuracy.', price: '₹9,999', imageUrl: '/products/emx.png', hoverImageUrl: '/products/emx_poster.png', hasConfig: false, stock: 100 },
  { id: '9', brand: 'extreme', title: 'EVERYTHING BUDS', category: 'Audio', description: 'Extreme bass and low-latency audio for gaming.', price: '₹12,999', imageUrl: '/products/eb.png', hoverImageUrl: '/products/eb_poster.png', hasConfig: false, stock: 100 },
  { id: '5', brand: 'edge', title: 'EVERYTHING LAPTOP E1', category: 'Computing', description: 'Ultra-thin, lightweight, and powerful for professionals.', price: '₹89,999', imageUrl: '/products/el.png', hoverImageUrl: '/products/el_poster.png', hasConfig: true, stock: 60 },
];

const CATEGORIES = [
  { name: 'Devices', slug: 'devices' },
  { name: 'Computing', slug: 'computing' },
  { name: 'Wearables', slug: 'wearables' },
  { name: 'Audio', slug: 'audio' },
];

/** "₹1,49,999" -> 14999900 (paise). */
function rupeeStringToPaise(price: string): number {
  const digits = price.replace(/\D/g, '');
  if (!digits) throw new Error(`Unparseable price: ${price}`);
  return Number(digits) * 100;
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Variants a product should have, derived from its configuration options. */
function variantsFor(p: SeedProduct) {
  const basePrice = rupeeStringToPaise(p.price);
  if (!p.hasConfig) {
    return [{ sku: `SKU-${p.id}-DEFAULT`, price: basePrice, label: null as string | null, isDefault: true }];
  }
  return CONFIG_TIERS.map((tier, i) => ({
    sku: `SKU-${p.id}-${tier.label.replace(/[^A-Z0-9]+/gi, '')}`,
    price: basePrice + tier.extra,
    label: tier.label,
    isDefault: i === 0,
  }));
}

async function main() {
  console.log('Seeding database...');

  const categoryIds = new Map<string, string>();
  for (const cat of CATEGORIES) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: { slug: cat.slug },
      create: cat,
    });
    categoryIds.set(cat.name, created.id);
  }

  for (const p of rawProducts) {
    const basePrice = rupeeStringToPaise(p.price);
    const slug = toSlug(p.title);
    const categoryId = categoryIds.get(p.category);
    if (!categoryId) throw new Error(`Unknown category "${p.category}" on product ${p.title}`);

    // Upsert with a populated `update` so re-running the seed after a catalogue
    // edit actually applies it (the previous seed passed `update: {}`, so any
    // change to a product silently did nothing on a second run).
    const product = await prisma.product.upsert({
      where: { slug },
      update: {
        brand: p.brand,
        title: p.title,
        categoryId,
        description: p.description,
        basePrice,
        isConfigurable: p.hasConfig,
        tag: p.tag ?? null,
      },
      create: {
        id: p.id,
        slug,
        brand: p.brand,
        title: p.title,
        categoryId,
        description: p.description,
        basePrice,
        isConfigurable: p.hasConfig,
        tag: p.tag ?? null,
      },
    });

    // Images: replace wholesale so stale Cloudinary URLs from older seeds go away.
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.createMany({
      data: [
        { productId: product.id, url: p.imageUrl, alt: p.title, isPrimary: true },
        ...(p.hoverImageUrl
          ? [{ productId: product.id, url: p.hoverImageUrl, alt: p.title, isPrimary: false }]
          : []),
      ],
    });

    // Variants + inventory. Upserted by SKU so existing stock levels and any
    // order history referencing a variant survive a re-seed.
    for (const v of variantsFor(p)) {
      const variant = await prisma.variant.upsert({
        where: { sku: v.sku },
        update: { price: v.price, label: v.label, isDefault: v.isDefault, productId: product.id },
        create: {
          productId: product.id,
          sku: v.sku,
          price: v.price,
          label: v.label,
          isDefault: v.isDefault,
        },
      });

      await prisma.inventory.upsert({
        where: { variantId: variant.id },
        update: {},
        create: { variantId: variant.id, stockCount: p.stock, reserved: 0 },
      });

      if (v.label) {
        // Structured option rows so the variant is describable beyond its label.
        const [ram, storage] = v.label.split('+');
        await prisma.variantOption.deleteMany({ where: { variantId: variant.id } });
        await prisma.variantOption.createMany({
          data: [
            { variantId: variant.id, name: 'RAM', value: ram ?? '' },
            { variantId: variant.id, name: 'Storage', value: storage ?? '' },
          ],
        });
      }
    }

    console.log(`  ✓ ${product.title} (${variantsFor(p).length} variant(s), ${p.stock} in stock)`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(`Seed failed [${e.code}]: ${e.message}`);
    } else {
      console.error('Seed failed:', e);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
