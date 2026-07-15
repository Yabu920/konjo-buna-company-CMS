import crypto from 'node:crypto';
import { Prisma } from '../generated/prisma/client.js';
import { prisma } from './prisma.js';
import type {
  Admin,
  AdminSession,
  GalleryImage,
  Inquiry,
  NewsPost,
  NewsletterSubscriber,
  Product,
  ProductCategory,
  PasswordResetToken,
  Service,
  SiteSettings,
} from './db.js';

const VALID_INQUIRY_STATUSES: Inquiry['status'][] = ['new', 'contacted', 'resolved', 'archived'];

export class PrismaRepositoryError extends Error {
  constructor(message: string, public readonly code: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PrismaRepositoryError';
  }
}

function translatePrismaError(error: unknown, entity: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : 'unique field';
      throw new PrismaRepositoryError(`${entity} conflicts with an existing ${target}.`, 'DUPLICATE', { cause: error });
    }
    if (error.code === 'P2003') {
      throw new PrismaRepositoryError(`${entity} references a record that does not exist.`, 'INVALID_RELATION', { cause: error });
    }
    if (error.code === 'P2025') {
      throw new PrismaRepositoryError(`${entity} was not found.`, 'NOT_FOUND', { cause: error });
    }
  }
  throw error;
}

const productToLegacy = (record: Awaited<ReturnType<typeof prisma.product.findFirst>>): Product | undefined => record ? {
  ...record,
  created_at: record.created_at.toISOString(),
} : undefined;

const newsToLegacy = (record: Awaited<ReturnType<typeof prisma.newsPost.findFirst>>): NewsPost | undefined => record ? {
  ...record,
  published_at: record.published_at.toISOString(),
} : undefined;

const inquiryToLegacy = (record: Awaited<ReturnType<typeof prisma.inquiry.findFirst>>): Inquiry | undefined => record ? {
  ...record,
  product_id: record.product_id ?? '',
  status: record.status as Inquiry['status'],
  created_at: record.created_at.toISOString(),
} : undefined;

const subscriberToLegacy = (record: Awaited<ReturnType<typeof prisma.newsletterSubscriber.findFirst>>): NewsletterSubscriber | undefined => record ? {
  ...record,
  created_at: record.created_at.toISOString(),
} : undefined;

const sessionToLegacy = (record: Awaited<ReturnType<typeof prisma.adminSession.findFirst>>): AdminSession | undefined => record ? {
  ...record,
  created_at: record.created_at.toISOString(),
  last_activity_at: record.last_activity_at.toISOString(),
  absolute_expires_at: record.absolute_expires_at.toISOString(),
  password_confirmed_at: record.password_confirmed_at?.toISOString() ?? null,
  revoked_at: record.revoked_at?.toISOString() ?? null,
} : undefined;

const resetTokenToLegacy = (record: Awaited<ReturnType<typeof prisma.passwordResetToken.findFirst>>): PasswordResetToken | undefined => record ? {
  ...record,
  created_at: record.created_at.toISOString(),
  expires_at: record.expires_at.toISOString(),
  used_at: record.used_at?.toISOString() ?? null,
} : undefined;

export class PrismaDBManager {
  async getAdmins(): Promise<Admin[]> {
    return prisma.admin.findMany();
  }

