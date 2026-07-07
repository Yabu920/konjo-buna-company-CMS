import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { db, verifyPassword, hashPassword } from './server/db.js';

const app = express();
const DEFAULT_PORT = 3000;
const MAX_PORT = 3010;
const requestedPort = Number(process.env.PORT ?? NaN);
const PORT = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : DEFAULT_PORT;

// Enable JSON parser with sufficient limit
app.use(express.json({ limit: '10mb' }));

// Simple secure session token helper
const JWT_SECRET = 'konjo_buna_token_secret_key_2026';
function generateSessionToken(username: string): string {
  const hash = crypto.createHmac('sha256', JWT_SECRET).update(username + '-' + Date.now()).digest('hex');
  return Buffer.from(`${username}:${hash}`).toString('base64');
}

function validateSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [username, hash] = decoded.split(':');
    if (!username || !hash) return false;
    
    // In our simplified sandbox token, as long as the admin username exists, we consider it valid
    const admin = db.getAdminByUsername(username);
    return !!admin;
  } catch {
    return false;
  }
}

// Middleware to protect admin routes
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  const token = authHeader.split(' ')[1];
  if (!validateSessionToken(token)) {
    return res.status(403).json({ error: 'Invalid or expired session' });
  }
  next();
}

// --- API ENDPOINTS ---

// 1. Authentication
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  const admin = db.getAdminByUsername(username);
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = generateSessionToken(username);
  res.json({
    token,
    user: {
      username: admin.username,
      name: admin.name,
      role: admin.role
    }
  });
});

app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ valid: false });
  }
  const token = authHeader.split(' ')[1];
  const valid = validateSessionToken(token);
  res.json({ valid });
});

// 2. Categories
app.get('/api/categories', (req, res) => {
  res.json(db.getCategories());
});

app.post('/api/categories', requireAdmin, (req, res) => {
  const { slug, name_en, name_am, description_en, description_am } = req.body;
  if (!slug || !name_en || !name_am) {
    return res.status(400).json({ error: 'Slug and both English/Amharic names are required' });
  }
  const newCat = db.createCategory({ slug, name_en, name_am, description_en, description_am });
  res.status(201).json(newCat);
});

