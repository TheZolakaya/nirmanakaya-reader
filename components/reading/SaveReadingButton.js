'use client';

// === SAVE READING BUTTON ===
// Saves reading locally and triggers badge check
// Auto-save (from page.js) handles the user_readings insert
// This button handles: local save, topic linking, glisten, badges

import { useState } from 'react';
import { saveReading, saveReadingLocally, getUser, getSession } from '../../lib/supabase';

export default function SaveReadingButton({ reading, glisten, draws, locusSubjects, voice, topicId, savedReadingId, onSave, onBadges }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (saving || saved) return;

    setSaving(true);
    setError('');

    try {
      // Always save locally first
      const localReading = saveReadingLocally(reading);

      const { user } = await getUser();
      if (user) {
        const session = await getSession();
        const token = session?.session?.access_token;

        if (savedReadingId && token) {
          // Reading already auto-saved — just update with topic/glisten and check badges
          const patchRes = await fetch('/api/user/readings', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              id: savedReadingId,
              interpretation: {
                cards: reading.cards?.map(c => ({
                  interpretation: c.interpretation,
                  rebalancing: c.interpretation?.rebalancer || c.interpretation?.rebalancing || null
                })) || [],
                synthesis: reading.synthesis?.summary || reading.synthesis?.path || reading.synthesis,
                letter: reading.letter,
                ...(glisten ? { glisten: { ...glisten, createdAt: new Date().toISOString() } } : {})
              }
            })
          });
          await patchRes.json();

          // Link topic if provided
          if (topicId) {
            // Topic linking happens via a separate call since PATCH allowed fields are limited
            await fetch('/api/user/topic-analysis', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ topic_id: topicId })
            }).catch(err => console.log('[TopicAnalysis] Failed:', err));
          }
        } else if (token && draws) {
          // No auto-save (incognito mode or failed) — full save via API
          const userReadingRes = await fetch('/api/user/readings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              reading_type: 'manual',
              topic_mode: reading.question ? 'custom' : 'general',
              topic: reading.question || null,
              locus_subjects: locusSubjects || [],
              card_count: draws.length,
              voice: voice || 'friend',
              draws: draws,
              interpretation: {
                cards: reading.cards?.map(c => ({
                  interpretation: c.interpretation,
                  rebalancing: c.interpretation?.rebalancer || c.interpretation?.rebalancing || null
                })) || [],
                synthesis: reading.synthesis?.summary || reading.synthesis?.path || reading.synthesis,
                letter: reading.letter,
                ...(glisten ? { glisten: { ...glisten, createdAt: new Date().toISOString() } } : {})
              },
              token_usage: reading.tokenUsage || null,
              model: reading.model || 'sonnet',
              mode: reading.mode || null,
              spread_type: reading.spreadType || null,
              ...(topicId ? { topic_id: topicId } : {})
            })
          });
          const userReadingData = await userReadingRes.json();
          // Surface new badges if any were earned
          if (userReadingData.newBadges && userReadingData.newBadges.length > 0) {
            onBadges?.(userReadingData.newBadges);
          }
          // Auto-generate topic meta-analysis (non-blocking)
          if (topicId) {
            fetch('/api/user/topic-analysis', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ topic_id: topicId })
            }).catch(err => console.log('[TopicAnalysis] Failed:', err));
          }
        }
      }

      setSaved(true);
      onSave?.(localReading);

      // Reset after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Save failed:', e);
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={handleSave}
      disabled={saving}
      className={`
        flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors
        ${saved
          ? 'bg-green-600/20 text-green-400'
          : 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300'
        }
        ${saving ? 'opacity-50 cursor-wait' : ''}
      `}
      title={saved ? 'Saved!' : 'Save this reading'}
    >
      {saving ? (
        <>
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Saving
        </>
      ) : saved ? (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Saved
        </>
      ) : (
        'Save'
      )}
    </button>
  );
}
