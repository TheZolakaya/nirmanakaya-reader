/**
 * Book Annotations — Supabase-backed public annotations.
 * Requires auth. Falls back gracefully when not logged in.
 */

import { supabase, getUser, isAdmin } from './supabase';

/** Get all public annotations for a chapter */
export async function getPublicAnnotations(chapterSlug) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('book_annotations')
    .select(`
      id, content, is_public, created_at, updated_at, user_id,
      profiles:user_id (display_name, avatar_url)
    `)
    .eq('chapter_slug', chapterSlug)
    .eq('is_public', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching annotations:', error);
    return [];
  }
  return data || [];
}

/** Get current user's annotations for a chapter (public + private) */
export async function getMyAnnotations(chapterSlug) {
  if (!supabase) return [];

  const { user } = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('book_annotations')
    .select('id, content, is_public, created_at, updated_at')
    .eq('chapter_slug', chapterSlug)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) return [];
  return data || [];
}

/** Create an annotation */
export async function createAnnotation(chapterSlug, content, isPublic = true) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { user } = await getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('book_annotations')
    .insert({
      user_id: user.id,
      chapter_slug: chapterSlug,
      content: content.trim(),
      is_public: isPublic,
    })
    .select(`
      id, content, is_public, created_at, updated_at, user_id,
      profiles:user_id (display_name, avatar_url)
    `)
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