  async getAdminById(id: string): Promise<Admin | undefined> {
    return (await prisma.admin.findUnique({ where: { id } })) ?? undefined;
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    return (await prisma.admin.findFirst({ where: { username: username.trim() } })) ?? undefined;
  }

  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    return (await prisma.admin.findUnique({ where: { email: email.trim().toLowerCase() } })) ?? undefined;
  }

  async createAdmin(admin: Omit<Admin, 'id'>): Promise<Admin> {
    try {
      return await prisma.admin.create({ data: { ...admin, username: admin.username.trim(), id: `admin-${crypto.randomUUID()}` } });
    } catch (error) {
      translatePrismaError(error, 'Admin');
    }
  }

  async updateAdminPassword(id: string, passwordHash: string): Promise<Admin | undefined> {
    if (!await prisma.admin.findUnique({ where: { id }, select: { id: true } })) return undefined;
    return prisma.admin.update({ where: { id }, data: { passwordHash } });
  }

  async updateAdmin(id: string, updates: Pick<Admin, 'name' | 'role' | 'email'>): Promise<Admin | undefined> {
    if (!await prisma.admin.findUnique({ where: { id }, select: { id: true } })) return undefined;
    try {
      return await prisma.admin.update({
        where: { id },
        data: { ...updates, email: updates.email?.trim().toLowerCase() || null },
      });
    } catch (error) {
      translatePrismaError(error, 'Admin');
    }
  }

  async deleteAdmin(id: string): Promise<boolean> {
    if (!await prisma.admin.findUnique({ where: { id }, select: { id: true } })) return false;
    try {
      await prisma.admin.delete({ where: { id } });
      return true;
    } catch (error) {
      translatePrismaError(error, 'Admin');
    }
  }

  async countSuperAdmins(): Promise<number> {
    const admins = await prisma.admin.findMany({ select: { role: true } });
    return admins.filter(admin => admin.role.trim().toLowerCase().replace(/\s+/g, '') === 'superadmin').length;
  }

  async createAdminSession(session: Omit<AdminSession, 'id'>): Promise<AdminSession> {
    const record = await prisma.adminSession.create({
      data: {
        ...session,
        id: `session-${crypto.randomUUID()}`,
        created_at: new Date(session.created_at),
        last_activity_at: new Date(session.last_activity_at),
        absolute_expires_at: new Date(session.absolute_expires_at),
        password_confirmed_at: session.password_confirmed_at ? new Date(session.password_confirmed_at) : null,
        revoked_at: session.revoked_at ? new Date(session.revoked_at) : null,
      },
    });
    return sessionToLegacy(record)!;
  }

  async getAdminSessionByTokenHash(tokenHash: string): Promise<AdminSession | undefined> {
    return sessionToLegacy(await prisma.adminSession.findUnique({ where: { token_hash: tokenHash } }));
  }

  async touchAdminSession(id: string, lastActivityAt: string): Promise<AdminSession | undefined> {
    if (!await prisma.adminSession.findUnique({ where: { id }, select: { id: true } })) return undefined;
    return sessionToLegacy(await prisma.adminSession.update({
      where: { id }, data: { last_activity_at: new Date(lastActivityAt) },
    }));
  }

  async confirmAdminSession(id: string, confirmedAt: string): Promise<AdminSession | undefined> {
    if (!await prisma.adminSession.findUnique({ where: { id }, select: { id: true } })) return undefined;
    return sessionToLegacy(await prisma.adminSession.update({
      where: { id }, data: { password_confirmed_at: new Date(confirmedAt) },
    }));
  }

  async revokeAdminSession(id: string, revokedAt: string): Promise<boolean> {
    const result = await prisma.adminSession.updateMany({
      where: { id, revoked_at: null }, data: { revoked_at: new Date(revokedAt) },
    });
    return result.count > 0;
  }

  async revokeAdminSessionsByAdminId(adminId: string, revokedAt: string): Promise<number> {
    const result = await prisma.adminSession.updateMany({
      where: { admin_id: adminId, revoked_at: null }, data: { revoked_at: new Date(revokedAt) },
    });
    return result.count;
  }

  async createPasswordResetToken(token: Omit<PasswordResetToken, 'id'>): Promise<PasswordResetToken> {
    const record = await prisma.$transaction(async transaction => {
      await transaction.passwordResetToken.updateMany({
        where: { admin_id: token.admin_id, used_at: null },
        data: { used_at: new Date(token.created_at) },
      });
      return transaction.passwordResetToken.create({
        data: {
          ...token,
          id: `reset-${crypto.randomUUID()}`,
          created_at: new Date(token.created_at),
          expires_at: new Date(token.expires_at),
          used_at: token.used_at ? new Date(token.used_at) : null,
        },
      });
    });
    return resetTokenToLegacy(record)!;
  }

  async consumePasswordResetToken(tokenHash: string, usedAt: string): Promise<PasswordResetToken | undefined> {
    return prisma.$transaction(async transaction => {
      const token = await transaction.passwordResetToken.findUnique({ where: { token_hash: tokenHash } });
      const usedDate = new Date(usedAt);
      if (!token || token.used_at || token.expires_at <= usedDate) return undefined;
      const consumed = await transaction.passwordResetToken.updateMany({
        where: { id: token.id, used_at: null, expires_at: { gt: usedDate } },
        data: { used_at: usedDate },
      });
      return consumed.count === 1 ? resetTokenToLegacy({ ...token, used_at: usedDate }) : undefined;
    });
  }

  async getCategories(): Promise<ProductCategory[]> {
    return prisma.productCategory.findMany();
  }

  async getCategoryBySlug(slug: string): Promise<ProductCategory | undefined> {
    return (await prisma.productCategory.findUnique({ where: { slug } })) ?? undefined;
  }

  async createCategory(category: Omit<ProductCategory, 'id'>): Promise<ProductCategory> {
    try {
      return await prisma.productCategory.create({ data: { ...category, id: `cat-${crypto.randomUUID()}` } });
    } catch (error) {
      translatePrismaError(error, 'Category');
    }
  }

  async updateCategory(id: string, updates: Partial<Omit<ProductCategory, 'id'>>): Promise<ProductCategory | undefined> {
    if (!await prisma.productCategory.findUnique({ where: { id }, select: { id: true } })) return undefined;
    try {
      return await prisma.productCategory.update({ where: { id }, data: updates });
    } catch (error) {
      translatePrismaError(error, 'Category');
    }
  }

  async deleteCategory(id: string): Promise<boolean> {
    if (await prisma.product.count({ where: { category_id: id } }) > 0) {
      throw new PrismaRepositoryError('Category cannot be deleted while products still use it.', 'CATEGORY_IN_USE');
    }
    return (await prisma.productCategory.deleteMany({ where: { id } })).count > 0;
  }

  async getProducts(): Promise<Product[]> {
    const records = await prisma.product.findMany({ orderBy: { created_at: 'desc' } });
    return records.map((record) => productToLegacy(record)!);
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return productToLegacy(await prisma.product.findUnique({ where: { id } }));
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    return productToLegacy(await prisma.product.findUnique({ where: { slug } }));
  }

  private async assertCategoryExists(categoryId: string) {
    if (!await prisma.productCategory.findUnique({ where: { id: categoryId }, select: { id: true } })) {
      throw new PrismaRepositoryError(`Product category "${categoryId}" does not exist.`, 'INVALID_CATEGORY');
    }
  }

  async createProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
    await this.assertCategoryExists(product.category_id);
    try {
      const record = await prisma.product.create({
        data: { ...product, id: `prod-${crypto.randomUUID()}`, created_at: new Date() },
      });
      return productToLegacy(record)!;
    } catch (error) {
      translatePrismaError(error, 'Product');
    }
  }

  async updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'created_at'>>): Promise<Product | undefined> {
    if (!await prisma.product.findUnique({ where: { id }, select: { id: true } })) return undefined;
    if (updates.category_id !== undefined) await this.assertCategoryExists(updates.category_id);
    try {
      return productToLegacy(await prisma.product.update({ where: { id }, data: updates }));
    } catch (error) {
      translatePrismaError(error, 'Product');
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    return (await prisma.product.deleteMany({ where: { id } })).count > 0;
  }

  async getServices(): Promise<Service[]> {
    return prisma.service.findMany();
  }

  async getServiceBySlug(slug: string): Promise<Service | undefined> {
    return (await prisma.service.findUnique({ where: { slug } })) ?? undefined;
  }

  async createService(service: Omit<Service, 'id'>): Promise<Service> {
    try {
      return await prisma.service.create({ data: { ...service, id: `srv-${crypto.randomUUID()}` } });
    } catch (error) {
      translatePrismaError(error, 'Service');
    }
  }

  async updateService(id: string, updates: Partial<Omit<Service, 'id'>>): Promise<Service | undefined> {
    if (!await prisma.service.findUnique({ where: { id }, select: { id: true } })) return undefined;
    try {
      return await prisma.service.update({ where: { id }, data: updates });
    } catch (error) {
      translatePrismaError(error, 'Service');
    }
  }

  async deleteService(id: string): Promise<boolean> {
    return (await prisma.service.deleteMany({ where: { id } })).count > 0;
  }

  async getNewsPosts(): Promise<NewsPost[]> {
    return (await prisma.newsPost.findMany({ orderBy: { published_at: 'desc' } })).map((record) => newsToLegacy(record)!);
  }

  async getNewsPostBySlug(slug: string): Promise<NewsPost | undefined> {
    return newsToLegacy(await prisma.newsPost.findUnique({ where: { slug } }));
  }

  async createNewsPost(post: Omit<NewsPost, 'id' | 'published_at'>): Promise<NewsPost> {
    try {
      const record = await prisma.newsPost.create({
        data: { ...post, id: `news-${crypto.randomUUID()}`, published_at: new Date() },
      });
      return newsToLegacy(record)!;
    } catch (error) {
      translatePrismaError(error, 'News post');
    }
  }

  async updateNewsPost(id: string, updates: Partial<Omit<NewsPost, 'id' | 'published_at'>>): Promise<NewsPost | undefined> {
    if (!await prisma.newsPost.findUnique({ where: { id }, select: { id: true } })) return undefined;
    try {
      return newsToLegacy(await prisma.newsPost.update({ where: { id }, data: updates }));
    } catch (error) {
      translatePrismaError(error, 'News post');
    }
  }

  async deleteNewsPost(id: string): Promise<boolean> {
    return (await prisma.newsPost.deleteMany({ where: { id } })).count > 0;
  }

  async getGalleryImages(): Promise<GalleryImage[]> {
    return prisma.galleryImage.findMany();
  }

  async createGalleryImage(image: Omit<GalleryImage, 'id'>): Promise<GalleryImage> {
    return prisma.galleryImage.create({ data: { ...image, id: `gal-${crypto.randomUUID()}` } });
  }

  async updateGalleryImage(id: string, updates: Partial<Omit<GalleryImage, 'id'>>): Promise<GalleryImage | undefined> {
    if (!await prisma.galleryImage.findUnique({ where: { id }, select: { id: true } })) return undefined;
    return prisma.galleryImage.update({ where: { id }, data: updates });
  }

  async deleteGalleryImage(id: string): Promise<boolean> {
    return (await prisma.galleryImage.deleteMany({ where: { id } })).count > 0;
  }

  async getInquiries(): Promise<Inquiry[]> {
    return (await prisma.inquiry.findMany()).map((record) => inquiryToLegacy(record)!);
  }

  async createInquiry(inquiry: Omit<Inquiry, 'id' | 'created_at' | 'status'>): Promise<Inquiry> {
    const productId = inquiry.product_id.trim() || null;
    const validProductId = productId && await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })
      ? productId
      : null;
    const record = await prisma.inquiry.create({
      data: { ...inquiry, product_id: validProductId, id: `inq-${crypto.randomUUID()}`, status: 'new', created_at: new Date() },
    });
    return inquiryToLegacy(record)!;
  }

  async updateInquiryStatus(id: string, status: Inquiry['status']): Promise<Inquiry | undefined> {
    if (!VALID_INQUIRY_STATUSES.includes(status)) {
      throw new PrismaRepositoryError(`Invalid inquiry status "${status}".`, 'INVALID_INQUIRY_STATUS');
    }
    if (!await prisma.inquiry.findUnique({ where: { id }, select: { id: true } })) return undefined;
    return inquiryToLegacy(await prisma.inquiry.update({ where: { id }, data: { status } }));
  }

  async deleteInquiry(id: string): Promise<boolean> {
    return (await prisma.inquiry.deleteMany({ where: { id } })).count > 0;
  }

  async getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    return (await prisma.newsletterSubscriber.findMany()).map((record) => subscriberToLegacy(record)!);
  }

  async subscribeNewsletter(email: string): Promise<NewsletterSubscriber> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email: normalizedEmail } });
    if (existing) return subscriberToLegacy(existing)!;
    try {
      return subscriberToLegacy(await prisma.newsletterSubscriber.create({
        data: { id: `sub-${crypto.randomUUID()}`, email: normalizedEmail, created_at: new Date() },
      }))!;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const racedExisting = await prisma.newsletterSubscriber.findUnique({ where: { email: normalizedEmail } });
        if (racedExisting) return subscriberToLegacy(racedExisting)!;
      }
      translatePrismaError(error, 'Newsletter subscriber');
    }
  }

  async deleteSubscriber(id: string): Promise<boolean> {
    return (await prisma.newsletterSubscriber.deleteMany({ where: { id } })).count > 0;
  }

  async getSettings(): Promise<SiteSettings[]> {
    return prisma.siteSetting.findMany();
  }

  async updateSetting(key: string, value_en: string, value_am: string): Promise<SiteSettings> {
    return prisma.siteSetting.upsert({
      where: { key },
      create: { key, value_en, value_am },
      update: { value_en, value_am },
    });
  }
}

export const dbPrisma = new PrismaDBManager();
