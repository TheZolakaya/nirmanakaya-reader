-- Add hashtags column to book_annotations
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

ALTER TABLE book_annotations ADD COLUMN IF NOT EXISTS hashtags text[] DEFAULT '{}';

-- GIN index for fast hashtag search
CREATE INDEX IF NOT EXISTS idx_book_annotations_hashtags
  ON book_annotations USING gin(hashtags);
