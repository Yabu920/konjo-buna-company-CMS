-- Existing gallery records remain images through the non-null default.
ALTER TABLE `gallery_images`
  ADD COLUMN `media_type` VARCHAR(20) NOT NULL DEFAULT 'image',
  ADD COLUMN `poster_url` TEXT NULL;
