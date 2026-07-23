import type { ViewType } from './types.ts';

export interface AppRoute {
  view: ViewType;
  productKey: string | null;
  newsKey: string | null;
  searchQuery: string;
}

const STATIC_PATHS: Partial<Record<ViewType, string>> = {
  home: '/',
  about: '/about',
  products: '/products',
  services: '/services',
  news: '/news',
  gallery: '/gallery',
  contact: '/contact',
  faq: '/faq',
  search: '/search',
  admin: '/admin',
};

const safeSegment = (value: string): string | null => {
  try {
    const decoded = decodeURIComponent(value).trim();
    return decoded && !decoded.includes('/') ? decoded : null;
  } catch {
    return null;
  }
};

export function parseAppRoute(pathname?: string, search?: string): AppRoute {
  const resolvedPathname = pathname ?? (typeof window === 'undefined' ? '/' : window.location.pathname);
  const resolvedSearch = search ?? (typeof window === 'undefined' ? '' : window.location.search);
  const normalized = resolvedPathname.replace(/\/+$/, '') || '/';
  const productMatch = /^\/products\/([^/]+)$/.exec(normalized);
  if (productMatch) {
    return { view: 'product-detail', productKey: safeSegment(productMatch[1]), newsKey: null, searchQuery: '' };
  }

  const newsMatch = /^\/news\/([^/]+)$/.exec(normalized);
  if (newsMatch) {
    return { view: 'news', productKey: null, newsKey: safeSegment(newsMatch[1]), searchQuery: '' };
  }

  if (normalized === '/admin/reset-password' || normalized === '/admin') {
    return { view: 'admin', productKey: null, newsKey: null, searchQuery: '' };
  }

  const entry = Object.entries(STATIC_PATHS).find(([, path]) => path === normalized);
  const view = (entry?.[0] as ViewType | undefined) ?? 'home';
  const query = view === 'search' ? new URLSearchParams(resolvedSearch).get('q')?.trim() ?? '' : '';
  return { view, productKey: null, newsKey: null, searchQuery: query };
}

export function pathForView(view: ViewType): string {
  return STATIC_PATHS[view] ?? '/';
}

export function productPath(idOrSlug: string): string {
  return `/products/${encodeURIComponent(idOrSlug)}`;
}

export function newsPath(idOrSlug: string): string {
  return `/news/${encodeURIComponent(idOrSlug)}`;
}
