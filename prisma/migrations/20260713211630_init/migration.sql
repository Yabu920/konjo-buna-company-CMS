-- CreateTable
CREATE TABLE `admins` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `admins_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_categories` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name_en` VARCHAR(255) NOT NULL,
    `name_am` VARCHAR(255) NOT NULL,
    `description_en` TEXT NOT NULL,
    `description_am` TEXT NOT NULL,

    UNIQUE INDEX `product_categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title_en` VARCHAR(255) NOT NULL,
    `title_am` VARCHAR(255) NOT NULL,
    `description_en` TEXT NOT NULL,
    `description_am` TEXT NOT NULL,
    `content_en` LONGTEXT NOT NULL,
    `content_am` LONGTEXT NOT NULL,
    `origin_en` VARCHAR(255) NOT NULL,
    `origin_am` VARCHAR(255) NOT NULL,
    `grade_en` VARCHAR(255) NOT NULL,
    `grade_am` VARCHAR(255) NOT NULL,
    `processing_en` TEXT NOT NULL,
    `processing_am` TEXT NOT NULL,
    `packaging_en` TEXT NOT NULL,
    `packaging_am` TEXT NOT NULL,
    `availability_en` TEXT NOT NULL,
    `availability_am` TEXT NOT NULL,
    `price_en` VARCHAR(255) NOT NULL,
    `price_am` VARCHAR(255) NOT NULL,
    `image_url` TEXT NOT NULL,
    `elevation` VARCHAR(191) NOT NULL,
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `products_slug_key`(`slug`),
    INDEX `products_category_id_idx`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `services` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title_en` VARCHAR(255) NOT NULL,
    `title_am` VARCHAR(255) NOT NULL,
    `description_en` TEXT NOT NULL,
    `description_am` TEXT NOT NULL,
    `content_en` LONGTEXT NOT NULL,
    `content_am` LONGTEXT NOT NULL,
    `icon_name` VARCHAR(100) NOT NULL,
    `image_url` TEXT NOT NULL,

    UNIQUE INDEX `services_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `news_posts` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title_en` VARCHAR(255) NOT NULL,
    `title_am` VARCHAR(255) NOT NULL,
    `excerpt_en` TEXT NOT NULL,
    `excerpt_am` TEXT NOT NULL,
    `content_en` LONGTEXT NOT NULL,
    `content_am` LONGTEXT NOT NULL,
    `category_en` VARCHAR(191) NOT NULL,
    `category_am` VARCHAR(191) NOT NULL,
    `image_url` TEXT NOT NULL,
    `author_en` VARCHAR(191) NOT NULL,
    `author_am` VARCHAR(191) NOT NULL,
    `published_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `news_posts_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gallery_images` (
    `id` VARCHAR(191) NOT NULL,
    `category_en` VARCHAR(191) NOT NULL,
    `category_am` VARCHAR(191) NOT NULL,
    `title_en` VARCHAR(255) NOT NULL,
    `title_am` VARCHAR(255) NOT NULL,
    `image_url` TEXT NOT NULL,
    `description_en` TEXT NOT NULL,
    `description_am` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inquiries` (
    `id` VARCHAR(191) NOT NULL,
    `company_name` VARCHAR(255) NOT NULL,
    `contact_name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(320) NOT NULL,
    `phone` VARCHAR(100) NOT NULL,
    `country` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NULL,
    `coffee_type` VARCHAR(255) NOT NULL,
    `volume_required` VARCHAR(191) NOT NULL,
    `target_price` VARCHAR(191) NOT NULL,
    `message` LONGTEXT NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'new',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inquiries_product_id_idx`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `newsletter_subscribers` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(320) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `newsletter_subscribers_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_settings` (
    `key` VARCHAR(191) NOT NULL,
    `value_en` TEXT NOT NULL,
    `value_am` TEXT NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inquiries` ADD CONSTRAINT `inquiries_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
