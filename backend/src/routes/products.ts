import { Router } from 'express';
import { prisma } from '../db';

const router = Router();

// Adapter to match existing frontend contract
const formatProduct = (p: any) => {
  const formatPrice = (paise: number) => {
    return '₹' + (paise / 100).toLocaleString('en-IN');
  };

  const primaryImage = p.images?.find((img: any) => img.isPrimary)?.url;
  const hoverImage = p.images?.find((img: any) => !img.isPrimary)?.url;

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
    const products = await prisma.product.findMany({
      include: {
        category: true,
        images: true
      }
    });
    const mapped = products.map(formatProduct);
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
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
    res.json(formatProduct(product));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

export default router;
