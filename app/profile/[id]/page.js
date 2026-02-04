'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getPublicProfile,
  getUserPublicReadings,
  getUserDiscussions,
  getUser,
  updateProfile,
  ensureProfile,
  updateNotificationPrefs,
  getEmailPrefs,
  updateEmailPrefs,
  isAdmin
} from '../../../lib/supabase';
import TextSizeSlider from '../../../components/shared/TextSizeSlider';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id;

  const [profile, setProfile] = useState(null);
  const [readings, setReadings] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('readings');

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Notification preferences
  const [notifyPref, setNotifyPref] = useState('all'); // 'all' | 'replies' | 'none'

  // Email preferences
  const [emailPrefs, setEmailPrefs] = useState({
    email_readings: true,
    email_replies: true,
    email_updates: true
  });

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      setError(null);

      try {
        // Get current user
        const { user } = await getUser();
        setCurrentUser(user);
        setUserIsAdmin(isAdmin(user));

        // Get profile data
        let profileData;
        const isOwn = user?.id === userId;

        if (isOwn) {
          // Own profile - ensure it exists (create if needed)
          const { data, error } = await ensureProfile();
          if (error) {
            console.error('Error ensuring profile:', error);
            setError('Failed to load profile');
            setIsLoading(false);
            return;
          }
          profileData = data;
        } else {
          // Someone else's profile
          const { data, error: profileError } = await getPublicProfile(userId);
          if (profileError || !data) {
            setError('Profile not found');
            setIsLoading(false);
            return;
          }
          profileData = data;
        }

        setProfile(profileData);
        setEditName(profileData?.display_name || '');
        setEditBio(profileData?.bio || '');
        setNotifyPref(profileData?.notification_prefs || 'all');

        // Load email preferences for own profile
        if (user?.id === userId) {
          const { data: emailData } = await getEmailPrefs();
          if (emailData) {
            setEmailPrefs({
              email_readings: emailData.email_readings !== false,
              email_replies: emailData.email_replies !== false,
              email_updates: emailData.email_updates !== false
            });
          }
        }

        // Get public readings
        const { data: readingsData } = await getUserPublicReadings(userId);
        setReadings(readingsData || []);

        // Get discussions
        const { data: discussionsData } = await getUserDiscussions(userId);
        setDiscussions(discussionsData || []);

      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Failed to load profile');
      }

      setIsLoading(false);
    }

    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const handleSave = async () => {
    setIsSaving(true);
    const { data, error } = await updateProfile({
      display_name: editName,
      bio: editBio
    });

    if (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to save profile. Please try again.');
    } else {
      setProfile(prev => ({
        ...prev,
        display_name: editName,
        bio: editBio
      }));
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const handleNotifyChange = async (newPref) => {
    setNotifyPref(newPref);
    await updateNotificationPrefs(newPref);
  };

  const handleEmailPrefChange = async (key, value) => {
    const newPrefs = { ...emailPrefs, [key]: value };
    setEmailPrefs(newPrefs);
    await updateEmailPrefs({ [key]: value });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getModeColor = (mode) => {
    const colors = {
      reflect: 'text-cyan-400',
      discover: 'text-amber-400',
      forge: 'text-orange-400',
      explore: 'text-emerald-400'
    };
    return colors[mode?.toLowerCase()] || 'text-zinc-400';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 animate-pulse">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <div className="text-zinc-400">{error}</div>
        <Link href="/" className="text-amber-400 hover:text-amber-300 text-sm">
          Return to Reader
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Text size slider - top right */}
      <div className="fixed top-3 right-3 z-50">
        <TextSizeSlider />
      </div>

      {/* Global Header */}
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name || 'User'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-3xl text-amber-400 font-medium">
                  {(profile?.display_name || 'U')[0].toUpperCase()}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500/50"
                      placeholder="Your display name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Bio</label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500/50 resize-none"
                      rows={3}
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-4 py-2 bg-amber-500 text-zinc-900 rounded-lg text-sm font-medium hover:bg-amber-400 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditName(profile?.display_name || '');
                        setEditBio(profile?.bio || '');
                      }}
                      className="px-4 py-2 bg-zinc-700 text-zinc-300 rounded-lg text-sm hover:bg-zinc-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-medium text-zinc-100 truncate">
                      {profile?.display_name || 'Anonymous Reader'}
                    </h1>
                    {isOwnProfile && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-zinc-500 hover:text-amber-400 transition-colors"
                        title="Edit profile"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  {profile?.bio && (
                    <p className="text-zinc-400 text-sm mb-3">{profile.bio}</p>
                  )}
                  <p className="text-zinc-600 text-xs">
                    Member since {formatDate(profile?.created_at)}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-6 pt-6 border-t border-zinc-800">
            <div className="text-center">
              <div className="text-2xl font-medium text-amber-400">{readings.length}</div>
              <div className="text-xs text-zinc-500">Public Readings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-medium text-cyan-400">{discussions.length}</div>
              <div className="text-xs text-zinc-500">Discussions</div>
            </div>
          </div>

          {/* Notification Preferences - only for own profile */}
          {isOwnProfile && (
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <h3 className="text-sm text-zinc-400 mb-3">Notification Badge</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleNotifyChange('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    notifyPref === 'all'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-300 border border-zinc-700'
                  }`}
                >
                  All Posts
                </button>
                <button
                  onClick={() => handleNotifyChange('replies')}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    notifyPref === 'replies'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-300 border border-zinc-700'
                  }`}
                >
                  Replies Only
                </button>
                <button
                  onClick={() => handleNotifyChange('none')}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    notifyPref === 'none'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-300 border border-zinc-700'
                  }`}
                >
                  None
                </button>
              </div>
              <p className="text-xs text-zinc-600 mt-2">Controls the badge on your avatar showing unread community posts</p>
            </div>
          )}

          {/* Email Preferences - only for own profile */}
          {isOwnProfile && (
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <h3 className="text-sm text-zinc-400 mb-3">Email Notifications</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={emailPrefs.email_readings}
                    onChange={(e) => handleEmailPrefChange('email_readings', e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/50 focus:ring-offset-0"
                  />
                  <span className="text-sm text-zinc-300 group-hover:text-zinc-200">Reading results</span>
                  <span className="text-xs text-zinc-600">Receive your reading interpretations via email</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={emailPrefs.email_replies}
                    onChange={(e) => handleEmailPrefChange('email_replies', e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/50 focus:ring-offset-0"
                  />
                  <span className="text-sm text-zinc-300 group-hover:text-zinc-200">Forum replies</span>
                  <span className="text-xs text-zinc-600">Get notified when someone replies to your posts</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={emailPrefs.email_updates}
                    onChange={(e) => handleEmailPrefChange('email_updates', e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/50 focus:ring-offset-0"
                  />
                  <span className="text-sm text-zinc-300 group-hover:text-zinc-200">Version updates</span>
                  <span className="text-xs text-zinc-600">Announcements about new features and changes</span>
                </label>
              </div>
              <p className="text-xs text-zinc-600 mt-3">You can also unsubscribe via links in any email we send</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800 w-fit">
          <button
            onClick={() => setActiveTab('readings')}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              activeTab === 'readings'
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Readings ({readings.length})
          </button>
          <button
            onClick={() => setActiveTab('discussions')}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              activeTab === 'discussions'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Discussions ({discussions.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'readings' && (
          <div className="space-y-3">
            {readings.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                {isOwnProfile
                  ? "You haven't shared any readings publicly yet."
                  : "No public readings to show."}
              </div>
            ) : (
              readings.map(reading => (
                <Link
                  key={reading.id}
                  href={`/r/${reading.share_slug}`}
                  className="block bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 group-hover:text-amber-400 transition-colors line-clamp-2">
                        {reading.question || 'Untitled reading'}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-xs font-medium uppercase ${getModeColor(reading.mode)}`}>
                          {reading.mode}
                        </span>
                        <span className="text-xs text-zinc-600">
                          {reading.spread_type}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-600 whitespace-nowrap">
                      {formatDate(reading.created_at)}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === 'discussions' && (
          <div className="space-y-3">
            {discussions.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                {isOwnProfile
                  ? "You haven't started any discussions yet."
                  : "No discussions to show."}
              </div>
            ) : (
              discussions.map(discussion => (
                <Link
                  key={discussion.id}
                  href={`/hub?discussion=${discussion.id}`}
                  className="block bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 group-hover:text-cyan-400 transition-colors">
                        {discussion.title}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-zinc-500 capitalize">
                          {discussion.topic_type}
                        </span>
                        {discussion.reply_count > 0 && (
                          <span className="text-xs text-zinc-600">
                            {discussion.reply_count} {discussion.reply_count === 1 ? 'reply' : 'replies'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-600 whitespace-nowrap">
                      {formatDate(discussion.created_at)}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
