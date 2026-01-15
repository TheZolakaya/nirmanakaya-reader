'use client';

// === SHARE READING BUTTON ===
// Generate shareable link for a reading

import { useState } from 'react';
import { setReadingPublic, getUser } from '../../lib/supabase';

export default function ShareReadingButton({ reading, readingId, fallbackUrl }) {
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  async function handleShare() {
    setSharing(true);

    try {
      const { user } = await getUser();

      if (user && readingId) {
        // Make reading public and get share slug
        const { data, error } = await setReadingPublic(readingId, true);
        if (!error && data?.share_slug) {
          const url = `${window.location.origin}/r/${data.share_slug}`;
          setShareUrl(url);
          setShowModal(true);
        }
      } else if (fallbackUrl) {
        // Use pre-computed share URL if available
        setShareUrl(fallbackUrl);
        setShowModal(true);
      } else {
        // No fallback URL available
        console.warn('No share URL available - reading must be saved first');
      }
    } catch (e) {
      console.error('Share failed:', e);
    } finally {
      setSharing(false);
    }
  }

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
        disabled={sharing}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-zinc-800/50 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
        title="Share this reading"
      >
        {sharing ? 'Sharing...' : 'Share'}
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
