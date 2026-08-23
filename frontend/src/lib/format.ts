/**
 * Money helpers.
 *
 * The backend stores and returns every amount in **paise**. Rendering a paise
 * value straight into a "₹..." string shows a price 100x too high, which is
 * exactly what the order-tracking screen used to do. Route all money through
 * these helpers so the unit is explicit at every call site.
 */

/** Formats a paise amount as Indian rupees, e.g. 10499900 -> "₹1,04,999". */
export function formatPaise(paise: number | null | undefined): string {
  if (typeof paise !== 'number' || !Number.isFinite(paise)) return '₹0';
  return formatRupees(paise / 100);
}

/** Formats a rupee amount, e.g. 104999 -> "₹1,04,999". */
export function formatRupees(rupees: number | null | undefined): string {
  if (typeof rupees !== 'number' || !Number.isFinite(rupees)) return '₹0';
  return (
    '₹' +
    rupees.toLocaleString('en-IN', {
      minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
}

export const rupeesToPaise = (rupees: number): number => Math.round(rupees * 100);