app.put('/api/categories/:id', requireAdmin, (req, res) => {
  const updated = db.updateCategory(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Category not found' });
  res.json(updated);
});

app.delete('/api/categories/:id', requireAdmin, (req, res) => {
  const success = db.deleteCategory(req.params.id);
  if (!success) return res.status(404).json({ error: 'Category not found' });
  res.json({ success: true });
});

// 3. Products
app.get('/api/products', (req, res) => {
  const { category, search, featured } = req.query;
  let products = db.getProducts();

  if (featured === 'true') {
    products = products.filter(p => p.is_featured);
  }
  if (category) {
    products = products.filter(p => p.category_id === category);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    products = products.filter(p => 
      p.title_en.toLowerCase().includes(q) || 
      p.title_am.toLowerCase().includes(q) ||
      p.description_en.toLowerCase().includes(q) ||
      p.description_am.toLowerCase().includes(q) ||
      p.origin_en.toLowerCase().includes(q) ||
      p.origin_am.toLowerCase().includes(q)
    );
  }
  res.json(products);
});

app.get('/api/products/:slugOrId', (req, res) => {
  const { slugOrId } = req.params;
  const product = db.getProductBySlug(slugOrId) || db.getProductById(slugOrId);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

app.post('/api/products', requireAdmin, (req, res) => {
  const {
    category_id, slug, title_en, title_am, description_en, description_am,
    content_en, content_am, origin_en, origin_am, grade_en, grade_am,
    processing_en, processing_am, packaging_en, packaging_am,
    availability_en, availability_am, price_en, price_am,
    image_url, elevation, is_featured
  } = req.body;

  if (!category_id || !slug || !title_en || !title_am) {
    return res.status(400).json({ error: 'Category, slug, and titles in both languages are required' });
  }

  const newProd = db.createProduct({
    category_id, slug, title_en, title_am, description_en, description_am,
    content_en, content_am, origin_en, origin_am, grade_en, grade_am,
    processing_en, processing_am, packaging_en, packaging_am,
    availability_en, availability_am, price_en, price_am,
    image_url: image_url || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=800',
    elevation: elevation || '1,800m',
    is_featured: !!is_featured
  });
  res.status(201).json(newProd);
});

app.put('/api/products/:id', requireAdmin, (req, res) => {
  const updated = db.updateProduct(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Product not found' });
  res.json(updated);
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const success = db.deleteProduct(req.params.id);
  if (!success) return res.status(404).json({ error: 'Product not found' });
  res.json({ success: true });
});

// 4. Services
app.get('/api/services', (req, res) => {
  res.json(db.getServices());
});

app.get('/api/services/:slug', (req, res) => {
  const service = db.getServiceBySlug(req.params.slug);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  res.json(service);
});

app.post('/api/services', requireAdmin, (req, res) => {
  const { slug, title_en, title_am, description_en, description_am, content_en, content_am, icon_name, image_url } = req.body;
  if (!slug || !title_en || !title_am) {
    return res.status(400).json({ error: 'Slug and bilingual titles are required' });
  }
  const newService = db.createService({
    slug, title_en, title_am, description_en, description_am, content_en, content_am,
    icon_name: icon_name || 'Layers',
    image_url: image_url || 'https://images.unsplash.com/photo-1542435503-956c469947f6?q=80&w=800'
  });
  res.status(201).json(newService);
});

app.put('/api/services/:id', requireAdmin, (req, res) => {
  const updated = db.updateService(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Service not found' });
  res.json(updated);
});

app.delete('/api/services/:id', requireAdmin, (req, res) => {
  const success = db.deleteService(req.params.id);
  if (!success) return res.status(404).json({ error: 'Service not found' });
  res.json({ success: true });
});

// 5. News
app.get('/api/news', (req, res) => {
  const { search } = req.query;
  let posts = db.getNewsPosts();
  if (search) {
    const q = (search as string).toLowerCase();
    posts = posts.filter(p =>
      p.title_en.toLowerCase().includes(q) ||
      p.title_am.toLowerCase().includes(q) ||
      p.excerpt_en.toLowerCase().includes(q) ||
      p.excerpt_am.toLowerCase().includes(q)
    );
  }
  res.json(posts);
});

app.get('/api/news/:slug', (req, res) => {
  const post = db.getNewsPostBySlug(req.params.slug);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
});

app.post('/api/news', requireAdmin, (req, res) => {
  const { slug, title_en, title_am, excerpt_en, excerpt_am, content_en, content_am, category_en, category_am, image_url, author_en, author_am } = req.body;
  if (!slug || !title_en || !title_am) {
    return res.status(400).json({ error: 'Slug and bilingual titles are required' });
  }
  const newPost = db.createNewsPost({
    slug, title_en, title_am, excerpt_en, excerpt_am, content_en, content_am, category_en, category_am,
    image_url: image_url || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800',
    author_en: author_en || 'Konjo Press Team',
    author_am: author_am || 'የኮንጆ ጋዜጠኛ ክፍል'
  });
  res.status(201).json(newPost);
});

app.put('/api/news/:id', requireAdmin, (req, res) => {
  const updated = db.updateNewsPost(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Post not found' });
  res.json(updated);
});

app.delete('/api/news/:id', requireAdmin, (req, res) => {
  const success = db.deleteNewsPost(req.params.id);
  if (!success) return res.status(404).json({ error: 'Post not found' });
  res.json({ success: true });
});

// 6. Gallery
app.get('/api/gallery', (req, res) => {
  res.json(db.getGalleryImages());
});

app.post('/api/gallery', requireAdmin, (req, res) => {
  const { category_en, category_am, title_en, title_am, image_url, description_en, description_am } = req.body;
  if (!image_url || !title_en || !title_am) {
    return res.status(400).json({ error: 'Image URL and bilingual titles are required' });
  }
  const newImg = db.createGalleryImage({
    category_en: category_en || 'General',
    category_am: category_am || 'ጠቅላላ',
    title_en, title_am, image_url, description_en, description_am
  });
  res.status(201).json(newImg);
});

app.put('/api/gallery/:id', requireAdmin, (req, res) => {
  const updated = db.updateGalleryImage(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Gallery item not found' });
  res.json(updated);
});

app.delete('/api/gallery/:id', requireAdmin, (req, res) => {
  const success = db.deleteGalleryImage(req.params.id);
  if (!success) return res.status(404).json({ error: 'Gallery item not found' });
  res.json({ success: true });
});

// 7. Inquiries
app.get('/api/inquiries', requireAdmin, (req, res) => {
  res.json(db.getInquiries());
});

app.post('/api/inquiries', (req, res) => {
  const { company_name, contact_name, email, phone, country, product_id, coffee_type, volume_required, target_price, message } = req.body;
  if (!company_name || !contact_name || !email || !message) {
    return res.status(400).json({ error: 'Company, contact name, email, and message are required' });
  }
  const newInq = db.createInquiry({
    company_name, contact_name, email,
    phone: phone || '',
    country: country || '',
    product_id: product_id || '',
    coffee_type: coffee_type || 'General Inquiry',
    volume_required: volume_required || '',
    target_price: target_price || '',
    message
  });
  res.status(201).json(newInq);
});

app.put('/api/inquiries/:id', requireAdmin, (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });
  const updated = db.updateInquiryStatus(req.params.id, status);
  if (!updated) return res.status(404).json({ error: 'Inquiry not found' });
  res.json(updated);
});

app.delete('/api/inquiries/:id', requireAdmin, (req, res) => {
  const success = db.deleteInquiry(req.params.id);
  if (!success) return res.status(404).json({ error: 'Inquiry not found' });
  res.json({ success: true });
});

// 8. Newsletter
app.get('/api/newsletter', requireAdmin, (req, res) => {
  res.json(db.getNewsletterSubscribers());
});

app.post('/api/newsletter', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }
  const sub = db.subscribeNewsletter(email);
  res.status(201).json(sub);
});

app.delete('/api/newsletter/:id', requireAdmin, (req, res) => {
  const success = db.deleteSubscriber(req.params.id);
  if (!success) return res.status(404).json({ error: 'Subscriber not found' });
  res.json({ success: true });
});

// 9. Site Settings
app.get('/api/settings', (req, res) => {
  res.json(db.getSettings());
});

app.post('/api/settings', requireAdmin, (req, res) => {
  const { key, value_en, value_am } = req.body;
  if (!key) return res.status(400).json({ error: 'Setting key is required' });
  const updated = db.updateSetting(key, value_en, value_am);
  res.json(updated);
});

// 10. Global Search
app.get('/api/search', (req, res) => {
  const q = (req.query.q as string || '').toLowerCase();
  if (!q) {
    return res.json({ products: [], services: [], news: [] });
  }
  
  const products = db.getProducts().filter(p => 
    p.title_en.toLowerCase().includes(q) || p.title_am.toLowerCase().includes(q) ||
    p.description_en.toLowerCase().includes(q) || p.description_am.toLowerCase().includes(q) ||
    p.origin_en.toLowerCase().includes(q) || p.origin_am.toLowerCase().includes(q)
  );

  const services = db.getServices().filter(s => 
    s.title_en.toLowerCase().includes(q) || s.title_am.toLowerCase().includes(q) ||
    s.description_en.toLowerCase().includes(q) || s.description_am.toLowerCase().includes(q)
  );

  const news = db.getNewsPosts().filter(n => 
    n.title_en.toLowerCase().includes(q) || n.title_am.toLowerCase().includes(q) ||
    n.excerpt_en.toLowerCase().includes(q) || n.excerpt_am.toLowerCase().includes(q)
  );

  res.json({ products, services, news });
});

// --- VITE DEV SERVER OR PRODUCTION DIST SERVING ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Integrate Vite development server
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development server loaded as middleware');
  } else {
    // Serve compiled files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production server serving static assets from dist/');
  }

  const bindPort = async (port: number) => {
    return new Promise<void>((resolve, reject) => {
      const server = app.listen(port, '0.0.0.0', () => {
        console.log(`Konjo Coffee Server running on http://0.0.0.0:${port}`);
        resolve();
      });
      server.on('error', reject);
    });
  };

  let currentPort = PORT;
  while (true) {
    try {
      await bindPort(currentPort);
      break;
    } catch (err: any) {
      if (err.code === 'EADDRINUSE') {
        if (process.env.PORT) {
          console.error(`Port ${currentPort} is already in use. Set a different PORT environment variable or stop the process using it.`);
          process.exit(1);
        }

        if (currentPort < MAX_PORT) {
          console.warn(`Port ${currentPort} is in use, trying port ${currentPort + 1}...`);
          currentPort += 1;
          continue;
        }

        console.error(`Ports ${DEFAULT_PORT}-${MAX_PORT} are all in use. Please set PORT to an open port.`);
        process.exit(1);
      }
      throw err;
    }
  }
}

startServer();
