'use client';

// === AUTH MODAL ===
// Sign in / Sign up modal with multiple providers

import { useState, useEffect } from 'react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPasswordForEmail, updatePassword, supabase } from '../../lib/supabase';

export default function AuthModal({ isOpen, onClose, initialMode }) {
  const [mode, setMode] = useState('signin'); // 'signin', 'signup', 'forgot', 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Set initial mode when modal opens
  useEffect(() => {
    if (isOpen && initialMode) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  // Listen for open event
  useEffect(() => {
    function handleOpen(e) {
      // Reset state when opening
      setMode(e.detail?.mode || 'signin');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setError('');
      setMessage('');
    }

    window.addEventListener('open-auth-modal', handleOpen);
    return () => window.removeEventListener('open-auth-modal', handleOpen);
  }, []);

  if (!isOpen) return null;

  async function handleGoogleSignIn() {
    setLoading(true);
    setError('');

    const { error } = await signInWithGoogle();

    if (error) {
      setError(error.message || 'Failed to sign in with Google');
      setLoading(false);
    }
    // On success, will redirect to Google
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (mode === 'signin') {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        setError(error.message || 'Failed to sign in');
      } else {
        onClose();
      }
    } else if (mode === 'signup') {
      const { data, error } = await signUpWithEmail(email, password);
      if (error) {
        setError(error.message || 'Failed to sign up');
      } else if (data?.user?.identities?.length === 0) {
        setError('An account with this email already exists');
      } else {
        setMessage('Check your email for a confirmation link!');
      }
    } else if (mode === 'forgot') {
      const { error } = await resetPasswordForEmail(email);
      if (error) {
        setError(error.message || 'Failed to send reset email');
      } else {
        setMessage('Check your email for a password reset link!');
      }
    } else if (mode === 'reset') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }
      const { error } = await updatePassword(password);
      if (error) {
        setError(error.message || 'Failed to update password');
      } else {
        setMessage('Password updated successfully!');
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    }

    setLoading(false);
  }

  function getTitle() {
    switch (mode) {
      case 'signup': return 'Create Account';
      case 'forgot': return 'Reset Password';
      case 'reset': return 'Set New Password';
      default: return 'Welcome Back';
    }
  }

  function getSubtitle() {
    switch (mode) {
      case 'signup': return 'Join to save readings, share insights, and explore together';
      case 'forgot': return 'Enter your email and we\'ll send you a reset link';
      case 'reset': return 'Choose a new password for your account';
      default: return 'Sign in to save your readings and join the community';
    }
  }

  function getButtonText() {
    if (loading) return 'Loading...';
    switch (mode) {
      case 'signup': return 'Create Account';
      case 'forgot': return 'Send Reset Link';
      case 'reset': return 'Update Password';
      default: return 'Sign In';
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-md p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">
          {getTitle()}
        </h2>
        <p className="text-sm text-zinc-400 mb-6">
          {getSubtitle()}
        </p>

        {/* Google Sign In - only show for signin/signup */}
        {(mode === 'signin' || mode === 'signup') && (
          <>
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-800 font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-zinc-900 text-zinc-500">or</span>
              </div>
            </div>
          </>
        )}

        {/* Email Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          {/* Email field - show for signin, signup, forgot */}
          {mode !== 'reset' && (
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="you@example.com"
              />
            </div>
          )}

          {/* Password field - show for signin, signup, reset */}
          {mode !== 'forgot' && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1">
                {mode === 'reset' ? 'New Password' : 'Password'}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          )}

          {/* Confirm Password - only for reset */}
          {mode === 'reset' && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-300 mb-1">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {message && (
            <p className="text-sm text-green-400">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {getButtonText()}
          </button>
        </form>

        {/* Footer links */}
        <div className="mt-6 text-center text-sm text-zinc-400 space-y-2">
          {mode === 'signin' && (
            <>
              <p>
                <button
                  onClick={() => { setMode('forgot'); setError(''); setMessage(''); }}
                  className="text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Forgot your password?
                </button>
              </p>
              <p>
                Don't have an account?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(''); setMessage(''); }}
                  className="text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Sign up
                </button>
              </p>
            </>
          )}

          {mode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => { setMode('signin'); setError(''); setMessage(''); }}
                className="text-amber-400 hover:text-amber-300 transition-colors"
              >
                Sign in
              </button>
            </p>
          )}

          {mode === 'forgot' && (
            <p>
              Remember your password?{' '}
              <button
                onClick={() => { setMode('signin'); setError(''); setMessage(''); }}
                className="text-amber-400 hover:text-amber-300 transition-colors"
              >
                Sign in
              </button>
            </p>
          )}

          {mode === 'reset' && (
            <p className="text-zinc-500">
              Enter your new password above
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
