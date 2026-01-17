'use client';

// === SHARE READING BUTTON ===
// Generate shareable link for a reading

import { useState } from 'react';
import { setReadingPublic, getUser } from '../../lib/supabase';

export default function ShareReadingButton({ reading, readingId, fallbackUrl, disabled }) {
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);

  // Check if sharing is possible
  const needsSave = !readingId && !fallbackUrl;
  const isDisabled = sharing || disabled || needsSave;

  async function handleShare() {
    if (isDisabled) return;

    setSharing(true);
    setError(null);

    try {
      const { user } = await getUser();

      if (user && readingId) {
        // Make reading public and update content (so shared view has full data)
        const { data, error: shareError } = await setReadingPublic(readingId, true, reading);
        if (shareError) {
          console.error('Share error:', shareError);
          setError('Failed to share');
        } else if (data?.share_slug) {
          const url = `${window.location.origin}/r/${data.share_slug}`;
          setShareUrl(url);
          setShowModal(true);
        }
      } else if (fallbackUrl) {
        // Use pre-computed share URL if available
        setShareUrl(fallbackUrl);
        setShowModal(true);
      } else if (!user) {
        // User not signed in
        setError('Sign in to share');
      } else {
        // No readingId and no fallback - need to save first
        setError('Save first');
      }
    } catch (e) {
      console.error('Share failed:', e);
      setError('Failed to share');
    } finally {
      setSharing(false);
    }
  }

  // Build tooltip text
  const getTooltip = () => {
    if (error) return error;
    if (needsSave) return 'Save reading first to enable sharing';
    return 'Share this reading';
  };

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  }

  return (
    <>
      <button
        onClick={handleShare}
        disabled={isDisabled}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
          error
            ? 'bg-red-800/50 text-red-400'
            : needsSave
            ? 'bg-zinc-800/30 text-zinc-600 cursor-not-allowed'
            : 'bg-zinc-800/50 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300'
        }`}
        title={getTooltip()}
      >
        {sharing ? 'Sharing...' : error ? 'Error' : 'Share'}
      </button>

      {/* Share Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowModal(false)}
          />

          <div className="relative bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-md p-6">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-semibold text-zinc-100 mb-2">
              Share Reading
            </h3>
            <p className="text-sm text-zinc-400 mb-4">
              Anyone with this link can view this reading
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm"
              />
              <button
                onClick={copyToClipboard}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Social share buttons */}
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 mb-3">Share on:</p>
              <div className="flex gap-2">
                <a
                  href={`https://twitter.com/intent/tweet?text=Check out my Nirmanakaya reading&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
                >
                  Twitter
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
                >
                  Facebook
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
