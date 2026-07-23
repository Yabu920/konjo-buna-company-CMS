import type { Product } from './types.ts';

export function inquiryProductValues(products: Product[], productId: string): {
  product_id: string;
  coffee_type: string;
} {
  const product = products.find((candidate) => candidate.id === productId);
  return product
    ? { product_id: product.id, coffee_type: product.title_en }
    : { product_id: '', coffee_type: 'General Inquiry' };
}

