-- Authentication-only Step 7A migration.
ALTER TABLE `admins` ADD COLUMN `email` VARCHAR(320) NULL;
CREATE UNIQUE INDEX `admins_email_key` ON `admins`(`email`);

CREATE TABLE `admin_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `admin_id` VARCHAR(191) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `csrf_hash` CHAR(64) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_activity_at` DATETIME(3) NOT NULL,
    `absolute_expires_at` DATETIME(3) NOT NULL,
    `remember_me` BOOLEAN NOT NULL DEFAULT false,
    `password_confirmed_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,
    UNIQUE INDEX `admin_sessions_token_hash_key`(`token_hash`),
    INDEX `admin_sessions_admin_id_idx`(`admin_id`),
    INDEX `admin_sessions_absolute_expires_at_idx`(`absolute_expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `password_reset_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `admin_id` VARCHAR(191) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    UNIQUE INDEX `password_reset_tokens_token_hash_key`(`token_hash`),
    INDEX `password_reset_tokens_admin_id_idx`(`admin_id`),
    INDEX `password_reset_tokens_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `admin_sessions` ADD CONSTRAINT `admin_sessions_admin_id_fkey`
  FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_admin_id_fkey`
  FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
