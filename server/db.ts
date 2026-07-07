import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Types for our bilingual relational schema
export interface Admin {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: string;
}

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
  product_id: string; // empty if general
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

export interface DatabaseSchema {
  admins: Admin[];
  product_categories: ProductCategory[];
  products: Product[];
  services: Service[];
  news_posts: NewsPost[];
  gallery_images: GalleryImage[];
  inquiries: Inquiry[];
  newsletter_subscribers: NewsletterSubscriber[];
  site_settings: SiteSettings[];
}

const DB_FILE = path.join(process.cwd(), 'database.json');

// Helper to hash passwords using native pbkdf2
export function hashPassword(password: string): string {
  const salt = 'konjo_coffee_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Default initial seed data (Bilingual premium Ethiopian export details)
const INITIAL_DATABASE: DatabaseSchema = {
  admins: [
    {
      id: 'admin-1',
      username: 'admin',
      passwordHash: hashPassword('admin123'), // Secure default but easily changeable in production
      name: 'Konjo Export Administrator',
      role: 'Superadmin'
    }
  ],
  product_categories: [
    {
      id: 'cat-raw',
      slug: 'raw-green-coffee',
      name_en: 'Premium Green Coffee Beans',
      name_am: 'ጥሬ ቡና ፍሬዎች (ላኪ)',
      description_en: 'Unroasted specialty arabica beans processed in Yirgacheffe, Sidamo, and Guji washing stations, sorted to export Grade 1 and 2.',
      description_am: 'በይርጋጨፌ፣ በሲዳሞ እና በጉጂ ማጠቢያ ጣቢያዎች የተቀነባበሩ፣ ደረጃ 1 እና 2 ለኤክስፖርት የተመረጡ ያልተቆሉ ልዩ የአረቢካ ቡና ፍሬዎች።'
    },
    {
      id: 'cat-roasted',
      slug: 'roasted-coffee',
      name_en: 'Craft Roasted Single-Origin',
      name_am: 'የተቆላ የአንድ አካባቢ ቡና',
      description_en: 'Expertly roasted in small batches to unleash the floral, berry, and dark chocolate profiles native to Ethiopian highlands.',
      description_am: 'የኢትዮጵያ ደጋማ ቦታዎች ተወላጅ የሆኑትን የአበባ፣ የቤሪ እና የጥቁር ቸኮሌት ጣዕሞችን ለመግለጥ በትንንሽ ክፍሎች በባለሙያ የተቆላ።'
    },
    {
      id: 'cat-specialty',
      slug: 'specialty-microlots',
      name_en: 'Rare Micro-lots & Gesha',
      name_am: 'ልዩ ጥሬ እምቡጦች እና ጌሻ',
      description_en: 'Extremely rare single-farm lots, anaerobic fermentations, and wild Gesha forest harvests with cup scores above 88+.',
      description_am: 'እጅግ በጣም ጥቂት የአንድ እርሻ ሰብሎች፣ የአናኢሮቢክ ፍላት እና የዱር ጌሻ ደን ምርቶች ከ88 በላይ የኩባያ ነጥብ ያላቸው።'
    }
  ],
  products: [
    {
      id: 'prod-yirgacheffe-g1',
      category_id: 'cat-raw',
      slug: 'yirgacheffe-g1-washed',
      title_en: 'Yirgacheffe Grade 1 Washed',
      title_am: 'ይርጋጨፌ ደረጃ 1 የታጠበ',
      description_en: 'The crown jewel of washed coffees. Intensely floral with striking jasmine, lemon zest, and bergamot finish.',
      description_am: 'የታጠቡ ቡናዎች ዋና ጌጥ። ጠንካራ የዕፅዋት መዓዛ ከጃስሚን፣ ከሎሚ ልጣጭ እና ከቤርጋሞት ጣዕም ጋር።',
      content_en: 'Our Yirgacheffe Grade 1 is sourced from high-altitude cooperative washing stations in Gedeo zone at 1,900 to 2,200 MASL. Carefully hand-sorted to achieve zero physical defects, then sun-dried on raised African beds. This lot exhibits exceptional clarity and a delicate tea-like body.',
      content_am: 'የእኛ ይርጋጨፌ ደረጃ 1 በጌዴኦ ዞን ከ1,900 እስከ 2,200 ሜትር ከፍታ ባላቸው ህብረት ሥራ ማጠቢያ ጣቢያዎች የሚሰበሰብ ነው። ምንም ዓይነት የአካል ጉድለት እንዳይኖረው በጥንቃቄ በእጅ ተለይቶ ከዚያም በአፍሪካ ከፍ ባሉ አልጋዎች ላይ በፀሐይ የደረቀ ነው። ይህ ቡና ልዩ ጥራትና እንደ ሻይ ያለ ቀጭን አካል ያሳያል።',
      origin_en: 'Gedeo Zone, Yirgacheffe, Ethiopia',
      origin_am: 'ጌዴኦ ዞን፣ ይርጋጨፌ፣ ኢትዮጵያ',
      grade_en: 'Grade 1, Screen 14+',
      grade_am: 'ደረጃ 1፣ ስክሪን 14+',
      processing_en: 'Fully Washed & Sun Dried on Raised Beds',
      processing_am: 'ሙሉ በሙሉ የታጠበ እና ከፍ ባሉ አልጋዎች ላይ በፀሐይ የደረቀ',
      packaging_en: '60kg GrainPro lined jute bags',
      packaging_am: 'ባለ 60 ኪሎ ግራም ግሬንፕሮ የውስጥ ሽፋን ያለው የጁት ከረጢት',
      availability_en: 'In stock / Seasonal container contracts available',
      availability_am: 'በክምችት ላይ ይገኛል / የወቅታዊ ኮንቴይነር ኮንትራቶች ይገኛሉ',
      price_en: 'Inquire for FOB Djibouti pricing',
      price_am: 'ለFOB ጅቡቲ ዋጋ ጥያቄ ያቅርቡ',
      image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=800',
      elevation: '1,950m - 2,200m',
      is_featured: true,
      created_at: '2026-01-10T12:00:00Z'
    },
    {
      id: 'prod-sidamo-g2-natural',
      category_id: 'cat-raw',
      slug: 'sidamo-g2-natural',
      title_en: 'Sidamo Grade 2 Natural',
      title_am: 'ሲዳሞ ደረጃ 2 ተፈጥሯዊ',
      description_en: 'A beautiful natural arabica offering heavy syrupy body, deep stone fruit notes, and a milk chocolate undertone.',
      description_am: 'ከባድ የወለላ ፈሳሽ አካል፣ ጥልቅ የኮክ ጣዕም እና የወተት ቸኮሌት ድምፅ ያለው ውብ ተፈጥሯዊ አረቢካ።',
      content_en: 'Processed in the Sidama region, this natural dry-processed coffee is dried with the cherry intact. This traditional method allows the natural sugars of the mucilage to saturate the bean, yielding heavy body and sweet red fruit flavors like strawberry and plum.',
      content_am: 'በሲዳማ ክልል የተቀነባበረው ይህ ተፈጥሯዊ ደረቅ-የተቀነባበረ ቡና ከነፍሬው እንዲደርቅ ይደረጋል። ይህ ባህላዊ ዘዴ የፍራፍሬው ተፈጥሯዊ ስኳር ወደ ፍሬው ውስጥ እንዲገባ በማድረግ ከባድ አካል እና እንደ እንጆሪ እና ፕለም ያሉ ጣፋጭ ቀይ የፍራፍሬ ጣዕሞችን ይሰጣል።',
      origin_en: 'Sidama Zone, Ethiopia',
      origin_am: 'ሲዳማ ዞን፣ ኢትዮጵያ',
      grade_en: 'Grade 2',
      grade_am: 'ደረጃ 2',
      processing_en: 'Natural / Dry Processed',
      processing_am: 'ተፈጥሯዊ / ደረቅ አሰራር',
      packaging_en: '60kg Jute bags with GrainPro barrier',
      packaging_am: 'ባለ 60 ኪሎ ግራም የጁት ከረጢት ከግሬንፕሮ መከላከያ ጋር',
      availability_en: 'Immediate shipment (Spot & Forward)',
      availability_am: 'ፈጣን ጭነት (ስፖት እና ፎርዋርድ)',
      price_en: 'Competitive bulk contracts',
      price_am: 'ተወዳዳሪ የጅምላ ውሎች',
      image_url: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=800',
      elevation: '1,800m - 2,050m',
      is_featured: true,
      created_at: '2026-01-12T12:00:00Z'
    },
    {
      id: 'prod-guji-g1-anaerobic',
      category_id: 'cat-specialty',
      slug: 'guji-anaerobic-microlot',
      title_en: 'Guji Anaerobic Fermentation G1',
      title_am: 'ጉጂ አናኢሮቢክ ፍላት ደረጃ 1',
      description_en: 'An experimental masterpiece. 72-hour oxygen-deprived fermentation yielding complex tropical fruit and red wine profiles.',
      description_am: 'የሙከራ ድንቅ ስራ። 72 ሰአታት ከኦክስጅን ውጭ እንዲፈላ ተደርጎ የተዘጋጀ፣ ውስብስብ ሞቃታማ ፍራፍሬዎችና የቀይ ወይን ጣዕም ያለው።',
      content_en: 'Our Guji microlot undergoes anaerobically sealed fermentation in stainless steel tanks prior to drying. This precision processing accentuates vibrant acidity, rum raisin warmth, and intense notes of mango and passionfruit. Awarded an 89.5 SCA cup score.',
      content_am: 'የእኛ የጉጂ ማይክሮሎት ከመድረቁ በፊት በባዮ-ታሸጉ የፌሮ ታንኮች ውስጥ አናኢሮቢክ ፍላት ያልፋል። ይህ ጥንቃቄ የተሞላበት ሂደት ደማቅ የአሲድነት፣ የሩም ዘቢብ ሙቀት እና ጠንካራ የማንጎ እና የፓሽን ፍሩት ጣዕሞችን ጎልቶ እንዲወጣ ያደርገዋል። 89.5 የSCA ዋንጫ ውጤት ተሰጥቶታል።',
      origin_en: 'Shakisso, Guji Zone, Ethiopia',
      origin_am: 'ሻኪሶ፣ ጉጂ ዞን፣ ኢትዮጵያ',
      grade_en: 'Specialty Micro-lot G1',
      grade_am: 'ልዩ ማይክሮ-ሎት ደረጃ 1',
      processing_en: '72-Hour Anaerobic Natural',
      processing_am: 'ባለ 72 ሰዓት አናኢሮቢክ ተፈጥሯዊ',
      packaging_en: '30kg vacuum-packed boxes',
      packaging_am: 'ባለ 30 ኪሎ ግራም በቫኪዩም የታሸጉ ሳጥኖች',
      availability_en: 'Limited release (Only 45 bags left)',
      availability_am: 'ውስን ምርት (45 ከረጢቶች ብቻ የቀሩ)',
      price_en: 'Premium micro-lot pricing on demand',
      price_am: 'ልዩ ማይክሮ-ሎት ዋጋ በጥያቄ ላይ',
      image_url: 'https://images.unsplash.com/photo-1511537190424-bbbab87ac5eb?q=80&w=800',
      elevation: '2,050m - 2,250m',
      is_featured: true,
      created_at: '2026-01-15T12:00:00Z'
    },
    {
      id: 'prod-espresso-roast',
      category_id: 'cat-roasted',
      slug: 'konjo-espresso-roast',
      title_en: 'Konjo Dark Espresso Roast',
      title_am: 'ኮንጆ የከረረ ኤስፕሬሶ ቁል',
      description_en: 'A bold, sophisticated blend of Sidamo and Limu. Roasted slow and dark to draw rich molasses and roasted cacao profiles.',
      description_am: 'የሲዳሞ እና የሊሙ ደማቅና የተራቀቀ ውህደት። የበለጸገ ሞላሰስ እና የተቆላ ካካዎ ጣዕምን ለመሳብ በዝግታና በከረረ መልኩ የተቆላ።',
      content_en: 'Crafted for commercial espresso machines and coffee lovers who appreciate deep, robust body. This roast showcases how high-density Ethiopian highland beans handle dark roasts without losing their intrinsic sweet stone fruit undertones.',
      content_am: 'ጥልቅ እና ጠንካራ አካልን ለሚያደንቁ የንግድ ኤስፕሬሶ ማሽኖች እና ለቡና ወዳዶች የተዘጋጀ። ይህ ቁል ከፍተኛ እፍጋት ያላቸው የኢትዮጵያ ደጋማ ቦታ ቡናዎች ውስጣዊ ጣፋጭ የኮክ ፍንጮቻቸውን ሳያጡ የከረረ ቁልን እንዴት መቋቋም እንደሚችሉ ያሳያል።',
      origin_en: 'Bilingual highlands blend (Sidamo/Limu)',
      origin_am: 'የደጋማ ቦታዎች ውህደት (ሲዳሞ/ሊሙ)',
      grade_en: 'Roasted Coffee, Whole Bean',
      grade_am: 'የተቆላ ቡና፣ ሙሉ ፍሬ',
      processing_en: 'Mixed processing, meticulously roasted in-house',
      processing_am: 'የተቀላቀለ ዝግጅት፣ በቤት ውስጥ በጥንቃቄ የተቆላ',
      packaging_en: '250g, 500g, or 1kg Degassing-valved bags',
      packaging_am: 'ባለ 250ግ፣ 500ግ፣ ወይም 1ኪግ ጋዝ ማስወገጃ ቫልቭ ያለው ከረጢት',
      availability_en: 'Fresh roast to order, global air cargo available',
      availability_am: 'ትኩስ ቁል በትእዛዝ መሰረት፣ አለም አቀፍ የአየር ጭነት አለ',
      price_en: '$14.00 per kg (Wholesale discounts apply)',
      price_am: '$14.00 በኪሎ ግራም (የጅምላ ቅናሾች አሉ)',
      image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800',
      elevation: '1,850m - 2,100m',
      is_featured: false,
      created_at: '2026-02-01T12:00:00Z'
    },
    {
      id: 'prod-harrar-g4',
      category_id: 'cat-raw',
      slug: 'harrar-g4-wild',
      title_en: 'Harrar Longberry G4 Natural',
      title_am: 'ሐረር ሎንግቤሪ ደረጃ 4 ተፈጥሯዊ',
      description_en: 'Wild, rustic, and winey. Intense dried blueberry aroma with a black tea finish and syrupy texture.',
      description_am: 'የዱር፣ የገጠር እና ወይን መሳይ ጣዕም። ከባድ የደረቀ ሰማያዊ ቤሪ መዓዛ በጥቁር ሻይ ማጠናቀቂያ እና በፈሳሽ ወለላ ይዘት።',
      content_en: 'Grown in the dry eastern highlands of Harrar where coffee bushes grow wild in backyard gardens, this traditional dry-process bean is sorted as Longberry. Known for its intense, complex acidity and strong dry berry fragrances.',
      content_am: 'ቡና በጓሮ የአትክልት ስፍራዎች ውስጥ በዱር በሚበቅልበት በደረቁ ምስራቃዊ የሐረር ደጋማ ቦታዎች የሚበቅል ሲሆን ይህ ባህላዊ ደረቅ-ሂደት ፍሬ እንደ ሎንግቤሪ ይመደባል። በከፍተኛ፣ ውስብስብ አሲድነት እና በጠንካራ የደረቀ ቤሪ መዓዛ ይታወቃል።',
      origin_en: 'Harrar Highlands, Eastern Ethiopia',
      origin_am: 'ሐረር ደጋማ ቦታዎች፣ ምስራቅ ኢትዮጵያ',
      grade_en: 'Grade 4, Export Quality',
      grade_am: 'ደረጃ 4፣ ለኤክስፖርት የሚበቃ',
      processing_en: 'Traditional Sun-Dried Natural',
      processing_am: 'ባህላዊ በፀሐይ የደረቀ ተፈጥሯዊ',
      packaging_en: '60kg Jute bags',
      packaging_am: 'ባለ 60 ኪሎ ግራም የጁት ከረጢት',
      availability_en: 'Seasonal crop contracts open',
      availability_am: 'የወቅቱ ሰብል ውሎች ተከፍተዋል',
      price_en: 'Inquire for price lists',
      price_am: 'የዋጋ ዝርዝሮችን በጥያቄ ይጠይቁ',
      image_url: 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?q=80&w=800',
      elevation: '1,600m - 1,850m',
      is_featured: false,
      created_at: '2026-01-18T12:00:00Z'
    }
  ],
  services: [
    {
      id: 'srv-processing',
      slug: 'coffee-processing',
      title_en: 'High-Altitude Processing Stations',
      title_am: 'ከፍተኛ ከፍታ ላይ ያሉ ማቀነባበሪያ ጣቢያዎች',
      description_en: 'We operate state-of-the-art wet mills and raised drying beds across Sidamo and Yirgacheffe, maintaining direct control over honey, washed, and natural fermentation.',
      description_am: 'በሲዳሞ እና ይርጋጨፌ ዘመናዊ የታጠቡ ወፍጮዎችን እና ከፍ ያሉ ማድረቂያ አልጋዎችን እናሰራለን ፣ ማር ፣ የታጠበ እና ተፈጥሯዊ ፍላትን በቀጥታ እንቆጣጠራለን።',
      content_en: 'Quality begins at the station. Konjo Coffee operates eight washing and dry milling facilities in Ethiopia\'s finest coffee growing sectors. Our facilities utilize eco-friendly pulpers, recirculated pure spring water for fermentation, and meticulously trained sorters who inspect dried parchment coffee to meet specialty Grade 1 and Grade 2 parameters before shipping.',
      content_am: 'ጥራት ከጣቢያው ይጀምራል። ኮንጆ ቡና በኢትዮጵያ ምርጥ የቡና ልማት ዘርፎች ስምንት የማጠብና ደረቅ መፍጫ ተቋማትን ያንቀሳቅሳል። የእኛ ተቋማት ለአካባቢ ተስማሚ የሆኑ ጥራጥሬዎችን፣ ለፍላት የሚሆን ንጹህ የምንጭ ውሃ እና የተዘጋጁ ልዩ ደረጃ 1 እና ደረጃ 2 መለኪያዎችን ለማሟላት የደረቀ የፓርችመንት ቡናን የሚመረምሩ በጥንቃቄ የሰለጠኑ ደጋፊዎችን ይጠቀማሉ።',
      icon_name: 'Layers',
      image_url: 'https://images.unsplash.com/photo-1524350876685-274059332603?q=80&w=800'
    },
    {
      id: 'srv-export',
      slug: 'global-export-logistics',
      title_en: 'Global Export & Customs Clearance',
      title_am: 'አለም አቀፍ ኤክስፖርት እና የጉምሩክ ክሊራንስ',
      description_en: 'Full container load (FCL) and less than container load (LCL) consolidation, coordinating from Addis Ababa dry port through Djibouti sea lane to any global port.',
      description_am: 'ሙሉ የኮንቴይነር ጭነት (FCL) እና ከኮንቴይነር ያነሰ ጭነት (LCL) ማጠናከሪያ፣ ከአዲስ አበባ ደረቅ ወደብ በጅቡቲ የባህር መስመር በኩል ወደ ማንኛውም የአለም ወደብ ማስተካከል።',
      content_en: 'Navigating export customs, phytosanitary certifications, and coffee quality authority (ECX/Coffee & Tea Authority) approvals is our expertise. We manage the entire administrative pipeline. Each container is loaded under strict moisture-level and relative-humidity inspections with food-grade silica gel desiccants and cargo-worthy packaging.',
      content_am: 'የኤክስፖርት ጉምሩክን፣ የዕፅዋት ንጽህና ማረጋገጫዎችን እና የቡና ጥራት ባለስልጣን (ECX/የቡና እና ሻይ ባለስልጣን) ፈቃዶችን ማሰስ የእኛ ሙያ ነው። አጠቃላይ የአስተዳደር መስመርን እንመራለን። እያንዳንዱ ኮንቴይነር በአየር-እርጥበት ደረጃ ቁጥጥር ስር የምግብ ደረጃ የሲሊካ ጄል ማድረቂያዎችን እና ተስማሚ ማሸጊያዎችን በመጠቀም ይጫናል።',
      icon_name: 'Globe',
      image_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=800'
    },
    {
      id: 'srv-partnerships',
      slug: 'roaster-partnerships',
      title_en: 'Direct Trade Roaster Partnerships',
      title_am: 'የቀጥታ ንግድ አጋርነቶች',
      description_en: 'We establish transparent, long-term trade relations directly with global coffee roasters, providing customized micro-lot preparation and origin trip transparency.',
      description_am: 'በአለም አቀፍ ደረጃ ከሚገኙ የቡና ቆዪዎች ጋር ቀጥተኛና ግልጽ የረጅም ጊዜ የንግድ ግንኙነቶችን እንመሰርታለን፣ ይህም ብጁ የማይክሮ-ሎት ዝግጅት እና የጉዞ ግልጽነትን ይሰጣል።',
      content_en: 'We believe coffee is a bridge between communities. Through our Direct Trade Partnerships, global specialty roasters can pre-book crops, direct custom anaerobic fermentation parameters, and trace their beans down to the exact sub-kebele and family farm plot that harvested them. We host roasting partners at our facilities during harvesting season (November to January).',
      content_am: 'ቡና በማህበረሰቦች መካከል ድልድይ ነው ብለን እናምናለን። በእኛ የቀጥታ ንግድ አጋርነቶች አማካኝነት የአለም አቀፍ ልዩ ቆዪዎች ሰብሎችን አስቀድመው መያዝ፣ ብጁ የአናኢሮቢክ ፍላት መለኪያዎችን መምራት እና ቡናቸውን እስከሰበሰቡት ትክክለኛ ንዑስ ቀበሌ እና የቤተሰብ እርሻ ቦታ ድረስ መከታተል ይችላሉ። በምርት ዘመን (ከህዳር እስከ ጥር) የቆዪ አጋሮችን በተቋማችን እናስተናግዳለን።',
      icon_name: 'Handshake',
      image_url: 'https://images.unsplash.com/photo-1542435503-956c469947f6?q=80&w=800'
    }
  ],
  news_posts: [
    {
      id: 'news-1',
      slug: 'ethiopian-harvest-outlook-2026',
      title_en: 'Ethiopian Coffee Harvest Outlook: Single-Origin Quality Escalates',
      title_am: 'የኢትዮጵያ የቡና ምርት እይታ፡ የጥራት ደረጃው እየጨመረ ነው',
      excerpt_en: 'Perfect rainfall patterns in Gedeo and Sidama highlands lead to dense cherry development and pristine cup quality for the upcoming export crop.',
      excerpt_am: 'በጌዴኦ እና በሲዳማ ደጋማ ቦታዎች ላይ ፍጹም የሆነ የዝናብ ስርጭት ለቀጣዩ የኤክስፖርት ሰብል ጥቅጥቅ ያለ ፍሬ እና አስደናቂ የጽዋ ጥራት አስገኝቷል።',
      content_en: 'We are delighted to report from our origin stations that the 2026 crop is displaying exceptional density and sugar-brix levels. Due to well-distributed late rains in October, the cherries matured slowly, maximizing acid complexity and natural sweetness. We anticipate green coffee sorting to commence in December, with export shipping lanes active starting early March. Bookings for early-season washed Yirgacheffe and Sidamo contracts are now officially open to roasters worldwide.',
      content_am: 'ከጣቢያዎቻችን እንደደረሰን መረጃ፣ የ2026 ምርት ከፍተኛ እፍጋት እና የስኳር-ብሪክስ ደረጃዎችን እያሳየ ነው። በጥቅምት ወር በጥሩ ሁኔታ በተሰራጨው ዘግይቶ ዝናብ ምክንያት ፍሬዎቹ ቀስ ብለው ደርቀዋል፣ ይህም የአሲድ ውስብስብነትን እና የተፈጥሮ ጣፋጭነትን ከፍ አድርጓል። በጥቅምት ወር መጨረሻ ላይ ጥሬ ቡና መለየት እንደሚጀምር እና የወጪ ጭነት መስመሮች ከመጋቢት መጀመሪያ ጀምሮ እንደሚንቀሳቀሱ እንጠብቃለን።',
      category_en: 'Harvest Report',
      category_am: 'የምርት ሪፖርት',
      image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800',
      author_en: 'Ashenafi Hailu, Origin Operations Director',
      author_am: 'አሸናፊ ኃይሉ፣ የጣቢያ ዋና ዳይሬክተር',
      published_at: '2026-06-28T09:00:00Z'
    },
    {
      id: 'news-2',
      slug: 'sustainability-at-konjo-buna',
      title_en: 'Empowering Farmers: Sustainable Washing Stations',
      title_am: 'ገበሬዎችን ማጎልበት፡ ዘላቂ የማጠብ ጣቢያዎች',
      excerpt_en: 'Konjo Buna introduces advanced water-recirculation systems to protect rivers in Sidamo from acidic processing runoff while increasing farmer premiums by 18%.',
      excerpt_am: 'ኮንጆ ቡና በሲዳሞ የሚገኙ ወንዞችን ከአሲዳማ ፈሳሾች ለመጠበቅ የላቀ የውሃ መልሶ ማሰራጫ ዘዴዎችን ያስተዋወቀ ሲሆን የገበሬዎችን ተጠቃሚነት በ18 በመቶ አሳድጓል።',
      content_en: 'As part of our commitment to eco-friendly export and environmental stewardship, Konjo Coffee has successfully rolled out modern recycling pulp machines in our three largest washing stations. These machines reduce processing water intake by 70% and filter organic waste into fertile agricultural compost, which is distributed back to local smallholders free of charge. Simultaneously, our direct trade premium payout was elevated to 18% above fair trade standards to safeguard farming households in these inflationary times.',
      content_am: 'ለአካባቢ ተስማሚ የወጪ ንግድ እና ለአካባቢ ጥበቃ ያለንን ቁርጠኝነት አካል አድርጎ ኮንጆ ቡና በሶስቱ ትላልቅ ማጠቢያ ጣቢያዎቻችን ዘመናዊ የውሃ መልሶ ማሰራጫ ማሽኖችን በተሳካ ሁኔታ አስገብቷል። እነዚህ ማሽኖች ለማቀነባበር የሚወስደውን ውሃ በ70% የሚቀንሱ ሲሆን ኦርጋኒክ ቆሻሻን ለአካባቢው አነስተኛ ገበሬዎች ከክፍያ ነፃ ወደሚከፋፈል ለም ማዳበሪያነት ይቀይራሉ። በተመሳሳይ በነዚህ የዋጋ ንረት ወቅቶች የእርሻ አባወራዎችን ለመጠበቅ የቀጥታ የንግድ ክፍያችን ከፍትሃዊ የንግድ መስፈርቶች 18 በመቶ ከፍ እንዲል ተደርጓል።',
      category_en: 'Sustainability',
      category_am: 'ዘላቂነት',
      image_url: 'https://images.unsplash.com/photo-1542435503-956c469947f6?q=80&w=800',
      author_en: 'Sara Demeke, Sustainability Officer',
      author_am: 'ሳራ ደመቀ፣ የዘላቂነት ኦፊሰር',
      published_at: '2026-05-15T09:00:00Z'
    }
  ],
  gallery_images: [
    {
      id: 'gal-1',
      category_en: 'Coffee Farming',
      category_am: 'ቡና እርሻ',
      title_en: 'Highland Forest Arabica Trees',
      title_am: 'የደጋ ጫካ አረቢካ ዛፎች',
      image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800',
      description_en: 'Shade-grown coffee growing naturally under indigenous forest canopies in Guji at 2,100 meters above sea level.',
      description_am: 'በባህላዊ የደን ጥላ ስር በጉጂ ዞን በባህር ጠለል በላይ በ2,100 ሜትር ከፍታ ላይ በደህንነት የሚበቅል ቡና።'
    },
    {
      id: 'gal-2',
      category_en: 'Processing',
      category_am: 'ማቀነባበር',
      title_en: 'Raised Drying Beds in Gedeo',
      title_am: 'በጌዴኦ ላይ ከፍ ያሉ ማድረቂያ አልጋዎች',
      image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=800',
      description_en: 'Specialty arabica parchment beans undergoing natural solar drying with consistent hand rotation on elevated bamboo screens.',
      description_am: 'በቀርከሃ አልጋዎች ላይ የማያቋርጥ በእጅ ማዞር የሚደረግላቸው ልዩ የአረቢካ የፓርችመንት ፍሬዎች በፀሐይ መድረቅ ላይ።'
    },
    {
      id: 'gal-3',
      category_en: 'Ceremony',
      category_am: 'ባህላዊ ስነ-ስርዓት',
      title_en: 'Traditional Coffee Roast & Brew',
      title_am: 'ባህላዊ የቡና አቆላል እና ፍላት',
      image_url: 'https://images.unsplash.com/photo-1511537190424-bbbab87ac5eb?q=80&w=800',
      description_en: 'Celebrating the legendary heritage of Buna through the traditional roasting pan, incense, and clay Jebena pot.',
      description_am: 'የቡናን ታሪካዊ ቅርስ በባህላዊ መቁያ ምጣድ፣ እጣን እና በሸክላ ጀበና በማክበር ስነ-ስርዓት።'
    },
    {
      id: 'gal-4',
      category_en: 'Export Packing',
      category_am: 'ለኤክስፖርት ማሸግ',
      title_en: 'Stenciled Export Jute Bags',
      title_am: 'የታተሙ የኤክስፖርት የጁት ከረጢቶች',
      image_url: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=800',
      description_en: 'Freshly packed specialty green coffee marked with plantation trace coordinates, ready for shipping container sealing.',
      description_am: 'የእርሻ መከታተያ መጋጠሚያዎች ምልክት የተደረገባቸው ትኩስ የታሸጉ ልዩ ጥሬ ቡናዎች ለኮንቴይነር ዝግጁ ሆነው።'
    }
  ],
  inquiries: [
    {
      id: 'inq-1',
      company_name: 'Geneva Roasters SA',
      contact_name: 'Marc Dubois',
      email: 'marc@genevaroasters.ch',
      phone: '+41 22 799 0101',
      country: 'Switzerland',
      product_id: 'prod-yirgacheffe-g1',
      coffee_type: 'Yirgacheffe Grade 1 Washed',
      volume_required: '1 FCL (19.2 Metric Tons)',
      target_price: '$5.80 / lb FOB Djibouti',
      message: 'We are looking to secure our washed Yirgacheffe G1 allocations for the 2026 shipping season. Please provide your available volumes, contract options, and sample dispatch details.',
      status: 'new',
      created_at: '2026-07-02T15:30:00Z'
    },
    {
      id: 'inq-2',
      company_name: 'Tokyo Specialty Importers',
      contact_name: 'Yuki Sato',
      email: 'y.sato@coffeeimport.jp',
      phone: '+81 3 5500 9988',
      country: 'Japan',
      product_id: 'prod-guji-g1-anaerobic',
      coffee_type: 'Guji Anaerobic Fermentation G1',
      volume_required: '30 Vacuum-packed Boxes (900 kg)',
      target_price: '$12.50 / kg',
      message: 'Interested in securing this exclusive anaerobic micro-lot. Please send sample cupping details and let us know if vacuum packing is customizable.',
      status: 'contacted',
      created_at: '2026-07-01T10:15:00Z'
    }
  ],
  newsletter_subscribers: [
    {
      id: 'sub-1',
      email: 'roasted@gmail.com',
      created_at: '2026-07-03T11:00:00Z'
    }
  ],
  site_settings: [
    {
      key: 'site_title',
      value_en: 'Konjo-Coffee',
      value_am: 'ቆንጆ ቡና '
    },
    {
      key: 'company_phone',
      value_en: '+251 11 662 4055',
      value_am: '+251 11 662 4055'
    },
    {
      key: 'company_email',
      value_en: 'info@konjocoffee.com',
      value_am: 'info@konjocoffee.com'
    },
    {
      key: 'company_address',
      value_en: 'Bole Road, Mega Building 5th Floor, Addis Ababa, Ethiopia',
      value_am: 'ቦሌ መንገድ፣ ሜጋ ህንፃ 5ኛ ፎቅ፣ አዲስ አበባ፣ ኢትዮጵያ'
    }
  ]
};

class DBManager {
  private data: DatabaseSchema;

  constructor() {
    this.data = { ...INITIAL_DATABASE };
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Error loading database.json, using defaults:', err);
      this.data = { ...INITIAL_DATABASE };
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database.json:', err);
    }
  }

  // Admins CRUD
  getAdmins(): Admin[] {
    this.load();
    return this.data.admins;
  }

  getAdminByUsername(username: string): Admin | undefined {
    this.load();
    return this.data.admins.find(a => a.username.toLowerCase() === username.toLowerCase());
  }

  createAdmin(admin: Omit<Admin, 'id'>): Admin {
    this.load();
    const newAdmin: Admin = {
      ...admin,
      id: 'admin-' + crypto.randomUUID()
    };
    this.data.admins.push(newAdmin);
    this.save();
    return newAdmin;
  }

  // Categories CRUD
  getCategories(): ProductCategory[] {
    this.load();
    return this.data.product_categories;
  }

  getCategoryBySlug(slug: string): ProductCategory | undefined {
    this.load();
    return this.data.product_categories.find(c => c.slug === slug);
  }

  createCategory(cat: Omit<ProductCategory, 'id'>): ProductCategory {
    this.load();
    const newCat: ProductCategory = {
      ...cat,
      id: 'cat-' + crypto.randomUUID()
    };
    this.data.product_categories.push(newCat);
    this.save();
    return newCat;
  }

  updateCategory(id: string, updates: Partial<Omit<ProductCategory, 'id'>>): ProductCategory | undefined {
    this.load();
    const idx = this.data.product_categories.findIndex(c => c.id === id);
    if (idx === -1) return undefined;
    this.data.product_categories[idx] = { ...this.data.product_categories[idx], ...updates };
    this.save();
    return this.data.product_categories[idx];
  }

  deleteCategory(id: string): boolean {
    this.load();
    const initialLen = this.data.product_categories.length;
    this.data.product_categories = this.data.product_categories.filter(c => c.id !== id);
    if (this.data.product_categories.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Products CRUD
  getProducts(): Product[] {
    this.load();
    return this.data.products;
  }

  getProductById(id: string): Product | undefined {
    this.load();
    return this.data.products.find(p => p.id === id);
  }

  getProductBySlug(slug: string): Product | undefined {
    this.load();
    return this.data.products.find(p => p.slug === slug);
  }

  createProduct(product: Omit<Product, 'id' | 'created_at'>): Product {
    this.load();
    const newProduct: Product = {
      ...product,
      id: 'prod-' + crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    this.data.products.push(newProduct);
    this.save();
    return newProduct;
  }

  updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'created_at'>>): Product | undefined {
    this.load();
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    this.data.products[idx] = { ...this.data.products[idx], ...updates };
    this.save();
    return this.data.products[idx];
  }

  deleteProduct(id: string): boolean {
    this.load();
    const initialLen = this.data.products.length;
    this.data.products = this.data.products.filter(p => p.id !== id);
    if (this.data.products.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Services CRUD
  getServices(): Service[] {
    this.load();
    return this.data.services;
  }

  getServiceBySlug(slug: string): Service | undefined {
    this.load();
    return this.data.services.find(s => s.slug === slug);
  }

  createService(service: Omit<Service, 'id'>): Service {
    this.load();
    const newService: Service = {
      ...service,
      id: 'srv-' + crypto.randomUUID()
    };
    this.data.services.push(newService);
    this.save();
    return newService;
  }

  updateService(id: string, updates: Partial<Omit<Service, 'id'>>): Service | undefined {
    this.load();
    const idx = this.data.services.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    this.data.services[idx] = { ...this.data.services[idx], ...updates };
    this.save();
    return this.data.services[idx];
  }

  deleteService(id: string): boolean {
    this.load();
    const initialLen = this.data.services.length;
    this.data.services = this.data.services.filter(s => s.id !== id);
    if (this.data.services.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // News CRUD
  getNewsPosts(): NewsPost[] {
    this.load();
    return this.data.news_posts;
  }

  getNewsPostBySlug(slug: string): NewsPost | undefined {
    this.load();
    return this.data.news_posts.find(n => n.slug === slug);
  }

  createNewsPost(post: Omit<NewsPost, 'id' | 'published_at'>): NewsPost {
    this.load();
    const newPost: NewsPost = {
      ...post,
      id: 'news-' + crypto.randomUUID(),
      published_at: new Date().toISOString()
    };
    this.data.news_posts.push(newPost);
    this.save();
    return newPost;
  }

  updateNewsPost(id: string, updates: Partial<Omit<NewsPost, 'id' | 'published_at'>>): NewsPost | undefined {
    this.load();
    const idx = this.data.news_posts.findIndex(n => n.id === id);
    if (idx === -1) return undefined;
    this.data.news_posts[idx] = { ...this.data.news_posts[idx], ...updates };
    this.save();
    return this.data.news_posts[idx];
  }

  deleteNewsPost(id: string): boolean {
    this.load();
    const initialLen = this.data.news_posts.length;
    this.data.news_posts = this.data.news_posts.filter(n => n.id !== id);
    if (this.data.news_posts.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Gallery CRUD
  getGalleryImages(): GalleryImage[] {
    this.load();
    return this.data.gallery_images;
  }

  createGalleryImage(img: Omit<GalleryImage, 'id'>): GalleryImage {
    this.load();
    const newImg: GalleryImage = {
      ...img,
      id: 'gal-' + crypto.randomUUID()
    };
    this.data.gallery_images.push(newImg);
    this.save();
    return newImg;
  }

  updateGalleryImage(id: string, updates: Partial<Omit<GalleryImage, 'id'>>): GalleryImage | undefined {
    this.load();
    const idx = this.data.gallery_images.findIndex(g => g.id === id);
    if (idx === -1) return undefined;
    this.data.gallery_images[idx] = { ...this.data.gallery_images[idx], ...updates };
    this.save();
    return this.data.gallery_images[idx];
  }

  deleteGalleryImage(id: string): boolean {
    this.load();
    const initialLen = this.data.gallery_images.length;
    this.data.gallery_images = this.data.gallery_images.filter(g => g.id !== id);
    if (this.data.gallery_images.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Inquiries CRUD
  getInquiries(): Inquiry[] {
    this.load();
    return this.data.inquiries;
  }

  createInquiry(inq: Omit<Inquiry, 'id' | 'created_at' | 'status'>): Inquiry {
    this.load();
    const newInq: Inquiry = {
      ...inq,
      id: 'inq-' + crypto.randomUUID(),
      status: 'new',
      created_at: new Date().toISOString()
    };
    this.data.inquiries.push(newInq);
    this.save();
    return newInq;
  }

  updateInquiryStatus(id: string, status: Inquiry['status']): Inquiry | undefined {
    this.load();
    const idx = this.data.inquiries.findIndex(i => i.id === id);
    if (idx === -1) return undefined;
    this.data.inquiries[idx].status = status;
    this.save();
    return this.data.inquiries[idx];
  }

  deleteInquiry(id: string): boolean {
    this.load();
    const initialLen = this.data.inquiries.length;
    this.data.inquiries = this.data.inquiries.filter(i => i.id !== id);
    if (this.data.inquiries.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Newsletter CRUD
  getNewsletterSubscribers(): NewsletterSubscriber[] {
    this.load();
    return this.data.newsletter_subscribers;
  }

  subscribeNewsletter(email: string): NewsletterSubscriber {
    this.load();
    const existing = this.data.newsletter_subscribers.find(s => s.email.toLowerCase() === email.toLowerCase());
    if (existing) return existing;

    const newSub: NewsletterSubscriber = {
      id: 'sub-' + crypto.randomUUID(),
      email,
      created_at: new Date().toISOString()
    };
    this.data.newsletter_subscribers.push(newSub);
    this.save();
    return newSub;
  }

  deleteSubscriber(id: string): boolean {
    this.load();
    const initialLen = this.data.newsletter_subscribers.length;
    this.data.newsletter_subscribers = this.data.newsletter_subscribers.filter(s => s.id !== id);
    if (this.data.newsletter_subscribers.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Settings CRUD
  getSettings(): SiteSettings[] {
    this.load();
    return this.data.site_settings;
  }

  updateSetting(key: string, value_en: string, value_am: string): SiteSettings {
    this.load();
    const idx = this.data.site_settings.findIndex(s => s.key === key);
    if (idx !== -1) {
      this.data.site_settings[idx] = { key, value_en, value_am };
    } else {
      this.data.site_settings.push({ key, value_en, value_am });
    }
    this.save();
    return { key, value_en, value_am };
  }
}

export const db = new DBManager();
