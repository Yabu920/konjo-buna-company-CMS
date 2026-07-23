export interface SeoDocument {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl?: string;
  type?: 'website' | 'product' | 'article';
  noIndex?: boolean;
  structuredData?: Record<string, unknown>[];
}

const escapeAttribute = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const safeJson = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c');

export function canonicalBaseUrl(configured: string | undefined, fallback: string): string {
  try {
    const url = new URL(configured?.trim() || fallback);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Unsupported protocol');
    return url.toString().replace(/\/$/, '');
  } catch {
    return fallback.replace(/\/$/, '');
  }
}

export function absolutePublicUrl(value: string | undefined, baseUrl: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value, `${baseUrl}/`).toString();
  } catch {
    return undefined;
  }
}

export function organizationStructuredData(baseUrl: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Konjo Buna',
    url: baseUrl,
    logo: `${baseUrl}/favicon.svg`,
  };
}

export function breadcrumbStructuredData(baseUrl: string, crumbs: Array<{ name: string; path: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${baseUrl}${crumb.path}`,
    })),
  };
}

export function injectSeoDocument(indexHtml: string, seo: SeoDocument): string {
  const image = seo.imageUrl ? `<meta property="og:image" content="${escapeAttribute(seo.imageUrl)}" />\n<meta name="twitter:image" content="${escapeAttribute(seo.imageUrl)}" />` : '';
  const robots = seo.noIndex ? '<meta name="robots" content="noindex,nofollow" />' : '<meta name="robots" content="index,follow" />';
  const structuredData = (seo.structuredData ?? [])
    .map((entry) => `<script type="application/ld+json">${safeJson(entry)}</script>`)
    .join('\n');
  const head = [
    `<meta name="description" content="${escapeAttribute(seo.description)}" />`,
    `<link rel="canonical" href="${escapeAttribute(seo.canonicalUrl)}" />`,
    '<meta property="og:site_name" content="Konjo Buna" />',
    `<meta property="og:type" content="${seo.type === 'article' ? 'article' : seo.type === 'product' ? 'product' : 'website'}" />`,
    `<meta property="og:title" content="${escapeAttribute(seo.title)}" />`,
    `<meta property="og:description" content="${escapeAttribute(seo.description)}" />`,
    `<meta property="og:url" content="${escapeAttribute(seo.canonicalUrl)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeAttribute(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttribute(seo.description)}" />`,
    image,
    robots,
    structuredData,
  ].filter(Boolean).join('\n');

  return indexHtml
    .replace(/<title>.*?<\/title>/i, `<title>${escapeAttribute(seo.title)}</title>`)
    .replace('<!-- SEO_HEAD -->', head);
}

export function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
