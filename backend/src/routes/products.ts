import { Router } from 'express';
import { prisma } from '../db';
import redis from '../lib/redis';

const router = Router();

// Adapter to match existing frontend contract
const formatProduct = (p: any) => {
  const formatPrice = (paise: number) => {
    return '₹' + (paise / 100).toLocaleString('en-IN');
  };

  let primaryImage = p.images?.find((img: any) => img.isPrimary)?.url;
  let hoverImage = p.images?.find((img: any) => !img.isPrimary)?.url;

  if (primaryImage && primaryImage.includes('res.cloudinary.com')) {
     primaryImage = `/products/${primaryImage.split('/').pop()}`;
  }
  if (hoverImage && hoverImage.includes('res.cloudinary.com')) {
     hoverImage = `/products/${hoverImage.split('/').pop()}`;
  }

  return {
    id: p.id,
    brand: p.brand,
    tag: p.tag,
    title: p.title,
    category: p.category?.name || 'Unknown',
    description: p.description,
    price: p.basePrice / 100,
    priceString: formatPrice(p.basePrice),
    imageUrl: primaryImage,
    hoverImageUrl: hoverImage,
    hasConfig: p.isConfigurable
  };
};

router.get('/', async (req, res) => {
  try {
    const cached = await redis.get('products:all:v2');
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const products = await prisma.product.findMany({
      include: {
        category: true,
        images: true
      }
    });
    const mapped = products.map(formatProduct);
    
    await redis.setex('products:all:v2', 5 * 60, JSON.stringify(mapped)); // Cache for 5 mins
    res.json(mapped);
  } catch (error) {
    console.error('[ERROR] Fetch products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const cached = await redis.get(`product:${slug}:v2`);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        images: true,
        variants: {
          include: {
            inventory: true
          }
        }
      }
    });
    if (!product) {
       res.status(404).json({ error: 'Product not found' });
       return;
    }
    
    const formatted = formatProduct(product);
    await redis.setex(`product:${slug}:v2`, 5 * 60, JSON.stringify(formatted)); // Cache for 5 mins
    res.json(formatted);
  } catch (error) {
    console.error('[ERROR] Fetch product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

export default router;
