import type { NewsPost, Product, ViewType } from './types.ts';

interface ClientSeoOptions {
  view: ViewType;
  lang: 'en' | 'am';
  product?: Product;
  newsPost?: NewsPost;
}

const routeLabels: Record<'en' | 'am', Partial<Record<ViewType, { title: string; description: string }>>> = {
  en: {
    home: { title: 'Konjo Buna | Premium Ethiopian Coffee', description: 'Carefully selected Ethiopian coffee from Sidama, Yirgacheffe and other renowned origins.' },
    about: { title: 'About Konjo Buna', description: 'Learn about Konjo Buna, our Ethiopian coffee heritage, values and quality-focused processing.' },
    products: { title: 'Ethiopian Coffee Products | Konjo Buna', description: 'Explore Konjo Buna Ethiopian coffee products, origins, grades, processing and export availability.' },
    services: { title: 'Coffee Services | Konjo Buna', description: 'Discover Konjo Buna coffee processing, packaging, sourcing and export services.' },
    news: { title: 'Coffee News | Konjo Buna', description: 'Read the latest Konjo Buna company and Ethiopian coffee news.' },
    gallery: { title: 'Coffee Gallery | Konjo Buna', description: 'View Konjo Buna coffee products, processing, facilities and Ethiopian coffee culture.' },
    contact: { title: 'Contact and Export Inquiry | Konjo Buna', description: 'Contact Konjo Buna for Ethiopian coffee, wholesale and export inquiries.' },
    faq: { title: 'Frequently Asked Questions | Konjo Buna', description: 'Answers to common questions about Konjo Buna coffee products and export services.' },
    search: { title: 'Search | Konjo Buna', description: 'Search Konjo Buna products, services and news.' },
    admin: { title: 'CMS Admin | Konjo Buna', description: 'Secure Konjo Buna content administration.' },
  },
  am: {
    home: { title: 'ኮንጆ ቡና | ከፍተኛ ጥራት ያለው የኢትዮጵያ ቡና', description: 'በጥንቃቄ የተመረጠ ከፍተኛ ጥራት ያለው የኢትዮጵያ ቡና።' },
    about: { title: 'ስለ ኮንጆ ቡና', description: 'ስለ ኮንጆ ቡና ታሪክ፣ እሴቶች እና የጥራት ሂደት ይወቁ።' },
    products: { title: 'የቡና ምርቶች | ኮንጆ ቡና', description: 'የኮንጆ ቡና ምርቶችን፣ አመጣጥን እና የኤክስፖርት መረጃን ይመልከቱ።' },
    services: { title: 'የቡና አገልግሎቶች | ኮንጆ ቡና', description: 'የቡና ማቀነባበር፣ ማሸግ እና ኤክስፖርት አገልግሎቶች።' },
    news: { title: 'የቡና ዜና | ኮንጆ ቡና', description: 'የኮንጆ ቡና እና የኢትዮጵያ ቡና ዜናዎች።' },
    gallery: { title: 'የፎቶ ማዕከል | ኮንጆ ቡና', description: 'የኮንጆ ቡና ምርቶችን፣ ሂደቶችን እና ባህልን በፎቶ ይመልከቱ።' },
    contact: { title: 'ያግኙን | ኮንጆ ቡና', description: 'ለቡና እና ለኤክስፖርት ጥያቄ ኮንጆ ቡናን ያግኙ።' },
    faq: { title: 'ተደጋጋሚ ጥያቄዎች | ኮንጆ ቡና', description: 'ስለ ኮንጆ ቡና ምርቶች እና አገልግሎቶች መልሶች።' },
    search: { title: 'ፍለጋ | ኮንጆ ቡና', description: 'የኮንጆ ቡና ምርቶችን፣ አገልግሎቶችን እና ዜናዎችን ይፈልጉ።' },
    admin: { title: 'የይዘት አስተዳደር | ኮንጆ ቡና', description: 'ደህንነቱ የተጠበቀ የኮንጆ ቡና ይዘት አስተዳደር።' },
  },
};

const setMeta = (selector: string, attribute: 'content' | 'href', value: string) => {
  const element = document.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (element) element.setAttribute(attribute, value);
};

export function updateClientSeo({ view, lang, product, newsPost }: ClientSeoOptions): void {
  const fallback = routeLabels[lang][view] ?? routeLabels[lang].home!;
  const title = product
    ? `${lang === 'en' ? product.title_en : product.title_am} | Konjo Buna`
    : newsPost
      ? `${lang === 'en' ? newsPost.title_en : newsPost.title_am} | Konjo Buna`
      : fallback.title;
  const description = product
    ? (lang === 'en' ? product.description_en : product.description_am)
    : newsPost
      ? (lang === 'en' ? newsPost.excerpt_en : newsPost.excerpt_am)
      : fallback.description;
  const canonical = `${window.location.origin}${window.location.pathname}`;

  document.title = title;
  document.documentElement.lang = lang;
  setMeta('meta[name="description"]', 'content', description);
  setMeta('link[rel="canonical"]', 'href', canonical);
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[property="og:url"]', 'content', canonical);
  setMeta('meta[name="twitter:title"]', 'content', title);
  setMeta('meta[name="twitter:description"]', 'content', description);
}

