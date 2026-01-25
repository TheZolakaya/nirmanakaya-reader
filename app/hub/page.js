'use client';

// === COMMUNITY HUB ===
// Discussion forum with immersive backgrounds matching the Reader

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { getDiscussions, getDiscussion, createDiscussion, createReply, getUser, updateLastHubVisit, ensureProfile, REACTION_EMOJIS, toggleReaction } from '../../lib/supabase';
import { VERSION } from '../../lib/version';

// Linkify URLs in text content
function linkifyContent(text) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])|(\b(?:www\.)[^\s<]+[^<.,:;"')\]\s])/gi;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const url = match[0];
    const href = url.startsWith('http') ? url : `https://${url}`;
    parts.push(
      <a
        key={match.index}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-amber-400 hover:text-amber-300 underline break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

const TOPIC_TYPES = [
  { value: 'general', label: 'General', color: 'text-zinc-400' },
  { value: 'reading', label: 'Readings', color: 'text-rose-400' },
  { value: 'feedback', label: 'Feedback & Support', color: 'text-orange-400' },
  { value: 'math', label: 'The Math', color: 'text-cyan-400' },
  { value: 'nowism', label: 'Nowism', color: 'text-emerald-400' },
  { value: 'consciousness', label: 'Materialism vs. CiP', color: 'text-fuchsia-400' },
  { value: 'concept', label: 'Concepts', color: 'text-violet-400' },
  { value: 'signature', label: 'Signatures', color: 'text-amber-400' }
];

// Background options (shared with Reader)
const videoBackgrounds = [
  { id: "cosmos", src: "/video/cosmos.mp4", label: "Cosmos" },
  { id: "ocean", src: "/video/background.mp4", label: "Ocean" },
  { id: "ocean2", src: "/video/ocean2.mp4", label: "Deep Ocean" },
  { id: "rainbow", src: "/video/rainbow.mp4", label: "Rainbow" },
  { id: "forest", src: "/video/forest.mp4", label: "Forest" },
  { id: "violet", src: "/video/violet.mp4", label: "Violet" },
];

const imageBackgrounds = [
  { id: "deep-ocean-1", src: "/images/Zolakaya_abstract_fractal_deep_blue_ocean_fills_the_image_--s_834b4b03-ff4a-4dba-b095-276ca0078063_1.png", label: "Deep Ocean 1" },
  { id: "deep-ocean-2", src: "/images/Zolakaya_abstract_fractal_deep_blue_ocean_fills_the_image_--s_834b4b03-ff4a-4dba-b095-276ca0078063_3.png", label: "Deep Ocean 2" },
  { id: "cosmic-1", src: "/images/Zolakaya_Cosmic_rainbow_of_colors_fractal_expressions_of_holy_71e29517-f921-418c-9415-aa100c5acf4e_0.png", label: "Cosmic 1" },
  { id: "cosmic-2", src: "/images/Zolakaya_Cosmic_rainbow_of_colors_fractal_expressions_of_holy_71e29517-f921-418c-9415-aa100c5acf4e_1.png", label: "Cosmic 2" },
  { id: "cosmic-3", src: "/images/Zolakaya_Cosmic_rainbow_of_colors_fractal_expressions_of_holy_71e29517-f921-418c-9415-aa100c5acf4e_2.png", label: "Cosmic 3" },
  { id: "forest", src: "/images/Zolakaya_imaginary_green_Lucious_fractal_garden_calm_forest_w_ff789520-3ec5-437d-b2da-d378d9a837f2_0.png", label: "Forest" },
  { id: "violet-1", src: "/images/Zolakaya_Sparkling_fractal_Purple_flowers_radiating_from_ever_2da9d73c-5041-4ae6-8f9f-c09b40d828f2_0.png", label: "Violet 1" },
  { id: "violet-2", src: "/images/Zolakaya_Sparkling_fractal_Purple_flowers_radiating_from_ever_2da9d73c-5041-4ae6-8f9f-c09b40d828f2_2.png", label: "Violet 2" },
  { id: "violet-3", src: "/images/Zolakaya_Sparkling_fractal_Purple_flowers_radiating_from_ever_2da9d73c-5041-4ae6-8f9f-c09b40d828f2_3.png", label: "Violet 3" },
  { id: "tunnel-1", src: "/images/Zolakaya_The_beautiful_glowing_circular_tunnel_to_heaven_no_f_ba01ff35-10b4-4a2b-a941-6d3f084b6e44_0.png", label: "Tunnel 1" },
  { id: "tunnel-2", src: "/images/Zolakaya_The_beautiful_glowing_circular_tunnel_to_heaven_no_f_ba01ff35-10b4-4a2b-a941-6d3f084b6e44_3.png", label: "Tunnel 2" },
];

export default function HubPage() {
  const router = useRouter();
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTopicType, setNewTopicType] = useState('general');
  const [posting, setPosting] = useState(false);
  const [replyReactionsState, setReplyReactionsState] = useState({});

  // Reddit-style features
  const [sortBy, setSortBy] = useState('new');
  const [expandedThreads, setExpandedThreads] = useState({});
  const [threadReplies, setThreadReplies] = useState({});
  const [loadingThread, setLoadingThread] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [collapsedReplies, setCollapsedReplies] = useState({});

  // Background & theme state (shared with Reader preferences)
  const [theme, setTheme] = useState('dark');
  const [backgroundType, setBackgroundType] = useState('video');
  const [backgroundOpacity, setBackgroundOpacity] = useState(30);
  const [contentDim, setContentDim] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showBgControls, setShowBgControls] = useState(false);

  // Load preferences from localStorage (shared with Reader)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nirmanakaya_prefs');
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.theme !== undefined) setTheme(prefs.theme);
        if (prefs.backgroundType !== undefined) setBackgroundType(prefs.backgroundType);
        if (prefs.backgroundOpacity !== undefined) setBackgroundOpacity(prefs.backgroundOpacity);
        if (prefs.contentDim !== undefined) setContentDim(prefs.contentDim);
        if (prefs.selectedVideo !== undefined) setSelectedVideo(prefs.selectedVideo);
        if (prefs.selectedImage !== undefined) setSelectedImage(prefs.selectedImage);
      }
    } catch (e) {
      console.warn('Failed to load preferences:', e);
    }
  }, []);

  // Load discussions
  useEffect(() => {
    async function loadData() {
      const { user } = await getUser();
      setUser(user);
      if (user) {
        await ensureProfile();
        await updateLastHubVisit();
      }
      const { data, error } = await getDiscussions({ topicType: filter });
      if (error) console.error('Failed to load discussions:', error);
      setDiscussions(data || []);
      setLoading(false);
    }
    loadData();
  }, [filter]);

  // Get current background label
  const getCurrentBackground = () => {
    if (backgroundType === 'video') {
      return videoBackgrounds[selectedVideo] || videoBackgrounds[0];
    }
    return imageBackgrounds[selectedImage] || imageBackgrounds[0];
  };

  // Cycle through backgrounds
  function cycleBackground(direction) {
    if (backgroundType === 'video') {
      setSelectedVideo(prev => {
        const next = prev + direction;
        if (next < 0) return videoBackgrounds.length - 1;
        if (next >= videoBackgrounds.length) return 0;
        return next;
      });
    } else {
      setSelectedImage(prev => {
        const next = prev + direction;
        if (next < 0) return imageBackgrounds.length - 1;
        if (next >= imageBackgrounds.length) return 0;
        return next;
      });
    }
  }

  async function handlePost() {
    if (!newTitle.trim() || !newContent.trim()) return;
    setPosting(true);
    const { data, error } = await createDiscussion({
      title: newTitle.trim(),
      content: newContent.trim(),
      topicType: newTopicType
    });
    if (error) {
      console.error('Failed to create discussion:', error);
      alert('Failed to create discussion');
    } else {
      setDiscussions([{ ...data, profiles: { display_name: user?.email?.split('@')[0] } }, ...discussions]);
      setNewTitle('');
      setNewContent('');
      setShowNewPost(false);
    }
    setPosting(false);
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function getTopicColor(type) {
    return TOPIC_TYPES.find(t => t.value === type)?.color || 'text-zinc-400';
  }

  function getTopicLabel(type) {
    return TOPIC_TYPES.find(t => t.value === type)?.label || type;
  }

  function getReactionCounts(reactions) {
    const counts = {};
    (reactions || []).forEach(r => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });
    return counts;
  }

  function userReacted(reactions, emoji) {
    return (reactions || []).some(r => r.emoji === emoji && r.user_id === user?.id);
  }

  async function handleReaction(e, discussionId, emoji) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    const { action, error } = await toggleReaction({ discussionId, emoji });
    if (error) return;
    setDiscussions(prev => prev.map(d => {
      if (d.id !== discussionId) return d;
      const reactions = d.reactions || [];
      if (action === 'added') {
        return { ...d, reactions: [...reactions, { emoji, user_id: user.id }] };
      } else {
        return { ...d, reactions: reactions.filter(r => !(r.emoji === emoji && r.user_id === user.id)) };
      }
    }));
  }

  async function handleReplyReaction(e, replyId, discussionId, emoji) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    const { action, error } = await toggleReaction({ replyId, emoji });
    if (error) return;
    setDiscussions(prev => prev.map(d => {
      if (d.id !== discussionId) return d;
      return {
        ...d,
        topReplies: (d.topReplies || []).map(r => {
          if (r.id !== replyId) return r;
          const reactions = r.reactions || [];
          if (action === 'added') {
            return { ...r, reactions: [...reactions, { emoji, user_id: user.id }] };
          } else {
            return { ...r, reactions: reactions.filter(rx => !(rx.emoji === emoji && rx.user_id === user.id)) };
          }
        })
      };
    }));
  }

  async function toggleThread(discussionId) {
    if (expandedThreads[discussionId]) {
      setExpandedThreads(prev => ({ ...prev, [discussionId]: false }));
      return;
    }
    if (!threadReplies[discussionId]) {
      setLoadingThread(discussionId);
      const { data } = await getDiscussion(discussionId);
      if (data?.replies) {
        setThreadReplies(prev => ({ ...prev, [discussionId]: data.replies }));
      }
      setLoadingThread(null);
    }
    setExpandedThreads(prev => ({ ...prev, [discussionId]: true }));
  }

  async function handleInlineReply(discussionId) {
    if (!replyContent.trim() || !user) return;
    setSubmittingReply(true);
    const { data, error } = await createReply(discussionId, replyContent.trim());
    if (!error && data) {
      setThreadReplies(prev => ({
        ...prev,
        [discussionId]: [...(prev[discussionId] || []), data]
      }));
      setDiscussions(prev => prev.map(d =>
        d.id === discussionId ? { ...d, reply_count: (d.reply_count || 0) + 1 } : d
      ));
      setReplyContent('');
      setReplyingTo(null);
    }
    setSubmittingReply(false);
  }

  function toggleCollapseReply(replyId) {
    setCollapsedReplies(prev => ({ ...prev, [replyId]: !prev[replyId] }));
  }

  function getHotScore(discussion) {
    const upvotes = (discussion.reactions || []).filter(r => r.emoji === '👍').length;
    const hoursSincePost = (Date.now() - new Date(discussion.created_at).getTime()) / 3600000;
    return upvotes / Math.pow(hoursSincePost + 2, 1.5);
  }

  function getSortedDiscussions() {
    const sorted = [...discussions];
    switch (sortBy) {
      case 'hot':
        return sorted.sort((a, b) => getHotScore(b) - getHotScore(a));
      case 'top':
        const getScore = d => (d.reactions || []).filter(r => r.emoji === '👍').length;
        return sorted.sort((a, b) => getScore(b) - getScore(a));
      case 'new':
      default:
        return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  }

  const sortedDiscussions = getSortedDiscussions();

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === 'light' ? 'bg-stone-200' : 'bg-zinc-950'} flex items-center justify-center`}>
        <div className="text-zinc-500">Loading discussions...</div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${theme === 'light' ? 'bg-stone-200 text-stone-900' : 'bg-zinc-950 text-zinc-100'}`}
      data-theme={theme}
    >
      {/* Background - Video or Image */}
      {backgroundType === 'video' && videoBackgrounds[selectedVideo]?.src && (
        <video
          key={videoBackgrounds[selectedVideo].id}
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 w-full h-full object-cover z-0"
          style={{ pointerEvents: "none", opacity: backgroundOpacity / 100 }}
        >
          <source src={videoBackgrounds[selectedVideo].src} type="video/mp4" />
        </video>
      )}
      {backgroundType === 'image' && imageBackgrounds[selectedImage]?.src && (
        <div
          key={imageBackgrounds[selectedImage].id}
          className="fixed inset-0 w-full h-full z-0"
          style={{
            backgroundImage: `url(${imageBackgrounds[selectedImage].src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            pointerEvents: "none",
            opacity: backgroundOpacity / 100
          }}
        />
      )}

      {/* Main content overlay */}
      <div className="relative z-10" style={{ '--content-dim': contentDim / 100 }}>

        {/* Background controls toggle button */}
        <div className="fixed top-3 left-3 z-50">
          <button
            onClick={() => setShowBgControls(!showBgControls)}
            className="w-8 h-8 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/50 backdrop-blur-sm text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center justify-center transition-all"
            title={showBgControls ? "Hide background controls" : "Show background controls"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        {/* Floating Background Controls Panel */}
        {showBgControls && (
          <div className="fixed top-14 left-3 z-50 w-72 bg-zinc-900/95 border border-zinc-700/50 rounded-xl shadow-2xl backdrop-blur-sm">
            <div className="p-4 border-b border-zinc-800/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-200">Background</h3>
                <button onClick={() => setShowBgControls(false)} className="text-zinc-500 hover:text-zinc-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Type Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBackgroundType('video')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    backgroundType === 'video'
                      ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                      : 'bg-zinc-800/50 text-zinc-400 border border-transparent hover:bg-zinc-800'
                  }`}
                >
                  Video
                </button>
                <button
                  onClick={() => setBackgroundType('image')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    backgroundType === 'image'
                      ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                      : 'bg-zinc-800/50 text-zinc-400 border border-transparent hover:bg-zinc-800'
                  }`}
                >
                  Image
                </button>
              </div>

              {/* Background Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => cycleBackground(-1)}
                  className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm text-zinc-300">{getCurrentBackground().label}</span>
                <button
                  onClick={() => cycleBackground(1)}
                  className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Background Opacity */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500">Brightness</span>
                  <span className="text-xs text-zinc-400">{backgroundOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={backgroundOpacity}
                  onChange={(e) => setBackgroundOpacity(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Content Dimming */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500">Content Dim</span>
                  <span className="text-xs text-zinc-400">{contentDim}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={contentDim}
                  onChange={(e) => setContentDim(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Theme toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                <span className="text-xs text-zinc-500">Theme</span>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                  title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
                >
                  {theme === 'dark' ? (
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Version - sneaky placement */}
              <div className="text-center pt-2 border-t border-zinc-800/30 mt-2">
                <span className="text-[0.625rem] text-zinc-600">v{VERSION}</span>
              </div>
            </div>
          </div>
        )}

        {/* Main NIRMANAKAYA header - FIXED */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/60 backdrop-blur-sm text-center py-6 border-b border-zinc-800/30">
          <Link href="/" className="inline-block">
            <h1 className="text-[1.25rem] sm:text-2xl md:text-3xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] mb-1 hover:opacity-80 transition-opacity">
              <span className="rainbow-letter rainbow-letter-0">N</span>
              <span className="rainbow-letter rainbow-letter-1">I</span>
              <span className="rainbow-letter rainbow-letter-2">R</span>
              <span className="rainbow-letter rainbow-letter-3">M</span>
              <span className="rainbow-letter rainbow-letter-4">A</span>
              <span className="rainbow-letter rainbow-letter-5">N</span>
              <span className="rainbow-letter rainbow-letter-6">A</span>
              <span className="rainbow-letter rainbow-letter-7">K</span>
              <span className="rainbow-letter rainbow-letter-8">A</span>
              <span className="rainbow-letter rainbow-letter-9">Y</span>
              <span className="rainbow-letter rainbow-letter-10">A</span>
            </h1>
          </Link>
          <p className="text-zinc-300 text-sm tracking-wide font-light">Community Hub</p>
          {/* Nav Links - rainbow hover colors, current section first */}
          <div className="flex justify-center gap-2 mt-3 text-xs">
            <Link href="/" className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-rose-400 hover:border-rose-500/50 transition-all">
              Reader
            </Link>
            <Link href="/guide" className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-amber-400 hover:border-amber-500/50 transition-all">
              Guide
            </Link>
            <Link href="/about" className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-emerald-400 hover:border-emerald-500/50 transition-all">
              About
            </Link>
            <Link href="/lounge" className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-all">
              Lounge
            </Link>
            <Link href="/council" className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-violet-400 hover:border-violet-500/50 transition-all">
              Council
            </Link>
            <a href="/map" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-fuchsia-400 hover:border-fuchsia-500/50 transition-all">
              Map
            </a>
          </div>
        </div>

        {/* Spacer for fixed header */}
        <div className="pt-36"></div>

        {/* Sort tabs + New Post */}
        <div className="content-pane border-b border-zinc-800/30 bg-zinc-900/30 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              {/* Sorting buttons */}
              <div className="flex items-center gap-1">
                {[
                  { key: 'hot', label: 'Hot', icon: '🔥' },
                  { key: 'new', label: 'New', icon: '✨' },
                  { key: 'top', label: 'Top', icon: '⬆️' }
                ].map(sort => (
                  <button
                    key={sort.key}
                    onClick={() => setSortBy(sort.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                      sortBy === sort.key
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-600/40'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    <span>{sort.icon}</span>
                    {sort.label}
                  </button>
                ))}
              </div>
              {/* New Post button */}
              {user && (
                <button
                  onClick={() => setShowNewPost(true)}
                  className="px-4 py-2 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 transition-colors text-sm border border-amber-600/30"
                >
                  New Post
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter(null)}
                className={`px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                  filter === null
                    ? 'bg-zinc-700 text-zinc-200'
                    : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                All
              </button>
              {TOPIC_TYPES.map(topic => (
                <button
                  key={topic.value}
                  onClick={() => setFilter(topic.value)}
                  className={`px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                    filter === topic.value
                      ? 'bg-zinc-700 text-zinc-200'
                      : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {topic.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          {!user && (
            <div className="content-pane mb-6 p-4 bg-amber-900/20 border border-amber-700/30 rounded-lg text-center backdrop-blur-sm">
              <p className="text-amber-400/80 text-sm mb-2">Sign in to join the conversation</p>
              <button
                onClick={() => window.dispatchEvent(new Event('open-auth-modal'))}
                className="px-4 py-2 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 transition-colors text-sm"
              >
                Sign In
              </button>
            </div>
          )}

          {discussions.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-zinc-600 mb-2">No discussions yet</div>
              <div className="text-zinc-500 text-sm">Be the first to start a conversation</div>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedDiscussions.map((discussion, index) => {
                const reactionCounts = getReactionCounts(discussion.reactions);
                const topReplies = discussion.topReplies || [];
                const totalReplies = discussion.reply_count || 0;
                const isExpanded = expandedThreads[discussion.id];
                const allReplies = threadReplies[discussion.id] || [];
                const upvotes = reactionCounts['👍'] || 0;
                const isEven = index % 2 === 0;

                return (
                  <div
                    key={discussion.id}
                    className={`content-pane border border-zinc-800/50 rounded-lg hover:border-zinc-700/50 transition-colors overflow-hidden backdrop-blur-sm ${
                      isEven ? 'bg-zinc-900/60' : 'bg-zinc-900/40'
                    }`}
                  >
                    {/* Original post */}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs ${getTopicColor(discussion.topic_type)}`}>
                          {getTopicLabel(discussion.topic_type)}
                        </span>
                        <span className="text-zinc-600 text-xs">
                          {formatDate(discussion.created_at)}
                        </span>
                        <span className="text-xs text-zinc-600">
                          by <Link
                            href={`/profile/${discussion.user_id}`}
                            className="hover:text-amber-400 transition-colors"
                          >
                            {discussion.profiles?.display_name || 'Anonymous'}
                          </Link>
                        </span>
                      </div>
                      <h3 className="text-zinc-200 font-medium mb-2">
                        {discussion.title}
                      </h3>
                      <div className="text-zinc-400 text-sm mb-3 whitespace-pre-wrap">
                        {linkifyContent(discussion.content.slice(0, 300))}
                        {discussion.content.length > 300 ? '...' : ''}
                      </div>

                      {/* Reaction buttons */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg px-1">
                          <button
                            onClick={(e) => handleReaction(e, discussion.id, '👍')}
                            className={`p-1 rounded transition-all ${
                              userReacted(discussion.reactions, '👍')
                                ? 'text-amber-400'
                                : 'text-zinc-500 hover:text-amber-400'
                            }`}
                            title="Upvote"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <span className={`text-sm font-medium min-w-[1.5rem] text-center ${upvotes > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                            {upvotes}
                          </span>
                          <button
                            onClick={(e) => handleReaction(e, discussion.id, '👎')}
                            className={`p-1 rounded transition-all ${
                              userReacted(discussion.reactions, '👎')
                                ? 'text-indigo-400'
                                : 'text-zinc-500 hover:text-indigo-400'
                            }`}
                            title="Downvote"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                        {REACTION_EMOJIS.filter(e => e !== '👍' && e !== '👎').map(emoji => {
                          const count = reactionCounts[emoji] || 0;
                          const reacted = userReacted(discussion.reactions, emoji);
                          return (
                            <button
                              key={emoji}
                              onClick={(e) => handleReaction(e, discussion.id, emoji)}
                              className={`px-1.5 py-0.5 rounded text-sm transition-all ${
                                reacted
                                  ? 'bg-amber-600/30 border border-amber-500/50'
                                  : 'bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-700/50'
                              }`}
                            >
                              {emoji}
                              {count > 0 && <span className="ml-0.5 text-zinc-400 text-xs">{count}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Replies section - only visible when expanded */}
                    {isExpanded && allReplies.length > 0 && (
                      <div className="border-t border-zinc-800/50 bg-zinc-900/30">
                        {/* Scrollable container - shows ~5 replies at a time */}
                        <div className="max-h-[500px] overflow-y-auto p-4 space-y-3">
                          {allReplies.map(reply => {
                            const replyReactionCounts = getReactionCounts(reply.reactions);
                            const isCollapsed = collapsedReplies[reply.id];
                            return (
                              <div key={reply.id} className="pl-4 border-l-2 border-zinc-700/50">
                                <div className="flex items-start gap-2">
                                  <button
                                    onClick={() => toggleCollapseReply(reply.id)}
                                    className="text-zinc-600 hover:text-zinc-400 mt-1 text-xs"
                                  >
                                    {isCollapsed ? '[+]' : '[-]'}
                                  </button>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                                      <Link href={`/profile/${reply.user_id}`} className="font-medium text-zinc-400 hover:text-amber-400 transition-colors">
                                        {reply.profiles?.display_name || 'Anonymous'}
                                      </Link>
                                      <span>•</span>
                                      <span>{formatDate(reply.created_at)}</span>
                                    </div>
                                    {!isCollapsed && (
                                      <>
                                        <div className="text-zinc-300 text-sm mt-1 mb-2 whitespace-pre-wrap">
                                          {linkifyContent(reply.content)}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="flex items-center gap-1 bg-zinc-800/50 rounded px-1">
                                            <button
                                              onClick={(e) => handleReplyReaction(e, reply.id, discussion.id, '👍')}
                                              className={`p-0.5 rounded transition-all ${userReacted(reply.reactions, '👍') ? 'text-amber-400' : 'text-zinc-500 hover:text-amber-400'}`}
                                            >
                                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                              </svg>
                                            </button>
                                            <span className={`text-xs font-medium ${(replyReactionCounts['👍'] || 0) > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                                              {replyReactionCounts['👍'] || 0}
                                            </span>
                                            <button
                                              onClick={(e) => handleReplyReaction(e, reply.id, discussion.id, '👎')}
                                              className={`p-0.5 rounded transition-all ${userReacted(reply.reactions, '👎') ? 'text-indigo-400' : 'text-zinc-500 hover:text-indigo-400'}`}
                                            >
                                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                              </svg>
                                            </button>
                                          </div>
                                          {REACTION_EMOJIS.filter(e => e !== '👍' && e !== '👎').map(emoji => {
                                            const count = replyReactionCounts[emoji] || 0;
                                            const reacted = userReacted(reply.reactions, emoji);
                                            return (
                                              <button
                                                key={emoji}
                                                onClick={(e) => handleReplyReaction(e, reply.id, discussion.id, emoji)}
                                                className={`px-1.5 py-0.5 rounded text-xs transition-all ${reacted ? 'bg-amber-600/30 border border-amber-500/50' : 'bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-700/50'}`}
                                              >
                                                {emoji}
                                                {count > 0 && <span className="ml-0.5 text-zinc-400">{count}</span>}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Inline reply form */}
                    {replyingTo === discussion.id && (
                      <div className="border-t border-zinc-800/50 bg-zinc-800/30 p-4">
                        <textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="What are your thoughts?"
                          rows={3}
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-amber-600/50 resize-none"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => { setReplyingTo(null); setReplyContent(''); }}
                            className="px-3 py-1.5 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleInlineReply(discussion.id)}
                            disabled={submittingReply || !replyContent.trim()}
                            className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            {submittingReply ? 'Posting...' : 'Reply'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Footer - actions */}
                    <div className="border-t border-zinc-800/50 px-4 py-2 flex items-center gap-4 bg-zinc-900/20">
                      <button
                        onClick={() => toggleThread(discussion.id)}
                        className="text-zinc-400 hover:text-zinc-200 text-sm transition-colors flex items-center gap-1"
                      >
                        {loadingThread === discussion.id ? (
                          <span className="animate-pulse">Loading...</span>
                        ) : isExpanded ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            Collapse
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            {totalReplies} {totalReplies === 1 ? 'reply' : 'replies'}
                          </>
                        )}
                      </button>
                      {user && replyingTo !== discussion.id && (
                        <button
                          onClick={() => { setReplyingTo(discussion.id); toggleThread(discussion.id); }}
                          className="text-zinc-400 hover:text-amber-400 text-sm transition-colors flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                          Reply
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Post Modal */}
      {showNewPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowNewPost(false)} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-lg p-6">
            <button
              onClick={() => setShowNewPost(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">New Discussion</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Topic</label>
                <select
                  value={newTopicType}
                  onChange={(e) => setNewTopicType(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-amber-600/50"
                >
                  {TOPIC_TYPES.map(topic => (
                    <option key={topic.value} value={topic.value}>{topic.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-amber-600/50"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Content</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Share your thoughts, questions, or insights..."
                  rows={5}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-amber-600/50 resize-none"
                />
              </div>
              <button
                onClick={handlePost}
                disabled={posting || !newTitle.trim() || !newContent.trim()}
                className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {posting ? 'Posting...' : 'Post Discussion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
