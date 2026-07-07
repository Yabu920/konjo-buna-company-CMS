export interface ProductCategory {
  id: string;
  slug: string;
  name_en: string;
  name_am: string;
  description_en: string;
  description_am: string;
}

export interface Product {
  id: string;
  category_id: string;
  slug: string;
  title_en: string;
  title_am: string;
  description_en: string;
  description_am: string;
  content_en: string;
  content_am: string;
  origin_en: string;
  origin_am: string;
  grade_en: string;
  grade_am: string;
  processing_en: string;
  processing_am: string;
  packaging_en: string;
  packaging_am: string;
  availability_en: string;
  availability_am: string;
  price_en: string;
  price_am: string;
  image_url: string;
  elevation: string;
  is_featured: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  slug: string;
  title_en: string;
  title_am: string;
  description_en: string;
  description_am: string;
  content_en: string;
  content_am: string;
  icon_name: string;
  image_url: string;
}

export interface NewsPost {
  id: string;
  slug: string;
  title_en: string;
  title_am: string;
  excerpt_en: string;
  excerpt_am: string;
  content_en: string;
  content_am: string;
  category_en: string;
  category_am: string;
  image_url: string;
  author_en: string;
  author_am: string;
  published_at: string;
}

export interface GalleryImage {
  id: string;
  category_en: string;
  category_am: string;
  title_en: string;
  title_am: string;
  image_url: string;
  description_en: string;
  description_am: string;
}

export interface Inquiry {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  country: string;
  product_id: string;
  coffee_type: string;
  volume_required: string;
  target_price: string;
  message: string;
  status: 'new' | 'contacted' | 'resolved' | 'archived';
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  created_at: string;
}

export interface SiteSettings {
  key: string;
  value_en: string;
  value_am: string;
}

export type ViewType = 
  | 'home' 
  | 'about' 
  | 'products' 
  | 'product-detail' 
  | 'services' 
  | 'news' 
  | 'gallery' 
  | 'contact' 
  | 'faq' 
  | 'search'
  | 'admin';
