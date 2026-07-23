import React, { useState } from 'react';
import { Search, Menu, X, Globe } from 'lucide-react';
import logoImage from '../../images/logo5.png';
import { ViewType } from '../types.js';
import { translations } from '../translations.js';
import { pathForView } from '../routing.ts';

interface HeaderProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  lang: 'en' | 'am';
  onLanguageChange: (lang: 'en' | 'am') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
  isAdminLoggedIn: boolean;
  onLogout: () => void;
  settings?: any[];
}

export default function Header({
  currentView,
  onNavigate,
  lang,
  onLanguageChange,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  isAdminLoggedIn,
  onLogout,
  settings
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showHeaderSearch, setShowHeaderSearch] = useState(false);
  const t = translations[lang];

  const siteTitleSetting = settings?.find(s => s.key === 'site_title');
  const siteTitle = lang === 'en' 
    ? (siteTitleSetting?.value_en || 'KONJO BUNA') 
    : (siteTitleSetting?.value_am || 'ኮንጆ ቡና');

  const handleNav = (view: ViewType) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearchSubmit();
      setShowHeaderSearch(false);
    }
  };

  const navItems: { view: ViewType; label: string }[] = [
    { view: 'home', label: t.nav_home },
    { view: 'about', label: t.nav_about },
    { view: 'products', label: t.nav_products },
    { view: 'services', label: t.nav_services },
    { view: 'news', label: t.nav_news },
    { view: 'gallery', label: t.nav_gallery },
    { view: 'faq', label: t.nav_faq },
    { view: 'contact', label: t.nav_contact },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#7E4015] border-b border-[#2D2A26]/10 text-[#2D2A26] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24">
          
          {/* Logo & Brand */}
          <a
            href="/"
            onClick={(event) => { event.preventDefault(); handleNav('home'); }}
            className="flex items-center gap-3 group min-h-11"
            id="header-brand-logo"
          >
            <div className="w-24 h-22 bg-[#7E4015] rounded-none flex items-center justify-center transition-transform duration-500 group-hover:scale-105 shadow-md">
              <img
                src={logoImage}
                width="96"
                height="88"
                alt="Konjo Buna logo"
                className="w-full h-full rounded-none object-cover"
              />
            </div>
            <div>
              <span className="font-serif text-2xl lg:mr-6 tracking-tight leading-none font-bold text-white group-hover:text-[#2D2A26] transition-colors uppercase">
                {siteTitle}
                {/* <span className="font-sans text-[9px] font-bold tracking-[0.25em] text-[#F8F1E7] block mt-1">COFFEE EXPORT</span> */}
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
            {navItems.map((item) => {
              const isActive = currentView === item.view || (item.view === 'products' && currentView === 'product-detail');
              return (
                <a
                  key={item.view}
                  id={`nav-link-${item.view}`}
                  href={pathForView(item.view)}
                  onClick={(event) => { event.preventDefault(); handleNav(item.view); }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`min-h-11 inline-flex items-center py-1 text-xs font-semibold tracking-widest uppercase transition-all relative ${
                    isActive 
                      ? 'text-[#ffffff] font-bold border-b-4 border-[#2D2A26]' 
                      : 'text-[#ffffff] hover:text-[#2D2A26]'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7E4015]"></span>
                  )}
                </a>
              );
            })}
          </nav>

          {/* Controls & Tools */}
          <div className="hidden sm:flex items-center gap-6">
            
            {/* Search Toggle */}
            <div className="relative flex items-center">
              {showHeaderSearch ? (
                <div className="flex items-center gap-2 bg-[#F8F1E7] border border-[#2D2A26]/20 rounded-none px-3 py-1.5 shadow-sm transition-all duration-300 w-64 animate-fade-in">
                  <Search className="h-4 w-4 text-[#7E4015]" />
                  <input
                    type="text"
                    id="header-search-input"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyDown={handleSearchKeyPress}
                    placeholder={t.search_placeholder}
                    aria-label={t.search_placeholder}
                    className="bg-transparent text-xs text-[#2D2A26] focus:outline-none w-full placeholder-[#2D2A26]/50"
                    autoFocus
                  />
                  <button 
                    type="button"
                    onClick={() => setShowHeaderSearch(false)}
                    aria-label="Close search"
                    className="min-h-11 min-w-11 inline-flex items-center justify-center text-[#2D2A26]/60 hover:text-[#2D2A26]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  id="search-toggle-btn"
                  onClick={() => setShowHeaderSearch(true)}
                  className="p-2 text-[#2D2A26]/70 hover:text-[#2D2A26] hover:bg-[#2D2A26]/5 rounded-full transition-all"
                  aria-label="Search website"
                >
                  <Search className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Language Selection preference toggle - Pill Styled */}
            <div className="flex items-center bg-[#2D2A26] text-[#F8F1E7] px-4 py-2 rounded-full shadow-md font-mono select-none">
              <button
                type="button"
                id="lang-btn-en"
                onClick={() => onLanguageChange('en')}
                aria-label="Display website in English"
                aria-pressed={lang === 'en'}
                className={`text-[10px] font-bold tracking-wider transition-all hover:text-white ${
                  lang === 'en' 
                    ? 'opacity-100 text-[#F8F1E7]' 
                    : 'opacity-50 text-[#F8F1E7]/70'
                }`}
              >
                EN
              </button>
              <div className="w-px h-3 bg-[#F8F1E7]/30 mx-3"></div>
              <button
                type="button"
                id="lang-btn-am"
                onClick={() => onLanguageChange('am')}
                aria-label="Display website in Amharic"
                aria-pressed={lang === 'am'}
                className={`text-[10px] font-bold tracking-wider transition-all hover:text-white ${
                  lang === 'am' 
                    ? 'opacity-100 text-[#F8F1E7]' 
                    : 'opacity-50 text-[#F8F1E7]/70'
                }`}
              >
                አማ
              </button>
            </div>

            {/* Admin Profile/Logout Link */}
            {isAdminLoggedIn ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  id="admin-dashboard-btn"
                  onClick={() => handleNav('admin')}
                  className="px-4 py-2 text-[10px] font-bold tracking-wider uppercase border border-[#2D2A26] bg-[#2D2A26] text-[#F8F1E7] hover:bg-transparent hover:text-[#2D2A26] transition-all"
                >
                  CMS Panel
                </button>
                <button
                  type="button"
                  id="admin-logout-btn"
                  onClick={onLogout}
                  className="px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-red-600 hover:text-red-800 transition-all"
                >
                  Logout
                </button>
              </div>
            ) : null}

          </div>

          {/* Mobile Right Bar (Menu Toggle & Lang Switcher) */}
          <div className="flex items-center gap-2 lg:hidden">
            
            {/* Simple Small Lang Switcher */}
            <button
              type="button"
              id="mobile-lang-toggle"
              onClick={() => onLanguageChange(lang === 'en' ? 'am' : 'en')}
              aria-label={lang === 'en' ? 'Switch to Amharic' : 'Switch to English'}
              className="min-h-11 min-w-11 p-2 border border-white/30 bg-white/10 rounded-none flex items-center gap-1.5 text-white text-xs font-bold hover:bg-white/20 transition-all"
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
              <span>{lang === 'en' ? 'አማ' : 'EN'}</span>
            </button>

            {/* Hamburger Toggle */}
            <button
              type="button"
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
              className="min-h-11 min-w-11 p-2 hover:bg-white/10 text-white inline-flex items-center justify-center"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#2D2A26]/10 bg-[#F8F1E7] px-4 pt-4 pb-6 space-y-4 shadow-2xl animate-fade-in-down" id="mobile-navigation-drawer">
          
          {/* Mobile Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-[#7E4015]" />
            <input
              type="text"
              id="mobile-search-input"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyPress}
              placeholder={t.search_placeholder}
              aria-label={t.search_placeholder}
              className="w-full bg-[#F8F1E7] border border-[#2D2A26]/20 rounded-none pl-10 pr-4 py-2 text-sm text-[#2D2A26] focus:outline-none placeholder-[#2D2A26]/50 focus:ring-1 focus:ring-[#7E4015]"
            />
          </div>

          {/* Nav Items List */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = currentView === item.view || (item.view === 'products' && currentView === 'product-detail');
              return (
                <a
                  key={item.view}
                  id={`mobile-nav-${item.view}`}
                  href={pathForView(item.view)}
                  onClick={(event) => { event.preventDefault(); handleNav(item.view); }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full min-h-11 flex items-center text-left px-4 py-2.5 text-xs font-bold tracking-widest uppercase transition-all ${
                    isActive 
                      ? 'bg-[#7E4015] text-[#F8F1E7] shadow-md' 
                      : 'text-[#2D2A26]/80 hover:bg-[#2D2A26]/5'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Admin Logout/Dashboard for mobile */}
          {isAdminLoggedIn && (
            <div className="pt-4 border-t border-[#2D2A26]/10 flex flex-col gap-2">
              <button
                type="button"
                id="mobile-admin-dashboard"
                onClick={() => handleNav('admin')}
                className="w-full py-2.5 text-center text-xs font-bold tracking-widest uppercase border border-[#2D2A26] bg-[#2D2A26] text-[#F8F1E7] hover:bg-[#2D2A26] hover:text-[#2D2A26] transition-all"
              >
                CMS Admin Dashboard
              </button>
              <button
                type="button"
                id="mobile-admin-logout"
                onClick={onLogout}
                className="w-full py-2.5 text-center text-xs font-bold tracking-widest uppercase text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-all"
              >
                Logout Account
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
