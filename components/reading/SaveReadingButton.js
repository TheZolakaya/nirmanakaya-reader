'use client';

// === SAVE READING BUTTON ===
// Saves reading locally and to cloud if authenticated
// Also saves to user_readings for My Readings feature (with optional glisten data)

import { useState } from 'react';
import { saveReading, saveReadingLocally, getUser, getSession } from '../../lib/supabase';

export default function SaveReadingButton({ reading, glisten, draws, locusSubjects, voice, topicId, onSave, onBadges }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (saving || saved) return;

    setSaving(true);
    setError('');

    // Debug: log what we're trying to save
    console.log('Saving reading:', reading);

    try {
      // Always save locally first
      const localReading = saveReadingLocally(reading);

      // Try to save to cloud if authenticated
      const { user } = await getUser();
      console.log('User:', user);
      if (user) {
        // Save to legacy readings table
        const { data, error: cloudError } = await saveReading(reading);
        console.log('Cloud save result:', { data, error: cloudError });
        if (cloudError) {
          console.warn('Cloud save failed, saved locally:', cloudError);
        }

        // Also save to user_readings for My Readings feature
        try {
          const session = await getSession();
          const token = session?.session?.access_token;
          if (token && draws) {
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
                    interpretation: c.interpretation?.interpretation || c.interpretation,
                    rebalancing: c.interpretation?.rebalancing
                  })) || [],
                  synthesis: reading.synthesis?.summary || reading.synthesis?.path,
                  letter: reading.letter
                },
                glisten: glisten || null,
                ...(topicId ? { topic_id: topicId } : {})
              })
            });
            const userReadingData = await userReadingRes.json();
            console.log('User readings save result:', userReadingData);
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
        } catch (userReadingError) {
          console.warn('User readings save failed:', userReadingError);
          // Don't fail overall save if this fails
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
