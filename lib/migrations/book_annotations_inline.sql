-- Inline annotations: add columns for text-anchored highlights
-- Run this in Supabase SQL Editor AFTER the initial book_annotations.sql migration

-- Selected text and anchoring context
alter table book_annotations add column if not exists selected_text text;
alter table book_annotations add column if not exists text_prefix text;
alter table book_annotations add column if not exists text_suffix text;

-- Annotation type: 'chapter' (general) or 'inline' (text-anchored)
alter table book_annotations add column if not exists annotation_type text default 'chapter';

-- Mentioned user IDs for @tagging
alter table book_annotations add column if not exists mentioned_user_ids uuid[] default '{}';

-- Index for fast inline annotation lookups per chapter
create index if not exists idx_book_annotations_inline
  on book_annotations(chapter_slug, annotation_type) where annotation_type = 'inline';
