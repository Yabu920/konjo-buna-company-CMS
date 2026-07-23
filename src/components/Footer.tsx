import React from 'react';
import { Mail, Phone, MapPin, Youtube, Instagram, Linkedin, Send } from 'lucide-react';
import { ViewType } from '../types.js';
import { translations } from '../translations.js';
import { pathForView } from '../routing.ts';

interface FooterProps {
  onNavigate: (view: ViewType) => void;
  lang: 'en' | 'am';
  onSubscribe: (email: string) => Promise<boolean>;
  settings?: any[];
}

export default function Footer({ onNavigate, lang, onSubscribe, settings }: FooterProps) {
  const t = translations[lang];
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const siteTitleSetting = settings?.find(s => s.key === 'site_title');
  const siteTitle = lang === 'en' 
    ? (siteTitleSetting?.value_en || 'KONJO BUNA') 
    : (siteTitleSetting?.value_am || 'ኮንጆ ቡና');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    const success = await onSubscribe(email);
    if (success) {
      setStatus('success');
      setEmail('');
    } else {
      setStatus('error');
    }
  };

  return (
    <footer className="bg-[#2D2A26] border-t border-[#F8F1E7]/10 text-[#F8F1E7]/80 pt-20 pb-10 font-sans" id="footer-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Column 1: Company Profile */}
          <div className="space-y-6">
            <a
              href="/"
              onClick={(event) => { event.preventDefault(); onNavigate('home'); }}
              className="flex items-center gap-3 group min-h-11"
              id="footer-brand-logo"
            >
              <div className="w-8 h-8 bg-[#7E4015] rounded-full flex items-center justify-center">
                <div className="w-3 h-5 border border-[#F8F1E7] rounded-full"></div>
              </div>
              <h2 className="font-serif text-xl font-bold tracking-tight text-[#F8F1E7] uppercase">
                {siteTitle}
              </h2>
            </a>
            <p className="text-xs text-[#F8F1E7]/60 leading-relaxed font-light">
              {t.footer_tagline}
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-2 pt-2">
              <a href="#" aria-label="Konjo Buna on Instagram" className="min-h-11 min-w-11 inline-flex items-center justify-center p-3 bg-[#2D2A26] border border-[#F8F1E7]/20 hover:border-[#D08A44] hover:text-[#D08A44] text-[#F8F1E7] rounded-none transition-all duration-300">
                <Instagram className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="#" aria-label="Konjo Buna on LinkedIn" className="min-h-11 min-w-11 inline-flex items-center justify-center p-3 bg-[#2D2A26] border border-[#F8F1E7]/20 hover:border-[#D08A44] hover:text-[#D08A44] text-[#F8F1E7] rounded-none transition-all duration-300">
                <Linkedin className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="#" aria-label="Konjo Buna on YouTube" className="min-h-11 min-w-11 inline-flex items-center justify-center p-3 bg-[#2D2A26] border border-[#F8F1E7]/20 hover:border-[#D08A44] hover:text-[#D08A44] text-[#F8F1E7] rounded-none transition-all duration-300">
                <Youtube className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-5">
            <h3 className="font-serif text-xs font-bold text-[#F8F1E7] tracking-[0.2em] uppercase border-b border-[#F8F1E7]/10 pb-2">
              {t.footer_quick_links}
            </h3>
            <ul className="space-y-2 text-xs font-medium uppercase tracking-wider text-[#F8F1E7]/70">
              <li>
                <a href={pathForView('home')} onClick={(event) => { event.preventDefault(); onNavigate('home'); }} className="min-h-11 inline-flex items-center hover:text-[#D08A44] transition-all duration-200">
                  {t.nav_home}
                </a>
              </li>
              <li>
                <a href={pathForView('about')} onClick={(event) => { event.preventDefault(); onNavigate('about'); }} className="min-h-11 inline-flex items-center hover:text-[#D08A44] transition-all duration-200">
                  {t.nav_about}
                </a>
              </li>
              <li>
                <a href={pathForView('products')} onClick={(event) => { event.preventDefault(); onNavigate('products'); }} className="min-h-11 inline-flex items-center hover:text-[#D08A44] transition-all duration-200">
                  {t.nav_products}
                </a>
              </li>
              <li>
                <a href={pathForView('services')} onClick={(event) => { event.preventDefault(); onNavigate('services'); }} className="min-h-11 inline-flex items-center hover:text-[#D08A44] transition-all duration-200">
                  {t.nav_services}
                </a>
              </li>
              <li>
                <a href={pathForView('news')} onClick={(event) => { event.preventDefault(); onNavigate('news'); }} className="min-h-11 inline-flex items-center hover:text-[#D08A44] transition-all duration-200">
                  {t.nav_news}
                </a>
              </li>
              <li>
                <a href={pathForView('gallery')} onClick={(event) => { event.preventDefault(); onNavigate('gallery'); }} className="min-h-11 inline-flex items-center hover:text-[#D08A44] transition-all duration-200">
                  {t.nav_gallery}
                </a>
              </li>
              <li>
                <a href={pathForView('faq')} onClick={(event) => { event.preventDefault(); onNavigate('faq'); }} className="min-h-11 inline-flex items-center hover:text-[#D08A44] transition-all duration-200">
                  {t.nav_faq}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact Details */}
          <div className="space-y-5">
            <h3 className="font-serif text-xs font-bold text-[#F8F1E7] tracking-[0.2em] uppercase border-b border-[#F8F1E7]/10 pb-2">
              {t.footer_contact_info}
            </h3>
            <ul className="space-y-3.5 text-xs text-[#F8F1E7]/70 leading-relaxed font-light">
              <li className="flex items-start gap-3">
                <MapPin className="h-4.5 w-4.5 text-[#7E4015] shrink-0 mt-0.5" />
                <span>{addressVal}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-[#7E4015] shrink-0" />
                <span className="font-mono">{phoneVal}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-[#7E4015] shrink-0" />
                <span className="font-mono">{emailVal}</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Newsletter Box */}
          <div className="space-y-5">
            <h3 className="font-serif text-xs font-bold text-[#F8F1E7] tracking-[0.2em] uppercase border-b border-[#F8F1E7]/10 pb-2">
              {t.footer_newsletter_title}
            </h3>
            <p className="text-xs text-[#F8F1E7]/60 font-light leading-relaxed">
              {t.footer_newsletter_desc}
            </p>
            <form onSubmit={handleSubmit} className="space-y-2" id="footer-newsletter-form">
              <label htmlFor="footer-email-input" className="sr-only">{t.footer_newsletter_title}</label>
              <div className="relative">
                <input
                  type="email"
                  id="footer-email-input"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-[#2D2A26] border border-[#F8F1E7]/20 focus:border-[#7E4015] rounded-none px-4 py-3 text-xs text-[#F8F1E7] placeholder-[#F8F1E7]/30 focus:outline-none font-mono"
                />
                <button
                  type="submit"
                  id="footer-email-submit"
                  aria-label="Subscribe to newsletter"
                  className="absolute right-0 top-0 min-h-11 min-w-11 inline-flex items-center justify-center p-2 bg-[#7E4015] hover:bg-[#A45C20] text-[#F8F1E7] border border-[#F8F1E7]/20 rounded-none transition-all"
                  disabled={status === 'loading'}
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              {status === 'success' && (
                <p role="status" className="text-[10px] text-green-300 font-semibold tracking-wider uppercase">✓ {t.newsletter_success}</p>
              )}
              {status === 'error' && (
                <p role="alert" className="text-[10px] text-red-300 font-semibold tracking-wider uppercase">✗ Enter a valid email address.</p>
              )}
            </form>
          </div>

        </div>

        {/* Divider */}
        <div className="border-t border-[#F8F1E7]/10 pt-8 mt-8 flex flex-col md:flex-row items-center justify-between text-[10px] tracking-widest uppercase text-[#F8F1E7]/40 font-bold gap-4">
          <div className="flex gap-6">
            <span>SCA Member</span>
            <span>ISO 22000 Certified</span>
            <span>Rainforest Alliance</span>
          </div>
          <div className="flex items-center gap-4">
            <span>© 2026 Konjo Coffee PLC With BlueCode Technology solution</span>
            <span className="opacity-20">|</span>
            <a
              href="/admin"
              id="tiny-admin-login-link"
              onClick={(event) => { event.preventDefault(); onNavigate('admin'); }}
              className="min-h-11 inline-flex items-center font-bold text-[#D08A44] hover:text-[#F8F1E7] transition-all"
            >
              Admin Portal
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
