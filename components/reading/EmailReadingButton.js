'use client';

// === EMAIL READING BUTTON ===
// Send reading to user's email

import { useState } from 'react';
import { getUser } from '../../lib/supabase';

export default function EmailReadingButton({ readingId, disabled }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  // Determine if button should be disabled and why
  const needsSave = !readingId;
  const isDisabled = sending || sent || needsSave || disabled;

  async function handleEmail() {
    if (needsSave || disabled) return;

    setSending(true);
    setError(null);

    try {
      const { user } = await getUser();

      if (!user) {
        setError('Sign in to email readings');
        setSending(false);
        return;
      }

      const response = await fetch('/api/email/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          readingId: readingId,
          force: true  // Always send when manually requested
        })
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else if (data.skipped) {
        setError(data.reason || 'Could not send');
      } else {
        setSent(true);
        setTimeout(() => setSent(false), 3000);
      }
    } catch (e) {
      console.error('Email failed:', e);
      setError('Failed to send');
    } finally {
      setSending(false);
    }
  }

  // Build tooltip text based on state
  const getTooltip = () => {
    if (error) return error;
    if (sent) return 'Email sent!';
    if (needsSave) return 'Save reading first to enable email';
    return 'Email this reading to yourself';
  };

  // Build button text based on state
  const getButtonText = () => {
    if (sending) return 'Sending...';
    if (sent) return 'Sent!';
    if (error) return 'Error';
    if (needsSave) return 'Email';
    return 'Email';
  };

  return (
    <button
      onClick={handleEmail}
      disabled={isDisabled}
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
        sent
          ? 'bg-emerald-800/50 text-emerald-400'
          : error
          ? 'bg-red-800/50 text-red-400'
          : needsSave
          ? 'bg-zinc-800/30 text-zinc-600 cursor-not-allowed'
          : 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300'
      }`}
      title={getTooltip()}
    >
      {getButtonText()}
    </button>
  );
}
