import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  /** Line id — product id plus the chosen variant, so configurations don't merge. */
  id: string;
  productId: string;
  /** Product slug, so a cart line can link back to the product page. */
  slug?: string;
  /**
   * The exact variant the customer picked. Sent to the backend so the price
   * they were shown is the price they are charged; without it the server fell
   * back to the base variant and silently billed a different amount.
   */
  variantId?: string;
  variantLabel?: string | null;
  title: string;
  /** Unit price in rupees. */
  price: number;
  priceString: string;
  imageUrl: string;
  quantity: number;
}

/** Hard cap per line, mirroring the backend's per-item limit. */
export const MAX_QUANTITY_PER_ITEM = 10;

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

const clampQuantity = (q: number) =>
  Math.max(1, Math.min(MAX_QUANTITY_PER_ITEM, Math.floor(Number.isFinite(q) ? q : 1)));

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === newItem.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === newItem.id
                  ? { ...i, ...newItem, quantity: clampQuantity(i.quantity + newItem.quantity) }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...newItem, quantity: clampQuantity(newItem.quantity) }] };
        }),

      removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, quantity: clampQuantity(quantity) } : i)),
        })),

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),
      totalPrice: () => get().items.reduce((total, item) => total + item.price * item.quantity, 0),
    }),
    {
      name: 'everything-cart',
      version: 2,
      /**
       * Carts persisted by an older build have no `variantId` and may carry a
       * config suffix baked into `id`. Drop those lines rather than checking
       * out with an unknown configuration at the wrong price.
       */
      migrate: (persisted: any, version) => {
        if (version >= 2) return persisted;
        return { ...(persisted ?? {}), items: [] };
      },
    }
  )
);
