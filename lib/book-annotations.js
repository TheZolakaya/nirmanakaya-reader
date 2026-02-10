/**
 * Book Annotations — Supabase-backed public annotations.
 * Supports both chapter-level and inline (text-anchored) annotations.
 * Requires auth. Falls back gracefully when not logged in.
 */

import { supabase, getUser, isAdmin } from './supabase';

const ANNOTATION_FIELDS = `
  id, content, is_public, created_at, updated_at, user_id,
  annotation_type, selected_text, text_prefix, text_suffix, mentioned_user_ids,
  profiles:user_id (display_name, avatar_url)
`;

/** Get all public annotations for a chapter (both chapter-level and inline) */
export async function getPublicAnnotations(chapterSlug, type = null) {
  if (!supabase) return [];

  let query = supabase
    .from('book_annotations')
    .select(ANNOTATION_FIELDS)
    .eq('chapter_slug', chapterSlug)
    .eq('is_public', true)
    .order('created_at', { ascending: true });

  if (type) {
    query = query.eq('annotation_type', type);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching annotations:', error);
    return [];
  }
  return data || [];
}

/** Get inline annotations for a chapter */
export async function getInlineAnnotations(chapterSlug) {
  return getPublicAnnotations(chapterSlug, 'inline');
}

/** Get chapter-level annotations */
export async function getChapterAnnotations(chapterSlug) {
  return getPublicAnnotations(chapterSlug, 'chapter');
}

/** Get current user's annotations for a chapter (public + private) */
export async function getMyAnnotations(chapterSlug) {
  if (!supabase) return [];

  const { user } = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('book_annotations')
    .select(ANNOTATION_FIELDS)
    .eq('chapter_slug', chapterSlug)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) return [];
  return data || [];
}

/** Create a chapter-level annotation */
export async function createAnnotation(chapterSlug, content, isPublic = true) {
  return createAnnotationFull({
    chapterSlug,
    content,
    isPublic,
    annotationType: 'chapter',
  });
}

/** Create an inline (text-anchored) annotation */
export async function createInlineAnnotation(chapterSlug, content, selectedText, textPrefix, textSuffix, mentionedUserIds = []) {
  return createAnnotationFull({
    chapterSlug,
    content,
    isPublic: true,
    annotationType: 'inline',
    selectedText,
    textPrefix,
    textSuffix,
    mentionedUserIds,
  });
}

/** Full annotation create with all fields */
async function createAnnotationFull({ chapterSlug, content, isPublic, annotationType, selectedText, textPrefix, textSuffix, mentionedUserIds }) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { user } = await getUser();
  if (!user) return { error: 'Not authenticated' };

  const row = {
    user_id: user.id,
    chapter_slug: chapterSlug,
    content: content.trim(),
    is_public: isPublic,
    annotation_type: annotationType || 'chapter',
  };

  if (selectedText) row.selected_text = selectedText;
  if (textPrefix) row.text_prefix = textPrefix;
  if (textSuffix) row.text_suffix = textSuffix;
  if (mentionedUserIds?.length) row.mentioned_user_ids = mentionedUserIds;

  const { data, error } = await supabase
    .from('book_annotations')
    .insert(row)
    .select(ANNOTATION_FIELDS)
    .single();

  return { data, error };
}

/** Update an annotation */
export async function updateAnnotation(id, content, isPublic) {
  if (!supabase) return { error: 'Supabase not configured' };

  const updates = { updated_at: new Date().toISOString() };
  if (content !== undefined) updates.content = content.trim();
  if (isPublic !== undefined) updates.is_public = isPublic;

  const { data, error } = await supabase
    .from('book_annotations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return { data, error };
}

/** Delete an annotation */
export async function deleteAnnotation(id) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { error } = await supabase
    .from('book_annotations')
    .delete()
    .eq('id', id);

  return { error };
}

/** Search users by display name (for @mentions) */
export async function searchUsers(query) {
  if (!supabase || !query || query.length < 1) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .ilike('display_name', `%${query}%`)
    .limit(5);

  if (error) return [];
  return data || [];
}
