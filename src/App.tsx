import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, MapPin, Mail, Phone, Calendar, User, 
  Search, Filter, Coffee, ChevronRight, CheckCircle, 
  ChevronLeft, X, ExternalLink, Globe, Layers, Handshake, HelpCircle 
} from 'lucide-react';
import { Product, ProductCategory, Service, NewsPost, GalleryImage, ViewType, Inquiry, SiteSettings } from './types.js';
import { translations, faqsList } from './translations.js';
import Header from './components/Header.tsx';
import Footer from './components/Footer.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import image1 from '../images/image-1.jpg';
import packing from '../images/packing.png';
import aboutBannerVideo from '../images/video.MOV';
import image3 from '../images/IMG_8580.png';

export default function App() {
  // Localization State
  const [lang, setLang] = useState<'en' | 'am'>(() => {
    const saved = localStorage.getItem('konjo_lang');
    return (saved === 'am' ? 'am' : 'en');
  });

  // Current view routing
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [selectedProductSlug, setSelectedProductSlug] = useState<string | null>(null);
  const [selectedNewsSlug, setSelectedNewsSlug] = useState<string | null>(null);

  // Global search input state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ products: Product[]; services: Service[]; news: NewsPost[] }>({
    products: [],
    services: [],
    news: []
  });

  // Database lists
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [settings, setSettings] = useState<SiteSettings[]>([]);

  // Filtering states
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [productSearch, setProductSearch] = useState<string>('');
  const [newsSearch, setNewsSearch] = useState<string>('');
  const [galleryCategoryFilter, setGalleryCategoryFilter] = useState<string>('all');

  // Lightbox & details state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);

  // Form Submissions states
  const [inquirySuccess, setInquirySuccess] = useState(false);
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [inquiryProductSelect, setInquiryProductSelect] = useState<string>('');

  // Admin authentication state
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('konjo_admin_token'));
  const [adminUser, setAdminUser] = useState<{ username: string; name: string; role: string } | null>(() => {
    const saved = localStorage.getItem('konjo_admin_user');
    return saved ? JSON.parse(saved) : null;
  });

  const t = translations[lang];

  const phoneSetting = settings?.find(s => s.key === 'company_phone');
  const phoneVal = lang === 'en' 
    ? (phoneSetting?.value_en || '+251 11 662 4055') 
    : (phoneSetting?.value_am || '+251 11 662 4055');

  const emailSetting = settings?.find(s => s.key === 'company_email');
  const emailVal = lang === 'en' 
    ? (emailSetting?.value_en || 'info@konjocoffee.com') 
    : (emailSetting?.value_am || 'info@konjocoffee.com');

  const addressSetting = settings?.find(s => s.key === 'company_address');
  const addressVal = lang === 'en' 
    ? (addressSetting?.value_en || 'Bole Road, Mega Building 5th Floor, Addis Ababa, Ethiopia') 
    : (addressSetting?.value_am || 'ቦሌ መንገድ፥ ሜጋ ህንፃ 5ኛ ፎቅ፥ አዲስ አበባ፥ ኢትዮጵያ');

  // Fetch collections from API
  const fetchCollections = async () => {
    try {
      const [resProd, resCat, resSrv, resNews, resGal, resSet] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
        fetch('/api/services'),
        fetch('/api/news'),
        fetch('/api/gallery'),
        fetch('/api/settings')
      ]);

      if (resProd.ok) setProducts(await resProd.json());
      if (resCat.ok) setCategories(await resCat.json());
      if (resSrv.ok) setServices(await resSrv.json());
      if (resNews.ok) setNews(await resNews.json());
      if (resGal.ok) setGallery(await resGal.json());
      if (resSet.ok) setSettings(await resSet.json());
    } catch (err) {
      console.error('Error fetching collections:', err);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  // Update language and persist
  const handleLanguageChange = (newLang: 'en' | 'am') => {
    setLang(newLang);
    localStorage.setItem('konjo_lang', newLang);
  };

  // Perform global search
  const handleGlobalSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
        setCurrentView('search');
      }
    } catch (err) {
      console.error('Global search error:', err);
    }
  };

  // Submit Export Inquiry
  const handleInquirySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmittingInquiry(true);
    setInquirySuccess(false);

    const formData = new FormData(e.currentTarget);
    const body = {
      company_name: formData.get('company_name') as string,
      contact_name: formData.get('contact_name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      country: formData.get('country') as string,
      coffee_type: formData.get('coffee_type') as string,
      volume_required: formData.get('volume_required') as string,
      target_price: formData.get('target_price') as string,
      message: formData.get('message') as string,
      product_id: inquiryProductSelect || ''
    };

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setInquirySuccess(true);
        e.currentTarget.reset();
        setInquiryProductSelect('');
      }
    } catch (err) {
      console.error('Inquiry submission error:', err);
    } finally {
      setSubmittingInquiry(false);
    }
  };

  // Footer Newsletter subscribe proxy
  const handleNewsletterSubscribe = async (email: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  // Admin Session Handlers
  const handleAdminLogin = (token: string, user: { username: string; name: string; role: string }) => {
    setAdminToken(token);
    setAdminUser(user);
    localStorage.setItem('konjo_admin_token', token);
    localStorage.setItem('konjo_admin_user', JSON.stringify(user));
    setCurrentView('admin');
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    setAdminUser(null);
    localStorage.removeItem('konjo_admin_token');
    localStorage.removeItem('konjo_admin_user');
    setCurrentView('home');
  };

  // Navigation controller helper
  const navigateTo = (view: ViewType) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const viewProductDetail = (slug: string) => {
    setSelectedProductSlug(slug);
    navigateTo('product-detail');
  };

  const viewNewsDetail = (slug: string) => {
    setSelectedNewsSlug(slug);
    navigateTo('news');
  };

  const triggerInquiryForProduct = (prod: Product) => {
    setInquiryProductSelect(prod.id);
    navigateTo('contact');
  };

  return (
    <div className="min-h-screen bg-[#F8F1E7] text-[#2D2A26] selection:bg-[#7E4015] selection:text-[#F8F1E7] font-sans flex flex-col justify-between">
      
      {/* Header element */}
      <Header
        currentView={currentView}
        onNavigate={navigateTo}
        lang={lang}
        onLanguageChange={handleLanguageChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleGlobalSearch}
        isAdminLoggedIn={!!adminToken}
        onLogout={handleAdminLogout}
        settings={settings}
      />

      {/* Main page view switcher */}
      <div className="flex-1">

        {/* 1. VIEW: HOME */}
        {currentView === 'home' && (
          <div className="animate-fade-in" id="home-view">
            
            {/* HERO SECTION */}
            <section className="relative text-[#2D2A26] py-16 md:py-24 border-b border-[#2D2A26]/10 px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                
                {/* LEFT HERO: Typography, CTAs, and Stats */}
                <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
                  <div className="space-y-3">
                    <span className="text-[#7E4015] text-xs font-bold uppercase tracking-[0.3em] block">
                      {lang === 'en' ? 'Est. 1994 • Hawassa' : 'ከ1986 ዓ.ም ጀምሮ • ሀዋሳ'}
                    </span>
                    <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95] text-[#2D2A26] -ml-1">
                      {lang === 'en' ? (
                        <>Highlands <br/> <span className="text-[#7E4015] italic">to Your</span> <br/> Cup.</>
                      ) : (
                        <>ከደጋማዎቹ <br/> <span className="text-[#7E4015] italic">እስከ</span> <br/> ሲኒዎ።</>
                      )}
                    </h1>
                  </div>

                  <p className="text-base sm:text-lg text-[#2D2A26]/85 font-sans font-light leading-relaxed max-w-xl">
                    {t.hero_subtitle}
                  </p>

                  <div className="flex flex-wrap gap-4 pt-4">
                    <button 
                      onClick={() => {
                        setInquiryProductSelect('');
                        navigateTo('contact');
                      }}
                      className="px-8 py-4.5 border rounded-2xl bg-[#7E4015] text-[#F8F1E7] hover:bg-[#2D2A26] transition-colors  font-bold text-xs uppercase tracking-widest shadow-md"
                    >
                      {lang === 'en' ? 'Export Inquiry' : 'የኤክስፖርት ጥያቄ'}
                    </button>
                    <button 
                      onClick={() => navigateTo('products')}
                      className="px-8 py-4.5 border border-[#2D2A26] text-[#2D2A26] hover:bg-[#7E4015]/10 hover:border-[#7E4015] hover:text-[#7E4015] transition-all rounded-2xl font-bold text-xs uppercase tracking-widest"
                    >
                      {lang === 'en' ? 'View Products' : 'ቡናዎችን ይመልከቱ'}
                    </button>
                  </div>

                  {/* High density stats row */}
                  <div className="mt-12 pt-8 border-t border-[#2D2A26]/10 grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-2xl sm:text-3xl font-serif font-bold text-[#7E4015]">42+</div>
                      <div className="text-[9px] sm:text-[10px] uppercase tracking-wider opacity-60 font-bold leading-tight">Partner Farms</div>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-serif font-bold text-[#2D2A26]">18k</div>
                      <div className="text-[9px] sm:text-[10px] uppercase tracking-wider opacity-60 font-bold leading-tight">Tons Exported</div>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-serif font-bold text-[#2D2A26]">Grade A</div>
                      <div className="text-[9px] sm:text-[10px] uppercase tracking-wider opacity-60 font-bold leading-tight">Quality Rating</div>
                    </div>
                  </div>
                </div>

                {/* RIGHT HERO: Visual Bento Grid Collage */}
                <div className="lg:col-span-7 grid grid-cols-6 grid-rows-6 gap-4 h-[550px] sm:h-[650px]">
                  
                  {/* Main Visual Block (Natural Processed Specialty) */}
                  <div className="col-span-4 row-span-4 border rounded-2xl bg-[#2D2A26] relative overflow-hidden group">
                    <div className="absolute inset-0 border rounded-2xl bg-cover bg-center opacity-120 group-hover:scale-102 transition-transform duration-700" style={{ backgroundImage: `url(${packing})` }}></div>
                    {/* bg-[url('https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=1024')] */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#2D2A26] via-[#2D2A26]/40 to-transparent"></div>
                    <div className="absolute bottom-6 left-6 z-10 space-y-1">
                      <span className="bg-[#7E4015] text-[9px] tracking-widest text-white px-2.5 py-1 mb-2 inline-block font-bold uppercase">
                        HARVEST 2026
                      </span>
                      <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#F8F1E7]">
                        {lang === 'en' ? 'Natural Processed Specialty' : 'በተፈጥሮ የደረቀ ልዩ ቡና'}
                      </h3>
                    </div>
                  </div>

                  {/* Small Detail 1 (Yirgacheffe accent tile) */}
                  <div className="col-span-2 row-span-2 border rounded-2xl bg-[#7E4015] p-5 flex flex-col justify-between text-[#F8F1E7]">
                    <div className="w-8 h-8 border border-white/20 rounded-full flex items-center justify-center">
                      <Coffee className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div>
                      <div className="text-lg font-serif font-bold leading-tight">Yirgacheffe</div>
                      <div className="text-[9px] uppercase tracking-wider opacity-70 mt-0.5">Floral & Citrus</div>
                    </div>
                  </div>

                  {/* Small Detail 2 (SCA Cup Score stat tile) */}
                  <div className="col-span-2 row-span-2 border rounded-2xl bg-white/40 border border-[#2D2A26]/10 p-5 flex flex-col justify-center">
                    <div className="text-3xl sm:text-4xl font-serif italic font-bold text-[#7E4015] leading-none mb-1">92+</div>
                    <p className="text-[10px] leading-tight opacity-75 uppercase tracking-tight font-bold text-[#2D2A26]">
                      Average SCA Cup Score for our micro-lots
                    </p>
                  </div>

                  {/* Stat Bar (District origin tile) */}
                  <div className="col-span-3 row-span-2 border rounded-2xl bg-white border border-[#2D2A26]/10 p-5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#F8F1E7] rounded-full flex-shrink-0 flex items-center justify-center border border-[#7E4015]/20">
                      <MapPin className="h-4.5 w-4.5 text-[#7E4015]" />
                    </div>
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-wider opacity-50 block leading-none mb-1">Direct Trade Origin</div>
                      <div className="text-xs sm:text-sm font-semibold text-[#2D2A26]">Guji Highland Estate</div>
                    </div>
                  </div>

                  {/* Logo / Quality Seal */}
                  <div className="col-span-3 row-span-2 border rounded-3xl bg-[#2D2A26] p-4 flex items-center justify-center text-center">
                    <div>
                      <div className="text-[#F8F1E7] text-[9px] tracking-[0.3em] uppercase mb-0.5 opacity-40">Export Quality</div>
                      <div className="text-[#F8F1E7] font-serif text-xl font-bold tracking-tight">KONJO BUNA</div>
                      <div className="h-px w-24 bg-[#7E4015]/40 my-1.5 mx-auto"></div>
                      <div className="text-[#F8F1E7] text-[8px] tracking-[0.2em] uppercase opacity-40">Certified Organic</div>
                    </div>
                  </div>

                </div>

              </div>
            </section>

            {/* HIGH-LIGHTS BENTO SECTION */}
            <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-[#2D2A26]/10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { title: t.highlights_moton, desc: t.highlights_moton_desc, icon: Globe, img: 'https://images.unsplash.com/photo-1511537190424-bbbab87ac5eb?q=80&w=600' },
                  { title: t.highlights_quality, desc: t.highlights_quality_desc, icon: Coffee, img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=600' },
                  { title: t.highlights_direct, desc: t.highlights_direct_desc, icon: Handshake, img: 'https://images.unsplash.com/photo-1542435503-956c469947f6?q=80&w=600' },
                ].map((hl, idx) => {
                  const IconComp = hl.icon;
                  return (
                    <div 
                      key={idx} 
                      className="group relative h-80 rounded-3xl overflow-hidden border border-[#2D2A26]/10 bg-[#2D2A26] flex flex-col justify-end p-8 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="absolute inset-0 bg-cover  bg-center opacity-30 transition-transform duration-700 group-hover:scale-102" style={{ backgroundImage: `url('${hl.img}')` }}></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#2D2A26] via-[#2D2A26]/80 to-transparent"></div>
                      
                      <div className="relative z-10 space-y-2">
                        <div className="bg-[#7E4015] w-10 h-10 rounded-full flex items-center justify-center border border-[#F8F1E7]/10 mb-2 shadow">
                          <IconComp className="h-5 w-5 text-[#F8F1E7]" />
                        </div>
                        <h3 className="font-serif text-xl font-bold text-[#F8F1E7]">{hl.title}</h3>
                        <p className="text-xs text-[#F8F1E7]/70 font-light leading-relaxed">{hl.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* BENTO SECTION: ABOUT PREVIEW */}
            <section className="py-24 bg-[#2D2A26] text-[#F8F1E7] border-y border-[#2D2A26]/10 overflow-hidden">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                  <div className="space-y-6">
                    <span className="text-xs font-bold tracking-[0.25em] text-[#7E4015] uppercase block">{t.nav_about}</span>
                    <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[#F8F1E7] leading-tight">{t.about_title}</h2>
                    <p className="text-[#F8F1E7]/80 font-sans font-light leading-relaxed text-base sm:text-lg">
                      {t.about_preview_text}
                    </p>
                    <div className="pt-2">
                      <button 
                        onClick={() => navigateTo('about')}
                        className="px-8 py-4.5 border bg-[#7E4015] hover:bg-[#F8F1E7] hover:text-[#2D2A26] text-[#F8F1E7] font-bold text-xs uppercase tracking-widest rounded-2xl inline-flex items-center gap-2.5 transition-all shadow-md"
                      >
                        <span>{t.about_read_more}</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Visual Bento Collage */}
                  <div className="relative border-[#7E4015] rounded-2xl ">
                    <div className="aspect-square max-w-md mx-auto rounded-3xl overflow-hidden border border-[#F8F1E7]/10 shadow-2xl relative group">
                      <img 
                      src={image1}
                        // src="https://images.unsplash.com/photo-1511537190424-bbbab87ac5eb?q=80&w=800" 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-102" 
                        alt="Ethiopian Coffee Ceremony" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                      <div className="absolute bottom-8 left-8 text-white">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-[#7E4015]">Culture</span>
                        <h4 className="font-serif text-xl font-bold mt-1">Traditional Buna Ceremony</h4>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* FEATURED SPECIALTY LOTS */}
            <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
                <div>
                  <span className="text-xs font-bold tracking-[0.25em] text-[#7E4015] uppercase block">Micro-Lots & Single-Origins</span>
                  <h2 className="font-serif text-3xl sm:text-4xl font-bold mt-2 text-[#2D2A26]">{t.section_featured_products}</h2>
                  <p className="text-xs text-gray-500 mt-1">{t.section_featured_subtitle}</p>
                </div>
                <button 
                  onClick={() => navigateTo('products')}
                  className="px-6 py-3 border border-[#2D2A26] bg-[#7E4015] text-[#F8F1E7] hover:bg-[#7E4015]/10 hover:text-[#2D2A26] rounded-2xl text-xs font-bold uppercase tracking-widest transition-all inline-flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <span>{t.view_all}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Staggered list */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.filter(p => p.is_featured).slice(0, 3).map((prod) => (
                  <div 
                    key={prod.id} 
                    className="bg-white border border-[#2D2A26]/10 rounded-2xl overflow-hidden shadow-none flex flex-col group transition-all duration-300 hover:border-[#7E4015] hover:shadow-lg"
                  >
                    <div className="relative h-64 overflow-hidden bg-gray-50">
                      <img 
                        src={prod.image_url} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102" 
                        alt={lang === 'en' ? prod.title_en : prod.title_am} 
                      />
                      <div className="absolute top-4 left-4 bg-[#7E4015] text-[#F8F1E7] text-[9px] font-bold px-3 py-1.5 rounded-none uppercase tracking-wider">
                        {prod.elevation}
                      </div>
                    </div>
                    
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono font-bold text-[#7E4015] uppercase block">{lang === 'en' ? prod.origin_en : prod.origin_am}</span>
                        <h3 className="font-serif text-xl font-bold text-[#2D2A26] leading-tight line-clamp-1 group-hover:text-[#7E4015] transition-colors">
                          {lang === 'en' ? prod.title_en : prod.title_am}
                        </h3>
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                          {lang === 'en' ? prod.description_en : prod.description_am}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-[#2D2A26]/5 flex items-center justify-between">
                        <button 
                          onClick={() => viewProductDetail(prod.slug)}
                          className="text-[10px] font-bold uppercase tracking-wider text-[#2D2A26] hover:text-[#7E4015] inline-flex items-center gap-1 transition-all"
                        >
                          <span>Full Specifications</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => triggerInquiryForProduct(prod)}
                          className="px-4 py-2.5 bg-[#7E4015] text-[#F8F1E7] hover:bg-[rgb(22,180,11)] hover:text-[#2D2A26] rounded-2xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
                        >
                          Inquire
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* INTEGRITY / SERVICES PREVIEW */}
            <section className="py-24 bg-[#F8F1E7] border-t border-[#2D2A26]/10">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
                  <span className="text-xs font-bold tracking-[0.25em] text-[#7E4015] uppercase block">Integrated Quality Chain</span>
                  <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2D2A26] leading-tight">{t.why_choose_us}</h2>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-xl mx-auto">{t.why_choose_us_subtitle}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { title: t.why_reason_1, desc: t.why_reason_1_desc },
                    { title: t.why_reason_2, desc: t.why_reason_2_desc },
                    { title: t.why_reason_3, desc: t.why_reason_3_desc },
                  ].map((reason, rIdx) => (
                    <div key={rIdx} className="bg-white p-8 rounded-none border border-[#2D2A26]/10 shadow-none space-y-4 transition-all hover:border-[#7E4015] hover:shadow-md">
                      <div className="text-3xl font-serif italic font-bold text-[#7E4015]/40">0{rIdx + 1}</div>
                      <h3 className="font-serif text-lg font-bold text-[#2D2A26]">{reason.title}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed font-light">{reason.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

          </div>
        )}

        {/* 2. VIEW: ABOUT */}
        {currentView === 'about' && (
          <div className="animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20" id="about-view">
            
            {/* Sourcing title */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <span className="text-xs font-bold tracking-[0.25em] text-[#7E4015] uppercase block">{t.nav_about}</span>
              <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#2D2A26] leading-tight">{t.about_page_title}</h1>
              <p className="text-sm sm:text-base text-gray-500 leading-relaxed">{t.about_page_subtitle}</p>
            </div>

            {/* Parallax Coffee Highlands Banner */}
            <div className="h-112.5 rounded-2xl overflow-hidden relative shadow-lg">
              <video
                className="w-full h-full object-cover scale-102 transition-transform duration-1000"
                autoPlay
                muted
                loop
                playsInline
                poster={image1}
                src={aboutBannerVideo}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2D2A26]/90 via-transparent to-transparent"></div>
              <div className="absolute bottom-8 left-8 sm:left-12 text-[#F8F1E7] space-y-2 max-w-xl">
                <span className="bg-[#7E4015] text-[10px] font-bold px-3 py-1 uppercase tracking-widest rounded-none">Our Showroom</span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold">Konjo Coffee showroom has many Products.</h3>
              </div>
            </div>

            {/* Heritage / Mission / Vision / Values */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              
              <div className="space-y-6 bg-white p-8 sm:p-10 rounded-2xl border border-[#2D2A26]/10 shadow-none">
                <h2 className="font-serif text-2xl font-bold text-[#2D2A26] border-b border-[#2D2A26]/10 pb-3">{t.about_history}</h2>
                <p className="text-lg text-gray-500 leading-relaxed font-light">{t.about_history_text}</p>
              </div>

              <div className="space-y-6">
                
                <div className="bg-[#2D2A26] text-[#F8F1E7] p-8 rounded-2xl border border-transparent shadow-none space-y-3">
                  <h3 className="font-serif text-2xl font-bold text-[#7E4015] border-b border-[#ffffff]/50 pt-3">{t.about_mission}</h3>
                  <p className="text-lg text-[#F8F1E7]/80 leading-relaxed font-light">{t.about_mission_text}</p>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-[#2D2A26]/10 shadow-none space-y-3">
                  <h3 className="font-serif text-2xl font-bold text-[#2D2A26] border-b border-[#2D2A26]/10 pt-3">{t.about_vision}</h3>
                  <p className="text-lg text-gray-500 leading-relaxed font-light">{t.about_vision_text}</p>
                </div>

              </div>
            </div>

            {/* Values Details */}
            <div className="bg-white p-8 sm:p-12 rounded-2xl border border-[#2D2A26]/10 shadow-none space-y-8">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2D2A26] text-center">{t.about_values}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2 border-r border-[#2D2A26]/50 ">
                  <h4 className="font-serif font-bold text-lg text-[#7E4015]">{t.about_values_quality}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{t.about_values_quality_text}</p>
                </div>
                <div className="space-y-2 border-r border-[#2D2A26]/50">
                  <h4 className="font-serif font-bold text-lg text-[#7E4015]">{t.about_values_integrity}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{t.about_values_integrity_text}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-serif font-bold text-lg text-[#7E4015]">{t.about_values_sustainability}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{t.about_values_sustainability_text}</p>
                </div>
              </div>
            </div>

            {/* Processing Facility Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center bg-[#2D2A26] text-[#F8F1E7] p-8 sm:p-12 rounded-2xl border border-[#2D2A26]/10 shadow-none">
              <div className="space-y-4">
                <span className="text-xs uppercase font-bold text-[#7E4015] tracking-[0.2em] block">Addis Ababa Mills & Sorting</span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold">{t.about_facilities}</h3>
                <p className="text-md text-[#F8F1E7]/85 font-light leading-relaxed">{t.about_facilities_text}</p>
              </div>
              <div className="h-64 sm:h-80 rounded-2xl overflow-hidden border border-[#F8F1E7]/10">
                <img src= {image3} className="w-full h-full object-cover" alt="Processing Stations" />
                {/* <img src="https://images.unsplash.com/photo-1524350876685-274059332603?q=80&w=800" className="w-full h-full object-cover" alt="Processing Stations" /> */}
              </div>
            </div>

            {/* Team Bios */}
            <div className="space-y-8">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2D2A26]">{t.about_team_title}</h2>
                <p className="text-xs text-gray-500">{t.about_team_subtitle}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { name: 'Abebe Geda', role: 'Managing Director & Founder', bio: 'Over 20 years managing bulk commodity shipping and direct trade relations across East Africa.', img: 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?q=80&w=400' },
                  { name: 'Ashenafi Hailu', role: 'Director of Sourcing & Agronomy', bio: 'Agronomist specialized in highland single-origins, training smallholders in organic cherry collection.', img: 'https://images.unsplash.com/photo-1542435503-956c469947f6?q=80&w=400' },
                  { name: 'Sara Demeke', role: 'Chief of Sustainability', bio: 'Coordinates eco-friendly pulping processes and directs the cooperative premium school-build projects.', img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=400' }
                ].map((member, mIdx) => (
                  <div key={mIdx} className="bg-white border border-[#2D2A26]/10 rounded-none p-6 text-center shadow-none hover:border-[#7E4015] hover:shadow-md transition-all">
                    <img src={member.img} className="w-24 h-24 object-cover rounded-full mx-auto border border-[#2D2A26]/10 mb-4 shadow-sm" alt={member.name} />
                    <h4 className="font-serif font-bold text-lg text-gray-900">{member.name}</h4>
                    <p className="text-xs text-[#7E4015] font-semibold tracking-wider uppercase mt-1">{member.role}</p>
                    <p className="text-xs text-gray-500 mt-3 leading-relaxed font-light">{member.bio}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* 3. VIEW: PRODUCTS CATALOGUE */}
        {currentView === 'products' && (
          <div className="animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12" id="products-view">
            
            {/* Title */}
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold tracking-[0.25em] text-[#7E4015] uppercase block">Specialty Portfolio</span>
              <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#2D2A26] leading-tight">{t.products_title}</h1>
              <p className="text-xs text-gray-500 leading-relaxed">{t.products_subtitle}</p>
            </div>

            {/* Filter and Search Bar Row */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white border border-[#2D2A26]/10 rounded-none shadow-none">
              
              {/* Category Selector Tabs */}
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <button
                  id="category-filter-all"
                  onClick={() => setSelectedCategoryFilter('all')}
                  className={`px-4 py-2.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all border ${
                    selectedCategoryFilter === 'all' 
                      ? 'bg-[#7E4015] border-[#7E4015] text-[#F8F1E7] shadow-sm' 
                      : 'border-[#2D2A26]/10 text-gray-600 hover:border-[#7E4015] hover:text-[#7E4015]'
                  }`}
                >
                  {t.products_filter_all}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    id={`category-filter-${cat.id}`}
                    onClick={() => setSelectedCategoryFilter(cat.id)}
                    className={`px-4 py-2.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all border ${
                      selectedCategoryFilter === cat.id 
                        ? 'bg-[#7E4015] border-[#7E4015] text-[#F8F1E7] shadow-sm' 
                        : 'border-[#2D2A26]/10 text-gray-600 hover:border-[#7E4015] hover:text-[#7E4015]'
                    }`}
                  >
                    {lang === 'en' ? cat.name_en : cat.name_am}
                  </button>
                ))}
              </div>

              {/* Dynamic Filter Input */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-[#7E4015]" />
                <input
                  type="text"
                  id="catalog-search-input"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder={t.products_search_placeholder}
                  className="w-full bg-transparent border border-[#2D2A26]/10 focus:border-[#7E4015] rounded-none pl-10 pr-4 py-3 text-xs text-gray-700 focus:outline-none font-sans"
                />
              </div>

            </div>

            {/* Grid lists */}
            {(() => {
              const filtered = products.filter((p) => {
                const matchesCat = selectedCategoryFilter === 'all' || p.category_id === selectedCategoryFilter;
                const matchesSearch = !productSearch || 
                  p.title_en.toLowerCase().includes(productSearch.toLowerCase()) ||
                  p.title_am.toLowerCase().includes(productSearch.toLowerCase()) ||
                  p.origin_en.toLowerCase().includes(productSearch.toLowerCase()) ||
                  p.origin_am.toLowerCase().includes(productSearch.toLowerCase());
                return matchesCat && matchesSearch;
              });

              if (filtered.length === 0) {
                return (
                  <div className="bg-white p-16 text-center border border-[#2D2A26]/10 rounded-none" id="no-products-screen">
                    <Coffee className="h-12 w-12 text-[#7E4015] mx-auto opacity-30 mb-4" />
                    <p className="text-xs uppercase tracking-wider font-bold text-gray-500 max-w-sm mx-auto">{t.products_no_results}</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" id="products-catalog-grid">
                  {filtered.map((prod) => (
                    <div 
                      key={prod.id} 
                      className="bg-white border border-[#2D2A26]/10 rounded-none overflow-hidden shadow-none flex flex-col justify-between group transition-all duration-300 hover:border-[#7E4015] hover:shadow-lg"
                    >
                      <div className="relative h-64 overflow-hidden bg-gray-50">
                        <img 
                          src={prod.image_url} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102" 
                          alt="" 
                        />
                        <div className="absolute top-4 left-4 bg-[#2D2A26] border border-[#7E4015]/30 text-[#F8F1E7] text-[9px] font-bold px-3 py-1.5 rounded-none uppercase tracking-wider">
                          {prod.elevation}
                        </div>
                      </div>

                      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono font-bold text-[#7E4015] tracking-widest uppercase block">
                            {lang === 'en' ? prod.origin_en : prod.origin_am}
                          </span>
                          <h3 className="font-serif text-xl font-bold text-[#2D2A26] leading-tight group-hover:text-[#7E4015] transition-colors">
                            {lang === 'en' ? prod.title_en : prod.title_am}
                          </h3>
                          <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                            {lang === 'en' ? prod.description_en : prod.description_am}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-[#2D2A26]/5 flex items-center justify-between">
                          <button 
                            onClick={() => viewProductDetail(prod.slug)}
                            className="text-[10px] font-bold uppercase tracking-wider text-[#2D2A26] hover:text-[#7E4015] inline-flex items-center gap-1 transition-all"
                          >
                            <span>{lang === 'en' ? 'Full Details' : 'ሙሉ መግለጫ'}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => triggerInquiryForProduct(prod)}
                            className="px-4 py-2.5 bg-[#7E4015] text-[#F8F1E7] hover:bg-[#2D2A26] rounded-none text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                          >
                            {lang === 'en' ? 'Inquire' : 'ጥያቄ አቅርብ'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

          </div>
        )}

        {/* 4. VIEW: PRODUCT DETAIL */}
        {currentView === 'product-detail' && (() => {
          const prod = products.find(p => p.slug === selectedProductSlug);
          if (!prod) return (
            <div className="text-center py-24 max-w-7xl mx-auto">
              <p className="text-red-600 font-semibold">Product lot metadata not found.</p>
              <button onClick={() => navigateTo('products')} className="mt-4 text-[#7E4015] underline">Back to catalog</button>
            </div>
          );

          // Get related items
          const related = products.filter(p => p.category_id === prod.category_id && p.id !== prod.id).slice(0, 3);

          return (
            <div className="animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16" id="product-detail-view">
              
              {/* Back CTA */}
              <div>
                <button 
                  onClick={() => navigateTo('products')}
                  className="px-5 py-3 border border-[#2D2A26]/10 hover:border-[#7E4015] text-[#2D2A26] text-xs font-bold rounded-none uppercase tracking-widest inline-flex items-center gap-2 bg-white transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>{t.product_back_list}</span>
                </button>
              </div>

              {/* Top Row Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                
                {/* Big Image Panel */}
                <div className="aspect-[4/3] rounded-none overflow-hidden shadow-md relative border border-[#2D2A26]/10">
                  <img src={prod.image_url} className="w-full h-full object-cover" alt="" />
                  <div className="absolute top-4 left-4 bg-[#2D2A26] text-white text-[9px] font-bold px-3 py-1.5 rounded-none uppercase tracking-wider">
                    {t.product_elevation}: {prod.elevation}
                  </div>
                </div>

                {/* Specs Sheet Panel */}
                <div className="space-y-6">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-[#7E4015] uppercase">{lang === 'en' ? prod.origin_en : prod.origin_am}</span>
                    <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2D2A26] leading-tight">{lang === 'en' ? prod.title_en : prod.title_am}</h1>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed font-light">
                    {lang === 'en' ? prod.description_en : prod.description_am}
                  </p>

                  {/* High-density tech specification specs list */}
                  <div className="bg-white rounded-none border border-[#2D2A26]/10 shadow-none p-6 space-y-4">
                    <h3 className="font-serif text-xs font-bold text-[#2D2A26] uppercase tracking-[0.15em] border-b border-[#2D2A26]/5 pb-2">Technical Specifications</h3>
                    
                    <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-xs font-mono text-gray-600">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">{t.product_origin}</span>
                        <span className="font-semibold text-[#2D2A26]">{lang === 'en' ? prod.origin_en : prod.origin_am}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">{t.product_grade}</span>
                        <span className="font-semibold text-[#2D2A26]">{lang === 'en' ? prod.grade_en : prod.grade_am}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">{t.product_processing}</span>
                        <span className="font-semibold text-[#7E4015]">{lang === 'en' ? prod.processing_en : prod.processing_am}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">{t.product_packaging}</span>
                        <span className="font-semibold text-[#2D2A26]">{lang === 'en' ? prod.packaging_en : prod.packaging_am}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">{t.product_availability}</span>
                        <span className="font-semibold text-[#2D2A26]">{lang === 'en' ? prod.availability_en : prod.availability_am}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">{t.product_price}</span>
                        <span className="font-semibold text-[#2D2A26]">{lang === 'en' ? prod.price_en : prod.price_am}</span>
                      </div>
                    </div>
                  </div>

                  {/* Inquiry CTA */}
                  <div className="pt-2">
                    <button
                      id="detail-inquiry-btn"
                      onClick={() => triggerInquiryForProduct(prod)}
                      className="w-full sm:w-auto px-8 py-4 bg-[#7E4015] text-[#F8F1E7] hover:bg-[#2D2A26] font-bold text-xs uppercase tracking-widest rounded-none shadow-md flex items-center justify-center gap-2.5 transition-all"
                    >
                      <span>{t.product_send_inquiry}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

              </div>

              {/* Full Specs / Long description */}
              <div className="bg-white p-8 sm:p-12 rounded-none border border-[#2D2A26]/10 shadow-none space-y-6">
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#2D2A26] border-b border-[#2D2A26]/10 pb-3">Tracing Profile & Cupping Notes</h3>
                <div className="text-xs sm:text-sm text-gray-600 leading-relaxed font-light whitespace-pre-wrap">
                  {lang === 'en' ? prod.content_en : prod.content_am}
                </div>
              </div>

              {/* Related Products Grid list */}
              {related.length > 0 && (
                <div className="space-y-8">
                  <h3 className="font-serif text-xl font-bold text-[#2D2A26] text-center border-b border-[#2D2A26]/10 pb-4">{t.product_related_title}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                    {related.map(rel => (
                      <div 
                        key={rel.id}
                        onClick={() => viewProductDetail(rel.slug)}
                        className="bg-white border border-[#2D2A26]/10 rounded-none overflow-hidden shadow-none cursor-pointer group transition-all hover:border-[#7E4015]"
                      >
                        <div className="h-44 overflow-hidden relative bg-gray-50">
                          <img src={rel.image_url} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" alt="" />
                        </div>
                        <div className="p-4 space-y-1">
                          <span className="text-[9px] font-mono font-bold text-[#7E4015] tracking-widest uppercase">{lang === 'en' ? rel.origin_en : rel.origin_am}</span>
                          <h4 className="font-serif font-bold text-[#2D2A26] leading-tight group-hover:text-[#7E4015] transition-colors">{lang === 'en' ? rel.title_en : rel.title_am}</h4>
                          <p className="text-xs text-gray-400 mt-1">{rel.elevation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          );
        })()}

        {/* 5. VIEW: SERVICES */}
        {currentView === 'services' && (
          <div className="animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16" id="services-view">
            
            {/* Title */}
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold tracking-[0.25em] text-[#7E4015] uppercase block">Global Sourcing Logistics</span>
              <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#2D2A26] leading-tight">{t.services_title}</h1>
              <p className="text-xs text-gray-500 leading-relaxed">{t.services_subtitle}</p>
            </div>

            {/* List columns */}
            <div className="space-y-12">
              {services.map((srv, index) => {
                const isEven = index % 2 === 0;
                return (
                  <div 
                    key={srv.id} 
                    className={`grid grid-cols-1 lg:grid-cols-12 gap-12 items-center bg-white p-8 sm:p-12 rounded-none border border-[#2D2A26]/10 shadow-none hover:border-[#7E4015]/30 hover:shadow-md transition-all ${
                      isEven ? '' : 'lg:flex-row-reverse'
                    }`}
                  >
                    
                    {/* Image */}
                    <div className={`lg:col-span-5 h-72 sm:h-96 rounded-none overflow-hidden border border-[#2D2A26]/10 ${
                      isEven ? 'lg:order-1' : 'lg:order-2'
                    }`}>
                      <img src={srv.image_url} className="w-full h-full object-cover scale-102" alt="" />
                    </div>

                    {/* Text Details */}
                    <div className={`lg:col-span-7 space-y-5 ${
                      isEven ? 'lg:order-2' : 'lg:order-1'
                    }`}>
                      <div className="inline-flex items-center gap-2 text-[10px] font-bold text-[#7E4015] uppercase tracking-widest font-mono">
                        <Layers className="h-4 w-4" />
                        <span>Capability 0{index + 1}</span>
                      </div>
                      <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2D2A26]">
                        {lang === 'en' ? srv.title_en : srv.title_am}
                      </h2>
                      <p className="text-xs text-gray-500 font-light leading-relaxed">
                        {lang === 'en' ? srv.description_en : srv.description_am}
                      </p>
                      
                      <div className="p-5 bg-[#F8F1E7]/40 border border-[#2D2A26]/10 rounded-none text-xs text-gray-600 font-light leading-relaxed">
                        {lang === 'en' ? srv.content_en : srv.content_am}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* 6. VIEW: NEWS AND REPORTS */}
        {currentView === 'news' && (() => {
          const activePost = selectedNewsSlug ? news.find(n => n.slug === selectedNewsSlug) : null;
          
          if (activePost) {
            return (
              /* News Article Detail Reader view */
              <div className="animate-fade-in max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10" id="news-post-reader">
                <div>
                  <button 
                    onClick={() => {
                      setSelectedNewsSlug(null);
                      navigateTo('news');
                    }}
                    className="px-5 py-3 border border-[#2D2A26]/10 hover:border-[#7E4015] text-[#2D2A26] text-xs font-bold rounded-none uppercase tracking-widest inline-flex items-center gap-2 bg-white transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>{t.news_back_list}</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 text-xs text-[#7E4015] font-semibold uppercase tracking-widest">
                    <span>{lang === 'en' ? activePost.category_en : activePost.category_am}</span>
                  </div>
                  <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#2D2A26] tracking-tight leading-tight">
                    {lang === 'en' ? activePost.title_en : activePost.title_am}
                  </h1>
                  
                  {/* Author Meta Info */}
                  <div className="flex items-center gap-6 pt-2 pb-6 border-b border-[#2D2A26]/10 text-xs text-gray-400 font-mono">
                    <span className="flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      <span>{t.news_author}: {lang === 'en' ? activePost.author_en : activePost.author_am}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>{t.news_published}: {new Date(activePost.published_at).toLocaleDateString()}</span>
                    </span>
                  </div>
                </div>

                {/* Banner Image */}
                <div className="h-96 sm:h-[480px] rounded-none overflow-hidden shadow-none border border-[#2D2A26]/10">
                  <img src={activePost.image_url} className="w-full h-full object-cover scale-102" alt="" />
                </div>

                {/* Article Content Body */}
                <article className="prose prose-amber max-w-none text-xs sm:text-sm text-gray-600 font-light leading-relaxed whitespace-pre-wrap p-6 sm:p-8 bg-white border border-[#2D2A26]/10 rounded-none shadow-none">
                  {lang === 'en' ? activePost.content_en : activePost.content_am}
                </article>
              </div>
            );
          }

          // News Catalog view
          return (
            <div className="animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12" id="news-list-view">
              
              <div className="text-center max-w-3xl mx-auto space-y-3">
                <span className="text-xs font-bold tracking-[0.25em] text-[#7E4015] uppercase block">Origin Bulletins</span>
                <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#2D2A26] leading-tight">{t.news_title}</h1>
                <p className="text-xs text-gray-500 leading-relaxed">{t.news_subtitle}</p>
              </div>

              {/* Filtering News */}
              <div className="flex justify-end p-4 bg-white border border-[#2D2A26]/10 rounded-none shadow-none">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-[#7E4015]" />
                  <input
                    type="text"
                    id="news-search-input"
                    value={newsSearch}
                    onChange={(e) => setNewsSearch(e.target.value)}
                    placeholder={t.news_search_placeholder}
                    className="w-full bg-transparent border border-[#2D2A26]/10 focus:border-[#7E4015] rounded-none pl-10 pr-4 py-3 text-xs text-gray-700 focus:outline-none font-sans"
                  />
                </div>
              </div>

              {/* Cards Grid */}
              {(() => {
                const filtered = news.filter((p) => {
                  return !newsSearch || 
                    p.title_en.toLowerCase().includes(newsSearch.toLowerCase()) ||
                    p.title_am.toLowerCase().includes(newsSearch.toLowerCase()) ||
                    p.excerpt_en.toLowerCase().includes(newsSearch.toLowerCase()) ||
                    p.excerpt_am.toLowerCase().includes(newsSearch.toLowerCase());
                });

                if (filtered.length === 0) {
                  return (
                    <div className="bg-white p-16 text-center border border-[#2D2A26]/10 rounded-none">
                      <p className="text-xs uppercase tracking-wider font-bold text-gray-500">{lang === 'en' ? 'No news matching search.' : 'ምንም የሚዛመድ መጣጥፍ አልተገኘም።'}</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="news-grid">
                    {filtered.map((post) => (
                      <div 
                        key={post.id}
                        className="bg-white border border-[#2D2A26]/10 rounded-none overflow-hidden shadow-none flex flex-col group transition-all duration-300 hover:border-[#7E4015] hover:shadow-md"
                      >
                        <div className="h-56 overflow-hidden relative bg-gray-50">
                          <img src={post.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102" alt="" />
                          <span className="absolute top-4 left-4 bg-[#2D2A26] text-[#F8F1E7] text-[9px] font-bold px-3 py-1.5 rounded-none uppercase tracking-wider">{lang === 'en' ? post.category_en : post.category_am}</span>
                        </div>
                        
                        <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <span className="text-[10px] font-mono text-gray-400 block">{new Date(post.published_at).toLocaleDateString()}</span>
                            <h3 className="font-serif text-xl font-bold text-[#2D2A26] group-hover:text-[#7E4015] transition-colors leading-snug line-clamp-2">
                              {lang === 'en' ? post.title_en : post.title_am}
                            </h3>
                            <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 font-light">
                              {lang === 'en' ? post.excerpt_en : post.excerpt_am}
                            </p>
                          </div>

                          <div className="pt-4 border-t border-[#2D2A26]/5 flex items-center justify-between">
                            <span className="text-[10px] font-medium text-gray-400 font-mono">By: {lang === 'en' ? post.author_en.split(',')[0] : post.author_am.split(',')[0]}</span>
                            <button
                              id={`read-article-btn-${post.slug}`}
                              onClick={() => viewNewsDetail(post.slug)}
                              className="text-[10px] font-bold uppercase tracking-wider text-[#7E4015] hover:text-[#2D2A26] inline-flex items-center gap-1 transition-colors"
                            >
                              <span>{t.news_read_post}</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

            </div>
          );
        })()}

        {/* 7. VIEW: MEDIA GALLERY */}
        {currentView === 'gallery' && (
          <div className="animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12" id="gallery-view">
            
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold tracking-[0.25em] text-[#7E4015] uppercase block">Visual Highlands Archive</span>
              <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#2D2A26] leading-tight">{t.gallery_title}</h1>
              <p className="text-xs text-gray-500 leading-relaxed">{t.gallery_subtitle}</p>
            </div>

            {/* Category selection row */}
            <div className="flex flex-wrap justify-center gap-2 p-3 bg-white border border-[#2D2A26]/10 rounded-none max-w-2xl mx-auto shadow-none">
              <button
                id="gal-filter-all"
                onClick={() => setGalleryCategoryFilter('all')}
                className={`px-4 py-2 rounded-none text-xs font-bold uppercase tracking-wider transition-all border ${
                  galleryCategoryFilter === 'all' 
                    ? 'bg-[#7E4015] border-[#7E4015] text-[#F8F1E7] shadow-sm' 
                    : 'border-[#2D2A26]/10 text-gray-600 hover:border-[#7E4015] hover:text-[#7E4015]'
                }`}
              >
                {lang === 'en' ? 'All Assets' : 'ሁሉንም'}
              </button>
              {Array.from(new Set(gallery.map(g => g.category_en))).map((cat) => {
                const item = gallery.find(g => g.category_en === cat);
                return (
                  <button
                    key={cat}
                    id={`gal-filter-${(cat as string).replace(/\s+/g, '-').toLowerCase()}`}
                    onClick={() => setGalleryCategoryFilter(cat)}
                    className={`px-4 py-2 rounded-none text-xs font-bold uppercase tracking-wider transition-all border ${
                      galleryCategoryFilter === cat 
                        ? 'bg-[#7E4015] border-[#7E4015] text-[#F8F1E7] shadow-sm' 
                        : 'border-[#2D2A26]/10 text-gray-600 hover:border-[#7E4015] hover:text-[#7E4015]'
                    }`}
                  >
                    {lang === 'en' ? cat : (item ? item.category_am : cat)}
                  </button>
                );
              })}
            </div>

            {/* Responsive grid */}
            {(() => {
              const filtered = gallery.filter(g => galleryCategoryFilter === 'all' || g.category_en === galleryCategoryFilter);
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" id="gallery-grid">
                  {filtered.map((item, index) => (
                    <div 
                      key={item.id}
                      onClick={() => setLightboxIndex(index)}
                      className="group bg-white rounded-none overflow-hidden border border-[#2D2A26]/10 shadow-none hover:shadow-md cursor-zoom-in transition-all relative aspect-square"
                    >
                      <img src={item.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                        <span className="text-[#7E4015] text-[9px] font-bold uppercase tracking-wider">{lang === 'en' ? item.category_en : item.category_am}</span>
                        <h4 className="font-serif text-lg font-bold text-[#F8F1E7] mt-0.5 line-clamp-1">{lang === 'en' ? item.title_en : item.title_am}</h4>
                        <p className="text-[10px] text-[#F8F1E7]/70 line-clamp-1 mt-0.5 font-light">{lang === 'en' ? item.description_en : item.description_am}</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* LIGHTBOX OVERLAY */}
            {lightboxIndex !== null && (
              <div className="fixed inset-0 z-50 bg-[#2D2A26] bg-opacity-98 flex flex-col justify-between p-6 animate-fade-in text-white" id="gallery-lightbox">
                
                {/* Top header */}
                <div className="flex items-center justify-between border-b border-[#2D2A26]/10 pb-4">
                  <div>
                    <span className="text-[#7E4015] text-[10px] font-bold uppercase tracking-widest block">
                      {lang === 'en' ? gallery[lightboxIndex].category_en : gallery[lightboxIndex].category_am}
                    </span>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-[#F8F1E7]">
                      {lang === 'en' ? gallery[lightboxIndex].title_en : gallery[lightboxIndex].title_am}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setLightboxIndex(null)}
                    className="p-2 border border-[#2D2A26]/20 hover:border-white rounded-none hover:bg-white/10 transition-all text-[#F8F1E7]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Main image carousel viewport */}
                <div className="flex-1 flex items-center justify-between max-w-5xl mx-auto w-full py-8">
                  <button 
                    onClick={() => setLightboxIndex(lightboxIndex === 0 ? gallery.length - 1 : lightboxIndex - 1)}
                    className="p-3 bg-white/5 hover:bg-[#7E4015] border border-[#2D2A26]/20 hover:border-transparent rounded-none transition-all text-[#F8F1E7]"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <div className="max-h-[60vh] max-w-[80vw] overflow-hidden rounded-none shadow-2xl border border-[#2D2A26]/20">
                    <img src={gallery[lightboxIndex].image_url} className="w-full max-h-[60vh] object-contain" alt="" />
                  </div>

                  <button 
                    onClick={() => setLightboxIndex(lightboxIndex === gallery.length - 1 ? 0 : lightboxIndex + 1)}
                    className="p-3 bg-white/5 hover:bg-[#7E4015] border border-[#2D2A26]/20 hover:border-transparent rounded-none transition-all text-[#F8F1E7]"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                {/* Footer caption description */}
                <div className="border-t border-[#2D2A26]/10 pt-4 text-center max-w-xl mx-auto w-full">
                  <p className="text-xs text-gray-300 font-light leading-relaxed">
                    {lang === 'en' ? gallery[lightboxIndex].description_en : gallery[lightboxIndex].description_am}
                  </p>
                  <span className="text-[10px] text-gray-500 mt-2 block font-mono">Asset {lightboxIndex + 1} of {gallery.length}</span>
                </div>

              </div>
            )}

          </div>
        )}

        {/* 8. VIEW: CONTACT & INQUIRY */}
        {currentView === 'contact' && (
          <div className="animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16" id="contact-view">
            
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold tracking-[0.25em] text-[#7E4015] uppercase block">Global Sourcing Desk</span>
              <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#2D2A26] leading-tight">{t.contact_title}</h1>
              <p className="text-xs text-gray-500 leading-relaxed">{t.contact_subtitle}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              
              {/* Form panel */}
              <div className="lg:col-span-7 bg-white p-6 sm:p-10 rounded-none border border-[#2D2A26]/10 shadow-none space-y-6">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#2D2A26]">{t.contact_form_title}</h2>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed uppercase tracking-wider">{t.contact_form_desc}</p>
                </div>

                {inquirySuccess && (
                  <div className="bg-green-50/50 border border-green-200 text-green-800 p-5 rounded-none flex items-start gap-3.5 shadow-none animate-fade-in" id="contact-success-banner">
                    <CheckCircle className="h-6 w-6 shrink-0 text-green-600 mt-0.5" />
                    <div className="text-xs leading-relaxed font-semibold">
                      {t.contact_success_alert}
                    </div>
                  </div>
                )}

                <form onSubmit={handleInquirySubmit} className="space-y-4" id="export-inquiry-form">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">{t.contact_comp_name} *</label>
                      <input type="text" name="company_name" required className="mt-1 block w-full bg-[#F8F1E7]/25 border border-[#2D2A26]/10 focus:border-[#7E4015] rounded-none px-4 py-3 text-xs focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">{t.contact_cont_name} *</label>
                      <input type="text" name="contact_name" required className="mt-1 block w-full bg-[#F8F1E7]/25 border border-[#2D2A26]/10 focus:border-[#7E4015] rounded-none px-4 py-3 text-xs focus:outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">{t.contact_email} *</label>
                      <input type="email" name="email" required className="mt-1 block w-full bg-[#F8F1E7]/25 border border-[#2D2A26]/10 focus:border-[#7E4015] rounded-none px-4 py-3 text-xs focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">{t.contact_phone}</label>
                      <input type="text" name="phone" className="mt-1 block w-full bg-[#F8F1E7]/25 border border-[#2D2A26]/10 focus:border-[#7E4015] rounded-none px-4 py-3 text-xs focus:outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">{t.contact_country}</label>
                      <input type="text" name="country" placeholder="e.g. Switzerland" className="mt-1 block w-full bg-[#F8F1E7]/25 border border-[#2D2A26]/10 focus:border-[#7E4015] rounded-none px-4 py-3 text-xs focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">Specialty Coffee lot</label>
                      <select 
                        name="coffee_type"
                        value={inquiryProductSelect}
                        onChange={(e) => setInquiryProductSelect(e.target.value)}
                        className="mt-1 block w-full bg-[#F8F1E7]/25 border border-[#2D2A26]/10 focus:border-[#7E4015] rounded-none px-4 py-3 text-xs focus:outline-none"
                      >
                        <option value="General Inquiry">General Corporate / Other Inquiry</option>
                        {products.map(p => (
                          <option key={p.id} value={p.title_en}>{p.title_en}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">{t.contact_vol}</label>
                      <input type="text" name="volume_required" placeholder="e.g. 1 FCL, 20 Jute bags" className="mt-1 block w-full bg-[#F8F1E7]/25 border border-[#2D2A26]/10 focus:border-[#7E4015] rounded-none px-4 py-3 text-xs focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">{t.contact_price}</label>
                      <input type="text" name="target_price" placeholder="e.g. $5.80 FOB" className="mt-1 block w-full bg-[#F8F1E7]/25 border border-[#2D2A26]/10 focus:border-[#7E4015] rounded-none px-4 py-3 text-xs focus:outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">{t.contact_msg} *</label>
                    <textarea name="message" required rows={5} placeholder="Describe packaging needs, shipping coordinates, or sample requests..." className="mt-1 block w-full bg-[#F8F1E7]/25 border border-[#2D2A26]/10 focus:border-[#7E4015] rounded-none px-4 py-3 text-xs focus:outline-none" />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      id="inquiry-form-submit"
                      disabled={submittingInquiry}
                      className="w-full flex justify-center py-4 px-4 border border-transparent rounded-none shadow-md text-xs font-bold uppercase tracking-widest text-[#F8F1E7] bg-[#7E4015] hover:bg-[#2D2A26] focus:outline-none transition-all disabled:opacity-50"
                    >
                      {submittingInquiry ? 'Dispatching Inquiry...' : t.contact_submit_btn}
                    </button>
                  </div>
                </form>
              </div>

              {/* Side contact specifics panel */}
              <div className="lg:col-span-5 space-y-8">
                
                {/* Headquarters card */}
                <div className="bg-[#2D2A26] text-[#F8F1E7] p-8 rounded-none border border-[#2D2A26]/10 shadow-none space-y-6">
                  <h3 className="font-serif text-xl font-bold text-[#7E4015]">Addis Ababa Headquarters</h3>
                  
                  <ul className="space-y-4 text-xs font-light text-[#F8F1E7]/85">
                    <li className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-[#7E4015] shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{addressVal}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-[#7E4015] shrink-0" />
                      <span>{phoneVal}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-[#7E4015] shrink-0" />
                      <span>{emailVal}</span>
                    </li>
                  </ul>
                </div>

                {/* Stylized Interactive Map Area */}
                <div className="bg-white border border-[#2D2A26]/10 rounded-none overflow-hidden shadow-none">
                  <div className="p-4 bg-gray-50 border-b border-[#2D2A26]/5 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-mono">Bole road headquarter coordinates</span>
                    <span className="text-[10px] font-bold text-[#7E4015] font-mono">9.0041° N, 38.7779° E</span>
                  </div>
                  {/* Visual Map Representation */}
                  <div className="h-48 bg-[#2D2A26] relative flex items-center justify-center text-center p-4">
                    <div className="absolute inset-0 opacity-15 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524350876685-274059332603?q=80&w=400')" }}></div>
                    <div className="relative z-10 space-y-2">
                      <MapPin className="h-8 w-8 text-[#7E4015] mx-auto animate-bounce" />
                      <h4 className="font-serif font-bold text-white text-sm">Mega Building Sourcing Hub</h4>
                      <p className="text-[10px] text-gray-300 font-light max-w-xs mx-auto">Adjacent to Gedeo Sourcing Office and Addis Custom Clearance Desk</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* 9. VIEW: FAQ */}
        {currentView === 'faq' && (
          <div className="animate-fade-in max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12" id="faq-view">
            
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold tracking-[0.25em] text-[#7E4015] uppercase block">Trade FAQs</span>
              <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#2D2A26] leading-tight">{t.faq_title}</h1>
              <p className="text-xs text-gray-500 leading-relaxed">{t.faq_subtitle}</p>
            </div>

            {/* Accordion list */}
            <div className="space-y-4" id="faq-accordion-list">
              {faqsList.map((faq, fIdx) => {
                const isOpen = faqOpenIndex === fIdx;
                return (
                  <div 
                    key={fIdx}
                    className="bg-white border border-[#2D2A26]/10 rounded-none shadow-none overflow-hidden hover:border-[#7E4015] transition-all duration-300"
                  >
                    <button
                      id={`faq-toggle-${fIdx}`}
                      onClick={() => setFaqOpenIndex(isOpen ? null : fIdx)}
                      className="w-full flex items-center justify-between p-6 text-left transition-colors hover:bg-[#F8F1E7]/25"
                    >
                      <h3 className="font-serif text-base sm:text-lg font-bold text-[#2D2A26] pr-4">
                        {lang === 'en' ? faq.q_en : faq.q_am}
                      </h3>
                      <HelpCircle className={`h-5 w-5 text-[#7E4015] shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-6 pt-1 text-xs sm:text-sm text-gray-500 font-light leading-relaxed border-t border-[#2D2A26]/5 animate-fade-in" id={`faq-answer-${fIdx}`}>
                        {lang === 'en' ? faq.a_en : faq.a_am}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* 10. VIEW: SEARCH RESULTS */}
        {currentView === 'search' && (
          <div className="animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12" id="search-results-view">
            
            <div className="border-b border-[#2D2A26]/10 pb-4">
              <h1 className="text-2xl font-serif font-bold text-[#2D2A26]">
                {t.search_results_title} <span className="text-[#7E4015]">"{searchQuery}"</span>
              </h1>
            </div>

            {/* If no results found */}
            {searchResults.products.length === 0 && searchResults.services.length === 0 && searchResults.news.length === 0 ? (
              <div className="text-center py-16 bg-white border border-[#2D2A26]/10 rounded-none" id="search-empty-state">
                <Coffee className="h-10 w-10 text-[#7E4015] mx-auto opacity-30 mb-3" />
                <p className="text-xs uppercase font-bold tracking-widest text-gray-400">{t.search_no_results}</p>
              </div>
            ) : (
              <div className="space-y-12" id="search-populated-results">
                
                {/* Product search matches */}
                {searchResults.products.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-serif text-lg font-bold text-[#2D2A26] border-l-2 border-[#7E4015] pl-3">Single-Origin Matches</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {searchResults.products.map(p => (
                        <div key={p.id} className="bg-white border border-[#2D2A26]/10 p-5 rounded-none shadow-none flex items-start gap-4">
                          <img src={p.image_url} className="w-16 h-16 object-cover rounded-none border border-[#2D2A26]/5" alt="" />
                          <div className="space-y-1">
                            <h4 onClick={() => viewProductDetail(p.slug)} className="font-serif font-bold text-sm text-[#2D2A26] hover:text-[#7E4015] cursor-pointer line-clamp-1">{lang === 'en' ? p.title_en : p.title_am}</h4>
                            <p className="text-[10px] text-gray-400 font-mono">{p.elevation}</p>
                            <p className="text-xs text-gray-500 line-clamp-1">{lang === 'en' ? p.description_en : p.description_am}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Service matches */}
                {searchResults.services.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-serif text-lg font-bold text-[#2D2A26] border-l-2 border-[#7E4015] pl-3">Sourcing Services Matches</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {searchResults.services.map(s => (
                        <div key={s.id} onClick={() => navigateTo('services')} className="bg-white border border-[#2D2A26]/10 p-5 rounded-none shadow-none cursor-pointer hover:border-[#7E4015]">
                          <h4 className="font-serif font-bold text-sm text-[#2D2A26]">{lang === 'en' ? s.title_en : s.title_am}</h4>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{lang === 'en' ? s.description_en : s.description_am}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* News matches */}
                {searchResults.news.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-serif text-lg font-bold text-[#2D2A26] border-l-2 border-[#7E4015] pl-3">Articles & Reports Matches</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {searchResults.news.map(n => (
                        <div key={n.id} onClick={() => viewNewsDetail(n.slug)} className="bg-white border border-[#2D2A26]/10 p-5 rounded-none shadow-none cursor-pointer hover:border-[#7E4015]">
                          <span className="text-[10px] text-gray-400 font-mono">{new Date(n.published_at).toLocaleDateString()}</span>
                          <h4 className="font-serif font-bold text-sm text-[#2D2A26] mt-0.5">{lang === 'en' ? n.title_en : n.title_am}</h4>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{lang === 'en' ? n.excerpt_en : n.excerpt_am}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

        {/* 11. VIEW: ADMIN CMS DASHBOARD */}
        {currentView === 'admin' && (
          <AdminPanel 
            token={adminToken}
            onLoginSuccess={handleAdminLogin}
            onLogout={handleAdminLogout}
            onSettingsUpdate={fetchCollections}
          />
        )}

      </div>

      {/* Footer element */}
      {currentView !== 'admin' && (
        <Footer
          onNavigate={navigateTo}
          lang={lang}
          onSubscribe={handleNewsletterSubscribe}
          settings={settings}
        />
      )}

    </div>
  );
}
