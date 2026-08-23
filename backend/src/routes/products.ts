import { Router } from 'express';
import { prisma } from '../db';
import { redisTry } from '../lib/redis';

const router = Router();

/** Stock is cached briefly; checkout is always the authoritative check. */
const CACHE_TTL_SECONDS = 60;
const CACHE_VERSION = 'v3';

/**
 * Product shape consumed by the storefront.
 *
 * `pricePaise` is authoritative; `price` (rupees) and `priceString` are
 * conveniences for display. Live inventory is included so the UI can disable
 * "Add to cart" for genuinely sold-out items instead of relying on a hardcoded
 * "OUT OF STOCK" tag baked into the seed data.
 */
const formatPrice = (paise: number) => '₹' + (paise / 100).toLocaleString('en-IN');

const formatVariant = (v: any) => ({
  id: v.id,
  sku: v.sku,
  label: v.label,
  isDefault: v.isDefault,
  pricePaise: v.price,
  price: v.price / 100,
  priceString: formatPrice(v.price),
  stockAvailable: Math.max(0, (v.inventory?.stockCount ?? 0) - (v.inventory?.reserved ?? 0)),
});

const formatProduct = (p: any) => {
  const primaryImage = p.images?.find((img: any) => img.isPrimary)?.url ?? p.images?.[0]?.url ?? null;
  const hoverImage = p.images?.find((img: any) => !img.isPrimary)?.url ?? null;

  const variants = (p.variants ?? []).map(formatVariant);
  const defaultVariant = variants.find((v: any) => v.isDefault) ?? variants[0] ?? null;
  const stockAvailable = variants.reduce((sum: number, v: any) => sum + v.stockAvailable, 0);

  return {
    id: p.id,
    slug: p.slug,
    brand: p.brand,
    tag: p.tag,
    title: p.title,
    category: p.category?.name || 'Unknown',
    description: p.description,
    pricePaise: defaultVariant?.pricePaise ?? p.basePrice,
    price: (defaultVariant?.pricePaise ?? p.basePrice) / 100,
    priceString: formatPrice(defaultVariant?.pricePaise ?? p.basePrice),
    imageUrl: toLocalImagePath(primaryImage),
    hoverImageUrl: toLocalImagePath(hoverImage),
    hasConfig: p.isConfigurable,
    variants,
    defaultVariantId: defaultVariant?.id ?? null,
    stockAvailable,
    inStock: stockAvailable > 0,
    /** Announced but not yet purchasable. */
    isUpcoming: p.tag === 'UPCOMING',
  };
};

/**
 * Older seeds stored absolute Cloudinary URLs; the storefront serves these
 * images from `public/products`. Normalising here means the three separate
 * copies of this rewrite that used to live in the frontend are unnecessary.
 */
function toLocalImagePath(url: string | null): string | null {
  if (!url) return null;
  if (url.includes('res.cloudinary.com')) {
    return `/products/${url.split('/').pop()}`;
  }
  return url;
}

const PRODUCT_INCLUDE = {
  category: true,
  images: true,
  variants: { include: { inventory: true }, orderBy: { price: 'asc' } },
} as const;

router.get('/', async (_req, res) => {
  try {
    const cacheKey = `products:all:${CACHE_VERSION}`;
    const cached = await redisTry((c) => c.get(cacheKey), null);
    if (cached) {
      try {
        res.json(JSON.parse(cached));
        return;
      } catch {
        // Corrupt cache entry — fall through and rebuild it.
      }
    }

    const products = await prisma.product.findMany({
      include: PRODUCT_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
    const mapped = products.map(formatProduct);

    await redisTry((c) => c.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(mapped)), null);
    res.json(mapped);
  } catch (error) {
    console.error('[ERROR] Fetch products:', error);
    res.status(500).json({ error: 'Could not load products.', code: 'PRODUCTS_FETCH_FAILED' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    if (!slug || slug.length > 200) {
      res.status(400).json({ error: 'Invalid product', code: 'INVALID_SLUG' });
      return;
    }

    const cacheKey = `product:${slug}:${CACHE_VERSION}`;
    const cached = await redisTry((c) => c.get(cacheKey), null);
    if (cached) {
      try {
        res.json(JSON.parse(cached));
        return;
      } catch {
        // Corrupt cache entry — fall through and rebuild it.
      }
    }

    const product = await prisma.product.findUnique({
      where: { slug },
      include: PRODUCT_INCLUDE,
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
      return;
    }

    const formatted = formatProduct(product);
    await redisTry((c) => c.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(formatted)), null);
    res.json(formatted);
  } catch (error) {
    console.error('[ERROR] Fetch product:', error);
    res.status(500).json({ error: 'Could not load this product.', code: 'PRODUCT_FETCH_FAILED' });
  }
});

export default router;
