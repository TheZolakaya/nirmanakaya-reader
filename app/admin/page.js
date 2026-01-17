'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { VERSION } from '../../lib/version.js';
import {
  getUser,
  isAdmin,
  updateUserBanStatus,
  updateUserCommunityBan,
  updateUserAdminStatus,
  updateUserTokenLimit,
  resetUserDailyTokens
} from '../../lib/supabase';

const SUPER_ADMIN_EMAIL = 'chriscrilly@gmail.com';

// Stat Card Component
const StatCard = ({ value, label, color = 'text-zinc-300', size = 'normal', highlight = false }) => (
  <div className={`
    rounded-lg p-4 transition-all
    ${highlight ? 'bg-zinc-800/80 border-2' : 'bg-zinc-800/40 border'}
    ${highlight ? `border-${color.replace('text-', '')}/50` : 'border-zinc-700/30'}
  `}>
    <div className={`${size === 'large' ? 'text-3xl' : 'text-xl'} font-light ${color} tabular-nums`}>
      {value}
    </div>
    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{label}</div>
  </div>
);

// User Row Component
const UserRow = ({
  user: u,
  isSuperAdmin,
  editingLimit,
  setEditingLimit,
  limitValue,
  setLimitValue,
  onBanToggle,
  onCommunityBanToggle,
  onAdminToggle,
  onSetLimit,
  onResetTokens,
  onDelete,
  deletingId
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-zinc-800/40 rounded-lg border border-zinc-700/30 overflow-hidden hover:border-zinc-600/50 transition-all">
      {/* Main Row */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          {/* User Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-zinc-100 truncate">
                {u.display_name || 'Anonymous'}
              </span>
              {u.is_admin && (
                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-medium">
                  ADMIN
                </span>
              )}
              {u.is_banned && (
                <span className="text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-medium">
                  BANNED
                </span>
              )}
              {u.community_banned && (
                <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-medium">
                  HUB BAN
                </span>
              )}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono truncate mt-0.5">{u.id}</div>
          </div>

          {/* Quick Stats */}
          <div className="hidden sm:flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-cyan-400 font-medium tabular-nums">{u.readingCount}</div>
              <div className="text-[10px] text-zinc-600">reads</div>
            </div>
            <div className="text-center">
              <div className="text-emerald-400 font-medium tabular-nums">{(u.totalTokens / 1000).toFixed(0)}k</div>
              <div className="text-[10px] text-zinc-600">tokens</div>
            </div>
            <div className="text-center">
              <div className="text-rose-400 font-medium tabular-nums">${u.totalCost?.toFixed(2) || '0.00'}</div>
              <div className="text-[10px] text-zinc-600">cost</div>
            </div>
          </div>

          {/* Expand Arrow */}
          <svg
            className={`w-5 h-5 text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-zinc-700/30 bg-zinc-900/50">
          {/* Detailed Stats */}
          <div className="p-4 grid grid-cols-3 sm:grid-cols-6 gap-3">
            <div className="text-center p-2 bg-zinc-800/50 rounded">
              <div className="text-violet-400 font-medium">{u.totalReflects || 0}</div>
              <div className="text-[10px] text-zinc-600">reflects</div>
            </div>
            <div className="text-center p-2 bg-zinc-800/50 rounded">
              <div className="text-orange-400 font-medium">{u.totalForges || 0}</div>
              <div className="text-[10px] text-zinc-600">forges</div>
            </div>
            <div className="text-center p-2 bg-zinc-800/50 rounded">
              <div className="text-teal-400 font-medium">{(u.totalClarifies || 0) + (u.totalUnpacks || 0) + (u.totalExamples || 0)}</div>
              <div className="text-[10px] text-zinc-600">expansions</div>
            </div>
            <div className="text-center p-2 bg-zinc-800/50 rounded">
              <div className="text-blue-400 font-medium">{u.discussionCount || 0}</div>
              <div className="text-[10px] text-zinc-600">posts</div>
            </div>
            <div className="text-center p-2 bg-zinc-800/50 rounded">
              <div className="text-pink-400 font-medium">{u.replyCount || 0}</div>
              <div className="text-[10px] text-zinc-600">replies</div>
            </div>
            <div className="text-center p-2 bg-zinc-800/50 rounded">
              <div className="text-cyan-400 font-medium capitalize">{u.maxDepthReached || 'surface'}</div>
              <div className="text-[10px] text-zinc-600">depth</div>
            </div>
          </div>

          {/* Mode Breakdown */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-zinc-500">Modes:</span>
              <span className="text-sky-400">{u.modes?.reflect || 0} Reflect</span>
              <span className="text-lime-400">{u.modes?.discover || 0} Discover</span>
              <span className="text-amber-400">{u.modes?.forge || 0} Forge</span>
              <span className="text-fuchsia-400">{u.modes?.explore || 0} Explore</span>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-zinc-700/30 bg-zinc-800/30">
            <div className="flex flex-wrap items-center gap-2">
              {/* Token Limit */}
              {editingLimit === u.id ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={limitValue}
                    onChange={(e) => setLimitValue(e.target.value)}
                    placeholder="∞"
                    className="w-20 px-2 py-1.5 text-xs bg-zinc-700 rounded border border-zinc-600 focus:outline-none focus:border-amber-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); onSetLimit(u.id); }}
                    className="px-2 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 rounded text-white"
                  >
                    Set
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingLimit(null); setLimitValue(''); }}
                    className="px-2 py-1.5 text-xs bg-zinc-600 hover:bg-zinc-500 rounded"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingLimit(u.id); setLimitValue(u.daily_token_limit?.toString() || ''); }}
                  className="px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
                >
                  Limit: {u.daily_token_limit ?? '∞'}
                </button>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); onResetTokens(u.id); }}
                className="px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
              >
                Reset Daily
              </button>

              <div className="w-px h-6 bg-zinc-700 mx-1" />

              <button
                onClick={(e) => { e.stopPropagation(); onCommunityBanToggle(u.id, u.community_banned); }}
                className={`px-3 py-1.5 text-xs rounded transition-colors ${
                  u.community_banned
                    ? 'bg-orange-600 hover:bg-orange-500 text-white'
                    : 'bg-zinc-700 hover:bg-orange-600/80 text-zinc-300 hover:text-white'
                }`}
              >
                {u.community_banned ? 'Unban Hub' : 'Ban Hub'}
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); onBanToggle(u.id, u.is_banned); }}
                className={`px-3 py-1.5 text-xs rounded transition-colors ${
                  u.is_banned
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-zinc-700 hover:bg-rose-600/80 text-zinc-300 hover:text-white'
                }`}
              >
                {u.is_banned ? 'Unban' : 'Ban All'}
              </button>

              {isSuperAdmin && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAdminToggle(u.id, u.is_admin); }}
                    className={`px-3 py-1.5 text-xs rounded transition-colors ${
                      u.is_admin
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-zinc-700 hover:bg-amber-600/80 text-zinc-300 hover:text-white'
                    }`}
                  >
                    {u.is_admin ? 'Remove Admin' : 'Make Admin'}
                  </button>

                  <div className="w-px h-6 bg-zinc-700 mx-1" />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`DELETE ${u.display_name || u.id}?\n\nThis will permanently remove:\n• All readings\n• All posts & replies\n• Profile data\n• Auth account\n\nThis cannot be undone!`)) {
                        onDelete(u.id);
                      }
                    }}
                    disabled={deletingId === u.id}
                    className="px-3 py-1.5 text-xs bg-red-900/50 hover:bg-red-700 text-red-300 hover:text-white rounded transition-colors disabled:opacity-50"
                  >
                    {deletingId === u.id ? 'Deleting...' : 'Delete User'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function AdminPanel() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('users');
  const [user, setUser] = useState(null);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Testing tab state
  const [mode, setMode] = useState('fullMonty');
  const [level, setLevel] = useState(0);
  const [readingCount, setReadingCount] = useState(0);
  const [showTokens, setShowTokens] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);

  // Users tab state
  const [users, setUsers] = useState([]);
  const [totals, setTotals] = useState({});
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingLimit, setEditingLimit] = useState(null);
  const [limitValue, setLimitValue] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Broadcast tab state
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [allUsersCount, setAllUsersCount] = useState(0);
  const [includeAll, setIncludeAll] = useState(false);
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState(null);

  // Resend confirmations state
  const [unconfirmedUsers, setUnconfirmedUsers] = useState([]);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendResult, setResendResult] = useState(null);
  const [sendingTo, setSendingTo] = useState(null);

  // Feature config state
  const [featureConfig, setFeatureConfig] = useState({
    advancedVoiceFor: 'everyone',
    modelsForAdmins: ['haiku', 'sonnet', 'opus'],
    modelsForUsers: ['sonnet'],
    defaultModelAdmin: 'sonnet',
    defaultModelUser: 'sonnet',
    defaultVoice: {
      preset: 'kind',
      persona: 'friend',
      humor: 50,
      register: 50,
      agency: 50,
      roastMode: false,
      directMode: false,
      complexity: 'guide',
      seriousness: 'light',
      voice: 'warm',
      focus: 'feel',
      density: 'essential',
      scope: 'here'
    },
    defaultMode: 'reflect',
    defaultSpread: 'triad',
    defaultBackground: {
      type: 'video',
      videoId: 'default',
      opacity: 0.4,
      dimContent: 0.3
    }
  });
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [configSection, setConfigSection] = useState('access'); // access | voice | reading | background

  useEffect(() => {
    async function checkAdmin() {
      const { user } = await getUser();
      setUser(user);
      const adminStatus = isAdmin(user);
      setUserIsAdmin(adminStatus);
      setIsSuperAdmin(user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL);
      setLoading(false);

      if (adminStatus) {
        loadUsers();
      }
    }
    checkAdmin();
  }, []);

  async function loadUsers() {
    setUsersLoading(true);
    try {
      const response = await fetch('/api/admin/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      });
      const data = await response.json();
      if (!data.error) {
        setUsers(data.users || []);
        setTotals(data.totals || {});
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    }
    setUsersLoading(false);
  }

  const LEVELS = [
    { value: 0, label: 'Level 0: First Contact', desc: '1 card, plain paragraph' },
    { value: 1, label: 'Level 1: Curious', desc: '+ Status badge' },
    { value: 2, label: 'Level 2: Seeking', desc: '+ Tappable badges' },
    { value: 3, label: 'Level 3: Opening', desc: '+ 2-3 cards' },
    { value: 4, label: 'Level 4: Exploring', desc: '+ Clarify button' },
    { value: 5, label: 'Level 5: Deepening', desc: '+ Path Forward' },
    { value: 6, label: 'Level 6: Choosing', desc: '+ Voice presets' },
    { value: 7, label: 'Level 7: Reflecting', desc: '+ Reflect mode' },
    { value: 8, label: 'Level 8: Practicing', desc: '+ Per-card Reflect/Forge' },
    { value: 9, label: 'Level 9: Expanding', desc: '+ 4-5 cards, Unpack' },
    { value: 10, label: 'Level 10: Voicing', desc: '+ Wise, Oracle voices' },
    { value: 11, label: 'Level 11: Creating', desc: '+ Forge mode' },
    { value: 12, label: 'Level 12: Sustaining', desc: '+ Export, history' },
    { value: 13, label: 'Level 13: Mastering', desc: '+ 6 cards, all spreads' },
    { value: 14, label: 'Level 14: Configuring', desc: '+ Full voice config' },
    { value: 15, label: 'Level 15: Architecting', desc: '+ Framework terms' },
    { value: 16, label: 'Level 16: Teaching', desc: '+ Document links' },
  ];

  const launch = () => {
    const config = {
      adminMode: true,
      mode,
      level: mode === 'levelSim' ? level : (mode === 'firstContact' ? 0 : 16),
      readingCount,
      debug: { showTokens, showPrompt }
    };
    sessionStorage.setItem('adminConfig', JSON.stringify(config));
    router.push('/');
  };

  const resetProgress = () => {
    localStorage.removeItem('userLevel');
    localStorage.removeItem('readingCount');
    localStorage.removeItem('featuresUsed');
    alert('Progress reset!');
  };

  async function handleBanToggle(userId, currentStatus) {
    await updateUserBanStatus(userId, !currentStatus);
    loadUsers();
  }

  async function handleCommunityBanToggle(userId, currentStatus) {
    await updateUserCommunityBan(userId, !currentStatus);
    loadUsers();
  }

  async function handleAdminToggle(userId, currentStatus) {
    const { error } = await updateUserAdminStatus(userId, !currentStatus, user?.email);
    if (error) {
      alert(error);
    } else {
      loadUsers();
    }
  }

  async function handleSetLimit(userId) {
    const limit = limitValue === '' ? null : parseInt(limitValue);
    await updateUserTokenLimit(userId, limit);
    setEditingLimit(null);
    setLimitValue('');
    loadUsers();
  }

  async function handleResetTokens(userId) {
    await resetUserDailyTokens(userId);
    loadUsers();
  }

  async function handleDeleteUser(userId) {
    setDeletingId(userId);
    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail: user?.email, userId })
      });
      const data = await response.json();
      if (data.error) {
        alert('Failed to delete: ' + data.error);
      } else {
        loadUsers();
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
    setDeletingId(null);
  }

  async function loadSubscriberCount() {
    try {
      const response = await fetch(`/api/admin/broadcast?adminEmail=${encodeURIComponent(user?.email)}`);
      const data = await response.json();
      if (!data.error) {
        setSubscriberCount(data.subscriberCount || 0);
        setAllUsersCount(data.allUsersCount || 0);
      }
    } catch (err) {
      console.error('Failed to load subscriber count:', err);
    }
  }

  async function loadUnconfirmedUsers() {
    setResendLoading(true);
    try {
      const response = await fetch(`/api/admin/resend-confirmations?adminEmail=${encodeURIComponent(user?.email)}`);
      const data = await response.json();
      if (!data.error) {
        setUnconfirmedUsers(data.unconfirmedUsers || []);
        setConfirmedCount(data.confirmedCount || 0);
      }
    } catch (err) {
      console.error('Failed to load unconfirmed users:', err);
    }
    setResendLoading(false);
  }

  async function handleResendConfirmation(userId = null, resendAll = false) {
    setSendingTo(userId || 'all');
    setResendResult(null);
    try {
      const response = await fetch('/api/admin/resend-confirmations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail: user?.email, userId, resendAll })
      });
      const data = await response.json();
      if (data.error && !data.sent) {
        setResendResult({ error: data.error });
      } else {
        setResendResult({ success: true, sent: data.sent, failed: data.failed, errors: data.errors });
        loadUnconfirmedUsers();
      }
    } catch (err) {
      setResendResult({ error: err.message });
    }
    setSendingTo(null);
  }

  async function handleSendBroadcast() {
    if (!broadcastSubject.trim() || !broadcastBody.trim()) {
      alert('Please enter both subject and body');
      return;
    }

    const confirmMsg = includeAll
      ? `Send this email to ALL ${allUsersCount} users with email addresses? (F&F Mode)`
      : `Send this email to ${subscriberCount} opted-in subscribers?`;

    if (!confirm(confirmMsg)) return;

    setBroadcastSending(true);
    setBroadcastResult(null);

    try {
      const response = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: broadcastSubject,
          body: broadcastBody,
          adminEmail: user?.email,
          includeAll
        })
      });
      const data = await response.json();

      if (data.error) {
        setBroadcastResult({ error: data.error });
      } else {
        setBroadcastResult({ success: true, sent: data.sent, failed: data.failed });
        setBroadcastSubject('');
        setBroadcastBody('');
      }
    } catch (err) {
      setBroadcastResult({ error: err.message });
    }
    setBroadcastSending(false);
  }

  async function loadFeatureConfig() {
    setConfigLoading(true);
    try {
      const response = await fetch('/api/admin/config');
      const data = await response.json();
      if (data.config) setFeatureConfig(data.config);
    } catch (err) {
      console.error('Failed to load config:', err);
    }
    setConfigLoading(false);
  }

  async function saveFeatureConfig() {
    setConfigLoading(true);
    setConfigSaved(false);
    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail: user?.email, config: featureConfig })
      });
      const data = await response.json();
      if (data.success) {
        setConfigSaved(true);
        setTimeout(() => setConfigSaved(false), 2000);
      }
    } catch (err) {
      console.error('Failed to save config:', err);
    }
    setConfigLoading(false);
  }

  function toggleModelForAdmins(model) {
    setFeatureConfig(prev => {
      const current = prev.modelsForAdmins || [];
      if (current.includes(model)) {
        if (current.length === 1) return prev;
        return { ...prev, modelsForAdmins: current.filter(m => m !== model) };
      }
      return { ...prev, modelsForAdmins: [...current, model] };
    });
  }

  function toggleModelForUsers(model) {
    setFeatureConfig(prev => {
      const current = prev.modelsForUsers || [];
      if (current.includes(model)) {
        if (current.length === 1) return prev;
        return { ...prev, modelsForUsers: current.filter(m => m !== model) };
      }
      return { ...prev, modelsForUsers: [...current, model] };
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (!userIsAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-zinc-500 mb-4">Admin access required</div>
          <a href="/" className="text-amber-400 hover:text-amber-300">← Back to Reader</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">N</span>
            </div>
            <div>
              <h1 className="text-lg font-medium tracking-wide">Admin Console</h1>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>v{VERSION}</span>
                {isSuperAdmin && (
                  <span className="text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded text-[10px] font-medium">
                    SUPER ADMIN
                  </span>
                )}
              </div>
            </div>
          </div>
          <a
            href="/"
            className="flex items-center gap-2 text-zinc-400 hover:text-amber-400 text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Reader
          </a>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-zinc-800/50 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'users', label: 'Users & Stats', onClick: () => setActiveTab('users') },
              { id: 'testing', label: 'Testing', onClick: () => setActiveTab('testing') },
              { id: 'broadcast', label: 'Broadcast', onClick: () => { setActiveTab('broadcast'); loadSubscriberCount(); loadUnconfirmedUsers(); }},
              { id: 'config', label: 'Config', onClick: () => { setActiveTab('config'); loadFeatureConfig(); }},
            ].map(tab => (
              <button
                key={tab.id}
                onClick={tab.onClick}
                className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-amber-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-8">
            {/* Core Stats */}
            <section>
              <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-4 font-medium">Overview</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard value={totals.userCount || 0} label="Total Users" color="text-amber-400" size="large" highlight />
                <StatCard value={totals.totalReadings || 0} label="Readings" color="text-cyan-400" size="large" highlight />
                <StatCard value={`${((totals.totalTokens || 0) / 1000000).toFixed(2)}M`} label="Tokens Used" color="text-emerald-400" size="large" highlight />
                <StatCard value={`$${(totals.totalCost || 0).toFixed(2)}`} label="Estimated Cost" color="text-rose-400" size="large" highlight />
              </div>
            </section>

            {/* Engagement Stats */}
            <section>
              <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-4 font-medium">Engagement</h2>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                <StatCard value={totals.totalReflects || 0} label="Reflects" color="text-violet-400" />
                <StatCard value={totals.totalForges || 0} label="Forges" color="text-orange-400" />
                <StatCard value={totals.totalExpansions || 0} label="Expansions" color="text-teal-400" />
                <StatCard value={totals.totalDiscussions || 0} label="Hub Posts" color="text-blue-400" />
                <StatCard value={totals.totalReplies || 0} label="Replies" color="text-pink-400" />
              </div>
            </section>

            {/* Mode & Spread Stats */}
            <section className="grid sm:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-4 font-medium">Reading Modes</h2>
                <div className="grid grid-cols-4 gap-3">
                  <StatCard value={totals.modeCounts?.reflect || 0} label="Reflect" color="text-sky-400" />
                  <StatCard value={totals.modeCounts?.discover || 0} label="Discover" color="text-lime-400" />
                  <StatCard value={totals.modeCounts?.forge || 0} label="Forge" color="text-amber-400" />
                  <StatCard value={totals.modeCounts?.explore || 0} label="Explore" color="text-fuchsia-400" />
                </div>
              </div>
              <div>
                <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-4 font-medium">Spread Types</h2>
                <div className="grid grid-cols-4 gap-3">
                  <StatCard value={totals.spreadCounts?.single || 0} label="Single" />
                  <StatCard value={totals.spreadCounts?.triad || 0} label="Triad" />
                  <StatCard value={totals.spreadCounts?.pentad || 0} label="Pentad" />
                  <StatCard value={totals.spreadCounts?.septad || 0} label="Septad" />
                </div>
              </div>
            </section>

            {/* User List */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs text-zinc-500 uppercase tracking-wider font-medium">User Management</h2>
                <button
                  onClick={loadUsers}
                  disabled={usersLoading}
                  className="text-xs text-zinc-500 hover:text-amber-400 disabled:opacity-50 transition-colors"
                >
                  {usersLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              <div className="space-y-2">
                {users.map(u => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isSuperAdmin={isSuperAdmin}
                    editingLimit={editingLimit}
                    setEditingLimit={setEditingLimit}
                    limitValue={limitValue}
                    setLimitValue={setLimitValue}
                    onBanToggle={handleBanToggle}
                    onCommunityBanToggle={handleCommunityBanToggle}
                    onAdminToggle={handleAdminToggle}
                    onSetLimit={handleSetLimit}
                    onResetTokens={handleResetTokens}
                    onDelete={handleDeleteUser}
                    deletingId={deletingId}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* TESTING TAB */}
        {activeTab === 'testing' && (
          <div className="max-w-2xl space-y-8">
            {/* Mode Selection */}
            <section>
              <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-4 font-medium">Test Mode</h2>
              <div className="flex gap-2 flex-wrap">
                {[
                  { id: 'fullMonty', label: 'Full Monty', desc: `All features (v${VERSION})` },
                  { id: 'levelSim', label: 'Level Simulator', desc: 'Pick specific level' },
                  { id: 'firstContact', label: 'First Contact', desc: 'Level 0 experience' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`px-4 py-3 rounded-lg transition-all ${
                      mode === m.id
                        ? 'bg-amber-500 text-zinc-900'
                        : 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50'
                    }`}
                  >
                    <div className="font-medium">{m.label}</div>
                    <div className={`text-xs mt-0.5 ${mode === m.id ? 'text-zinc-700' : 'text-zinc-500'}`}>
                      {m.desc}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Level Selector */}
            {mode === 'levelSim' && (
              <section>
                <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-4 font-medium">Select Level</h2>
                <select
                  value={level}
                  onChange={(e) => setLevel(parseInt(e.target.value))}
                  className="w-full bg-zinc-800/50 text-zinc-100 px-4 py-3 rounded-lg border border-zinc-700/50 focus:border-amber-500 focus:outline-none"
                >
                  {LEVELS.map(l => (
                    <option key={l.value} value={l.value}>
                      {l.label} — {l.desc}
                    </option>
                  ))}
                </select>
              </section>
            )}

            {/* State Override */}
            <section>
              <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-4 font-medium">State Override</h2>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-zinc-400">Reading Count:</label>
                  <input
                    type="number"
                    value={readingCount}
                    onChange={(e) => setReadingCount(parseInt(e.target.value) || 0)}
                    className="w-24 bg-zinc-800/50 text-zinc-100 px-3 py-2 rounded-lg border border-zinc-700/50 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={resetProgress}
                  className="px-4 py-2 bg-red-900/50 hover:bg-red-800/50 text-red-300 rounded-lg text-sm transition-colors"
                >
                  Reset All Progress
                </button>
              </div>
            </section>

            {/* Debug Options */}
            <section>
              <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-4 font-medium">Debug</h2>
              <div className="flex gap-6 flex-wrap">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTokens}
                    onChange={(e) => setShowTokens(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-800 border-zinc-600 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-zinc-300">Show token counts</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrompt}
                    onChange={(e) => setShowPrompt(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-800 border-zinc-600 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-zinc-300">Show raw prompt</span>
                </label>
              </div>
            </section>

            {/* Summary & Launch */}
            <section className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
              <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-3 font-medium">Config Summary</h2>
              <div className="text-sm text-zinc-300 space-y-1 mb-4">
                <p><span className="text-zinc-500">Mode:</span> {mode === 'fullMonty' ? 'Full Monty (Level 16)' : mode === 'firstContact' ? 'First Contact (Level 0)' : `Level ${level}`}</p>
                <p><span className="text-zinc-500">Reading Count:</span> {readingCount}</p>
                <p><span className="text-zinc-500">Debug:</span> {[showTokens && 'Tokens', showPrompt && 'Prompt'].filter(Boolean).join(', ') || 'None'}</p>
              </div>
              <button
                onClick={launch}
                className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium transition-colors"
              >
                Open Reader with Config →
              </button>
            </section>
          </div>
        )}

        {/* BROADCAST TAB */}
        {activeTab === 'broadcast' && (
          <div className="space-y-8">
            {/* Subscriber Stats */}
            <section>
              <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-4 font-medium">Recipients</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setIncludeAll(false)}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    !includeAll
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-zinc-700/30 bg-zinc-800/30 hover:border-zinc-600/50'
                  }`}
                >
                  <div className="text-3xl font-light text-emerald-400 mb-1">{subscriberCount}</div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">Opted-in Subscribers</div>
                </button>
                <button
                  onClick={() => setIncludeAll(true)}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    includeAll
                      ? 'border-amber-500/50 bg-amber-500/10'
                      : 'border-zinc-700/30 bg-zinc-800/30 hover:border-zinc-600/50'
                  }`}
                >
                  <div className="text-3xl font-light text-amber-400 mb-1">{allUsersCount}</div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">All Users (F&F)</div>
                </button>
              </div>
              {includeAll && (
                <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
                  F&F Mode: Sending to all users regardless of opt-in status. Use sparingly.
                </div>
              )}
            </section>

            {/* Compose */}
            <section className="max-w-2xl">
              <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-4 font-medium">Compose</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  placeholder="Subject line..."
                  className="w-full bg-zinc-800/50 text-zinc-100 px-4 py-3 rounded-lg border border-zinc-700/50 focus:border-amber-500 focus:outline-none"
                />
                <textarea
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  placeholder="Message body... (supports **bold** and *italic*)"
                  rows={10}
                  className="w-full bg-zinc-800/50 text-zinc-100 px-4 py-3 rounded-lg border border-zinc-700/50 focus:border-amber-500 focus:outline-none font-mono text-sm"
                />

                {broadcastResult && (
                  <div className={`p-4 rounded-lg ${
                    broadcastResult.error
                      ? 'bg-red-900/30 border border-red-700/50 text-red-300'
                      : 'bg-emerald-900/30 border border-emerald-700/50 text-emerald-300'
                  }`}>
                    {broadcastResult.error
                      ? `Error: ${broadcastResult.error}`
                      : `Sent successfully! ${broadcastResult.sent} delivered, ${broadcastResult.failed} failed.`
                    }
                  </div>
                )}

                <button
                  onClick={handleSendBroadcast}
                  disabled={broadcastSending || (includeAll ? allUsersCount === 0 : subscriberCount === 0)}
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    broadcastSending || (includeAll ? allUsersCount === 0 : subscriberCount === 0)
                      ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                      : includeAll
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {broadcastSending
                    ? 'Sending...'
                    : `Send to ${includeAll ? allUsersCount : subscriberCount} ${includeAll ? 'Users' : 'Subscribers'}`
                  }
                </button>
              </div>
            </section>

            {/* Resend Confirmations */}
            <section className="border-t border-zinc-800/50 pt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Unconfirmed Users</h2>
                <button
                  onClick={loadUnconfirmedUsers}
                  disabled={resendLoading}
                  className="text-xs text-zinc-500 hover:text-amber-400 disabled:opacity-50 transition-colors"
                >
                  {resendLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              <div className="flex gap-3 mb-6">
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                  <div className="text-2xl font-light text-rose-400">{unconfirmedUsers.length}</div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">Unconfirmed</div>
                </div>
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <div className="text-2xl font-light text-emerald-400">{confirmedCount}</div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">Confirmed</div>
                </div>
              </div>

              {resendResult && (
                <div className={`mb-4 p-4 rounded-lg ${
                  resendResult.error
                    ? 'bg-red-900/30 border border-red-700/50 text-red-300'
                    : 'bg-emerald-900/30 border border-emerald-700/50 text-emerald-300'
                }`}>
                  {resendResult.error
                    ? `Error: ${resendResult.error}`
                    : `Sent ${resendResult.sent} confirmation(s), ${resendResult.failed} failed.`
                  }
                </div>
              )}

              {unconfirmedUsers.length > 0 ? (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      if (confirm(`Send to ALL ${unconfirmedUsers.length} unconfirmed users?`)) {
                        handleResendConfirmation(null, true);
                      }
                    }}
                    disabled={sendingTo !== null}
                    className={`mb-4 px-4 py-2 rounded-lg text-sm transition-colors ${
                      sendingTo !== null
                        ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                  >
                    {sendingTo === 'all' ? 'Sending...' : `Resend to All ${unconfirmedUsers.length}`}
                  </button>

                  {unconfirmedUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between gap-4 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                      <div className="min-w-0">
                        <div className="text-sm text-zinc-300 truncate">{u.email}</div>
                        <div className="text-xs text-zinc-600 flex gap-2">
                          <span>{new Date(u.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{u.provider}</span>
                          {u.confirmation_resent_at && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-500">Resent {new Date(u.confirmation_resent_at).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleResendConfirmation(u.id, false)}
                        disabled={sendingTo !== null}
                        className={`px-3 py-1.5 text-xs rounded transition-colors ${
                          sendingTo !== null
                            ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                            : 'bg-violet-600 hover:bg-violet-500 text-white'
                        }`}
                      >
                        {sendingTo === u.id ? 'Sending...' : 'Resend'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  {resendLoading ? 'Loading...' : 'All users confirmed!'}
                </div>
              )}
            </section>
          </div>
        )}

        {/* CONFIG TAB */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            {/* Config Sub-nav */}
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'access', label: 'Access & Models', icon: '🔐' },
                { id: 'voice', label: 'Voice Defaults', icon: '🎙' },
                { id: 'reading', label: 'Reading Defaults', icon: '🃏' },
                { id: 'background', label: 'Background', icon: '🎨' },
              ].map(section => (
                <button
                  key={section.id}
                  onClick={() => setConfigSection(section.id)}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    configSection === section.id
                      ? 'bg-amber-500 text-zinc-900 font-medium'
                      : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50'
                  }`}
                >
                  <span className="mr-2">{section.icon}</span>
                  {section.label}
                </button>
              ))}
            </div>

            {/* ACCESS & MODELS SECTION */}
            {configSection === 'access' && (
              <div className="max-w-2xl space-y-6">
                {/* Advanced Voice Visibility */}
                <section className="p-6 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                  <h3 className="text-sm font-medium text-amber-400 mb-2">Advanced Voice Settings Visibility</h3>
                  <p className="text-xs text-zinc-500 mb-4">Control who can see fine-tune voice sliders</p>
                  <div className="flex gap-2">
                    {['admins', 'everyone'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setFeatureConfig(prev => ({ ...prev, advancedVoiceFor: opt }))}
                        className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
                          featureConfig.advancedVoiceFor === opt
                            ? 'bg-amber-500 text-zinc-900'
                            : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-600/50'
                        }`}
                      >
                        {opt === 'admins' ? 'Admins Only' : 'Everyone'}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Models for Admins */}
                <section className="p-6 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                  <h3 className="text-sm font-medium text-violet-400 mb-2">Models for Admins</h3>
                  <p className="text-xs text-zinc-500 mb-4">Which models can admins select?</p>
                  <div className="flex gap-2 mb-4">
                    {['haiku', 'sonnet', 'opus'].map(model => (
                      <button
                        key={model}
                        onClick={() => toggleModelForAdmins(model)}
                        className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
                          featureConfig.modelsForAdmins?.includes(model)
                            ? 'bg-violet-500 text-white'
                            : 'bg-zinc-700/50 text-zinc-500 hover:bg-zinc-600/50'
                        }`}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-500">Default:</span>
                    <select
                      value={featureConfig.defaultModelAdmin}
                      onChange={(e) => setFeatureConfig(prev => ({ ...prev, defaultModelAdmin: e.target.value }))}
                      className="bg-zinc-700/50 border-none rounded px-2 py-1 text-zinc-300"
                    >
                      {featureConfig.modelsForAdmins?.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </section>

                {/* Models for Users */}
                <section className="p-6 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                  <h3 className="text-sm font-medium text-cyan-400 mb-2">Models for Users</h3>
                  <p className="text-xs text-zinc-500 mb-4">Which models can regular users select?</p>
                  <div className="flex gap-2 mb-4">
                    {['haiku', 'sonnet', 'opus'].map(model => (
                      <button
                        key={model}
                        onClick={() => toggleModelForUsers(model)}
                        className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
                          featureConfig.modelsForUsers?.includes(model)
                            ? 'bg-cyan-500 text-white'
                            : 'bg-zinc-700/50 text-zinc-500 hover:bg-zinc-600/50'
                        }`}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-500">Default:</span>
                    <select
                      value={featureConfig.defaultModelUser}
                      onChange={(e) => setFeatureConfig(prev => ({ ...prev, defaultModelUser: e.target.value }))}
                      className="bg-zinc-700/50 border-none rounded px-2 py-1 text-zinc-300"
                    >
                      {featureConfig.modelsForUsers?.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </section>

                {/* Cost Reference */}
                <section className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                  <div className="text-xs text-zinc-500 mb-3">Cost Reference (per 1M tokens)</div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-emerald-400 font-medium">Haiku</span>
                      <div className="text-xs text-zinc-500">$1 in / $5 out</div>
                    </div>
                    <div>
                      <span className="text-cyan-400 font-medium">Sonnet</span>
                      <div className="text-xs text-zinc-500">$3 in / $15 out</div>
                    </div>
                    <div>
                      <span className="text-violet-400 font-medium">Opus</span>
                      <div className="text-xs text-zinc-500">$15 in / $75 out</div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* VOICE DEFAULTS SECTION */}
            {configSection === 'voice' && (
              <div className="max-w-2xl space-y-6">
                {/* Persona */}
                <section className="p-6 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                  <h3 className="text-sm font-medium text-violet-400 mb-2">Who reads this to you?</h3>
                  <p className="text-xs text-zinc-500 mb-4">Default persona for the reader's voice</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'none', label: 'None' },
                      { id: 'friend', label: 'Friend' },
                      { id: 'therapist', label: 'Therapist' },
                      { id: 'spiritualist', label: 'Spiritualist' },
                      { id: 'scientist', label: 'Scientist' },
                      { id: 'coach', label: 'Coach' },
                    ].map(persona => (
                      <button
                        key={persona.id}
                        onClick={() => setFeatureConfig(prev => ({
                          ...prev,
                          defaultVoice: { ...prev.defaultVoice, persona: persona.id }
                        }))}
                        className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                          featureConfig.defaultVoice?.persona === persona.id
                            ? 'bg-violet-600 text-white'
                            : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        {persona.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-600 mt-3 text-center italic">
                    {featureConfig.defaultVoice?.persona === 'friend' && 'Warm, direct, like your best friend'}
                    {featureConfig.defaultVoice?.persona === 'therapist' && 'Reflective, supportive, holding space'}
                    {featureConfig.defaultVoice?.persona === 'spiritualist' && 'Mystical, connected, transcendent'}
                    {featureConfig.defaultVoice?.persona === 'scientist' && 'Analytical, precise, evidence-based'}
                    {featureConfig.defaultVoice?.persona === 'coach' && 'Motivating, action-oriented, empowering'}
                    {featureConfig.defaultVoice?.persona === 'none' && 'Neutral voice, no persona'}
                  </p>
                </section>

                {/* Main Voice Sliders */}
                <section className="p-6 bg-zinc-800/30 rounded-lg border border-zinc-700/30 space-y-5">
                  <div>
                    <h3 className="text-sm font-medium text-amber-400 mb-1">Fine-Tune Voice</h3>
                    <p className="text-xs text-zinc-500">Main voice control sliders</p>
                  </div>

                  {/* Humor */}
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-zinc-300 font-medium">Humor</span>
                      <span className="text-amber-400">
                        {(featureConfig.defaultVoice?.humor || 50) < 30 ? 'Unhinged' :
                         (featureConfig.defaultVoice?.humor || 50) > 70 ? 'Sacred' : 'Balanced'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-zinc-500 w-16">Unhinged</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={featureConfig.defaultVoice?.humor || 50}
                        onChange={(e) => setFeatureConfig(prev => ({
                          ...prev,
                          defaultVoice: { ...prev.defaultVoice, humor: parseInt(e.target.value) }
                        }))}
                        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-amber-500 via-zinc-600 to-zinc-400"
                      />
                      <span className="text-[10px] text-zinc-500 w-16 text-right">Sacred</span>
                    </div>
                  </div>

                  {/* Register */}
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-zinc-300 font-medium">Register</span>
                      <span className="text-amber-400">
                        {(featureConfig.defaultVoice?.register || 50) < 30 ? 'Chaos' :
                         (featureConfig.defaultVoice?.register || 50) > 70 ? 'Oracle' : 'Polished'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-zinc-500 w-16">Chaos</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={featureConfig.defaultVoice?.register || 50}
                        onChange={(e) => setFeatureConfig(prev => ({
                          ...prev,
                          defaultVoice: { ...prev.defaultVoice, register: parseInt(e.target.value) }
                        }))}
                        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-amber-500 via-zinc-600 to-zinc-400"
                      />
                      <span className="text-[10px] text-zinc-500 w-16 text-right">Oracle</span>
                    </div>
                  </div>

                  {/* Agency */}
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-amber-400 font-medium">Agency</span>
                      <span className="text-amber-400">
                        {(featureConfig.defaultVoice?.agency || 50) < 30 ? 'Witness' :
                         (featureConfig.defaultVoice?.agency || 50) > 70 ? 'Creator' : 'Receptive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-zinc-500 w-16">Witness</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={featureConfig.defaultVoice?.agency || 50}
                        onChange={(e) => setFeatureConfig(prev => ({
                          ...prev,
                          defaultVoice: { ...prev.defaultVoice, agency: parseInt(e.target.value) }
                        }))}
                        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-amber-500 via-zinc-600 to-zinc-400"
                      />
                      <span className="text-[10px] text-zinc-500 w-16 text-right">Creator</span>
                    </div>
                    <p className="text-[10px] text-zinc-600 text-center mt-1">Balanced observation and agency</p>
                  </div>
                </section>

                {/* Special Modes */}
                <section className="p-6 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                  <h3 className="text-sm font-medium text-rose-400 mb-4">Special Modes</h3>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={featureConfig.defaultVoice?.roastMode || false}
                        onChange={(e) => setFeatureConfig(prev => ({
                          ...prev,
                          defaultVoice: { ...prev.defaultVoice, roastMode: e.target.checked }
                        }))}
                        className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-rose-500 focus:ring-rose-500"
                      />
                      <div>
                        <span className="text-zinc-300 font-medium">Roast Mode</span>
                        <span className="text-zinc-600 text-xs ml-2">(savage)</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={featureConfig.defaultVoice?.directMode || false}
                        onChange={(e) => setFeatureConfig(prev => ({
                          ...prev,
                          defaultVoice: { ...prev.defaultVoice, directMode: e.target.checked }
                        }))}
                        className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-violet-500 focus:ring-violet-500"
                      />
                      <div>
                        <span className="text-zinc-300 font-medium">Direct Mode</span>
                        <span className="text-zinc-600 text-xs ml-2">(unfiltered)</span>
                      </div>
                    </label>
                  </div>
                </section>

                {/* Advanced Voice Settings - Collapsible */}
                <details className="group">
                  <summary className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/30 cursor-pointer text-sm text-zinc-400 hover:text-zinc-300 list-none flex items-center justify-between">
                    <span>Advanced Voice Settings</span>
                    <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-2 p-6 bg-zinc-800/30 rounded-lg border border-zinc-700/30 space-y-5">
                    {/* Reading Voice Preset */}
                    <div>
                      <div className="text-xs text-zinc-400 mb-2">Reading Voice</div>
                      <div className="flex gap-1 p-1 bg-zinc-900/50 rounded-lg">
                        {['clear', 'kind', 'playful', 'wise', 'oracle'].map(preset => (
                          <button
                            key={preset}
                            onClick={() => setFeatureConfig(prev => ({
                              ...prev,
                              defaultVoice: { ...prev.defaultVoice, preset }
                            }))}
                            className={`flex-1 py-2 px-2 rounded-md text-xs font-medium capitalize transition-all ${
                              featureConfig.defaultVoice?.preset === preset
                                ? 'bg-violet-600 text-white'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Complexity - "Speak to me like..." */}
                    <div>
                      <div className="text-xs text-zinc-400 mb-2">Speak to me like...</div>
                      <div className="grid grid-cols-5 gap-1">
                        {['friend', 'guide', 'teacher', 'mentor', 'master'].map(level => (
                          <button
                            key={level}
                            onClick={() => setFeatureConfig(prev => ({
                              ...prev,
                              defaultVoice: { ...prev.defaultVoice, complexity: level }
                            }))}
                            className={`py-2 px-2 rounded text-xs capitalize transition-all ${
                              featureConfig.defaultVoice?.complexity === level
                                ? 'bg-rose-500/30 text-rose-400 border border-rose-500/50'
                                : 'bg-zinc-700/30 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700/50'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Seriousness (Tone) */}
                    <div>
                      <div className="text-xs text-zinc-400 mb-2">Tone</div>
                      <div className="grid grid-cols-5 gap-1">
                        {['playful', 'light', 'balanced', 'earnest', 'grave'].map(tone => (
                          <button
                            key={tone}
                            onClick={() => setFeatureConfig(prev => ({
                              ...prev,
                              defaultVoice: { ...prev.defaultVoice, seriousness: tone }
                            }))}
                            className={`py-2 px-2 rounded text-xs capitalize transition-all ${
                              featureConfig.defaultVoice?.seriousness === tone
                                ? 'bg-amber-500/30 text-amber-400 border border-amber-500/50'
                                : 'bg-zinc-700/30 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700/50'
                            }`}
                          >
                            {tone}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Voice */}
                    <div>
                      <div className="text-xs text-zinc-400 mb-2">Voice</div>
                      <div className="grid grid-cols-4 gap-1">
                        {['wonder', 'warm', 'direct', 'grounded'].map(v => (
                          <button
                            key={v}
                            onClick={() => setFeatureConfig(prev => ({
                              ...prev,
                              defaultVoice: { ...prev.defaultVoice, voice: v }
                            }))}
                            className={`py-2 px-3 rounded text-xs capitalize transition-all ${
                              featureConfig.defaultVoice?.voice === v
                                ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500/50'
                                : 'bg-zinc-700/30 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700/50'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Focus */}
                    <div>
                      <div className="text-xs text-zinc-400 mb-2">Focus</div>
                      <div className="grid grid-cols-4 gap-1">
                        {['do', 'feel', 'see', 'build'].map(f => (
                          <button
                            key={f}
                            onClick={() => setFeatureConfig(prev => ({
                              ...prev,
                              defaultVoice: { ...prev.defaultVoice, focus: f }
                            }))}
                            className={`py-2 px-3 rounded text-xs capitalize transition-all ${
                              featureConfig.defaultVoice?.focus === f
                                ? 'bg-emerald-500/30 text-emerald-400 border border-emerald-500/50'
                                : 'bg-zinc-700/30 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700/50'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Density */}
                    <div>
                      <div className="text-xs text-zinc-400 mb-2">Density</div>
                      <div className="grid grid-cols-4 gap-1">
                        {['luminous', 'rich', 'clear', 'essential'].map(d => (
                          <button
                            key={d}
                            onClick={() => setFeatureConfig(prev => ({
                              ...prev,
                              defaultVoice: { ...prev.defaultVoice, density: d }
                            }))}
                            className={`py-2 px-3 rounded text-xs capitalize transition-all ${
                              featureConfig.defaultVoice?.density === d
                                ? 'bg-violet-500/30 text-violet-400 border border-violet-500/50'
                                : 'bg-zinc-700/30 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700/50'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Scope */}
                    <div>
                      <div className="text-xs text-zinc-400 mb-2">Scope</div>
                      <div className="grid grid-cols-4 gap-1">
                        {['resonant', 'patterned', 'connected', 'here'].map(s => (
                          <button
                            key={s}
                            onClick={() => setFeatureConfig(prev => ({
                              ...prev,
                              defaultVoice: { ...prev.defaultVoice, scope: s }
                            }))}
                            className={`py-2 px-3 rounded text-xs capitalize transition-all ${
                              featureConfig.defaultVoice?.scope === s
                                ? 'bg-pink-500/30 text-pink-400 border border-pink-500/50'
                                : 'bg-zinc-700/30 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700/50'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            )}

            {/* READING DEFAULTS SECTION */}
            {configSection === 'reading' && (
              <div className="max-w-2xl space-y-6">
                {/* Default Mode */}
                <section className="p-6 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                  <h3 className="text-sm font-medium text-sky-400 mb-2">Default Reading Mode</h3>
                  <p className="text-xs text-zinc-500 mb-4">Which mode is selected when users first arrive</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'reflect', label: 'Reflect', desc: 'Mirror what exists', color: 'sky' },
                      { id: 'discover', label: 'Discover', desc: 'Find authorship', color: 'lime' },
                      { id: 'forge', label: 'Forge', desc: 'Set intention', color: 'amber' },
                      { id: 'explore', label: 'Explore', desc: 'Threaded inquiry', color: 'fuchsia' },
                    ].map(m => (
                      <button
                        key={m.id}
                        onClick={() => setFeatureConfig(prev => ({ ...prev, defaultMode: m.id }))}
                        className={`p-3 rounded-lg text-left transition-all ${
                          featureConfig.defaultMode === m.id
                            ? `bg-${m.color}-500/20 border-2 border-${m.color}-500/50`
                            : 'bg-zinc-700/30 border border-zinc-700/50 hover:bg-zinc-700/50'
                        }`}
                      >
                        <div className={`text-sm font-medium ${
                          featureConfig.defaultMode === m.id ? `text-${m.color}-400` : 'text-zinc-300'
                        }`}>{m.label}</div>
                        <div className="text-[10px] text-zinc-500">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Default Spread */}
                <section className="p-6 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                  <h3 className="text-sm font-medium text-emerald-400 mb-2">Default Spread Size</h3>
                  <p className="text-xs text-zinc-500 mb-4">How many cards to draw by default</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'single', label: 'Single', desc: '1 card', cards: 1 },
                      { id: 'triad', label: 'Triad', desc: '3 cards', cards: 3 },
                      { id: 'pentad', label: 'Pentad', desc: '5 cards', cards: 5 },
                      { id: 'septad', label: 'Septad', desc: '7 cards', cards: 7 },
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => setFeatureConfig(prev => ({ ...prev, defaultSpread: s.id }))}
                        className={`p-3 rounded-lg text-left transition-all ${
                          featureConfig.defaultSpread === s.id
                            ? 'bg-emerald-500/20 border-2 border-emerald-500/50'
                            : 'bg-zinc-700/30 border border-zinc-700/50 hover:bg-zinc-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`text-sm font-medium ${
                            featureConfig.defaultSpread === s.id ? 'text-emerald-400' : 'text-zinc-300'
                          }`}>{s.label}</div>
                          <div className="flex gap-0.5">
                            {Array.from({ length: s.cards }).map((_, i) => (
                              <div key={i} className={`w-1.5 h-2.5 rounded-sm ${
                                featureConfig.defaultSpread === s.id ? 'bg-emerald-500/50' : 'bg-zinc-600'
                              }`} />
                            ))}
                          </div>
                        </div>
                        <div className="text-[10px] text-zinc-500">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* BACKGROUND DEFAULTS SECTION */}
            {configSection === 'background' && (
              <div className="max-w-2xl space-y-6">
                {/* Background Type */}
                <section className="p-6 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                  <h3 className="text-sm font-medium text-fuchsia-400 mb-2">Default Background Type</h3>
                  <p className="text-xs text-zinc-500 mb-4">What users see behind the reader</p>
                  <div className="flex gap-2">
                    {[
                      { id: 'video', label: 'Video', desc: 'Ambient motion' },
                      { id: 'image', label: 'Image', desc: 'Static background' },
                      { id: 'solid', label: 'Solid', desc: 'Dark gradient' },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setFeatureConfig(prev => ({
                          ...prev,
                          defaultBackground: { ...prev.defaultBackground, type: t.id }
                        }))}
                        className={`flex-1 p-3 rounded-lg text-center transition-all ${
                          featureConfig.defaultBackground?.type === t.id
                            ? 'bg-fuchsia-500/20 border-2 border-fuchsia-500/50'
                            : 'bg-zinc-700/30 border border-zinc-700/50 hover:bg-zinc-700/50'
                        }`}
                      >
                        <div className={`text-sm font-medium ${
                          featureConfig.defaultBackground?.type === t.id ? 'text-fuchsia-400' : 'text-zinc-300'
                        }`}>{t.label}</div>
                        <div className="text-[10px] text-zinc-500">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Background Video Selection */}
                {featureConfig.defaultBackground?.type === 'video' && (
                  <section className="p-6 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                    <h3 className="text-sm font-medium text-violet-400 mb-2">Default Video</h3>
                    <p className="text-xs text-zinc-500 mb-4">Which ambient video plays by default</p>
                    <select
                      value={featureConfig.defaultBackground?.videoId || 'default'}
                      onChange={(e) => setFeatureConfig(prev => ({
                        ...prev,
                        defaultBackground: { ...prev.defaultBackground, videoId: e.target.value }
                      }))}
                      className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-4 py-3 text-zinc-300"
                    >
                      <option value="default">Default (Cosmos)</option>
                      <option value="aurora">Aurora</option>
                      <option value="ocean">Ocean</option>
                      <option value="forest">Forest</option>
                      <option value="fire">Fire</option>
                      <option value="clouds">Clouds</option>
                    </select>
                  </section>
                )}

                {/* Opacity & Dim Sliders */}
                <section className="p-6 bg-zinc-800/30 rounded-lg border border-zinc-700/30 space-y-5">
                  <div>
                    <h3 className="text-sm font-medium text-orange-400 mb-1">Visual Settings</h3>
                    <p className="text-xs text-zinc-500">Background opacity and content dimming</p>
                  </div>

                  {/* Background Opacity */}
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-zinc-400">Background Opacity</span>
                      <span className="text-zinc-500">{Math.round((featureConfig.defaultBackground?.opacity || 0.4) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={(featureConfig.defaultBackground?.opacity || 0.4) * 100}
                      onChange={(e) => setFeatureConfig(prev => ({
                        ...prev,
                        defaultBackground: { ...prev.defaultBackground, opacity: parseInt(e.target.value) / 100 }
                      }))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-zinc-800 to-zinc-500"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                      <span>Subtle</span>
                      <span>Visible</span>
                    </div>
                  </div>

                  {/* Content Dim */}
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-zinc-400">Content Dimming</span>
                      <span className="text-zinc-500">{Math.round((featureConfig.defaultBackground?.dimContent || 0.3) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={(featureConfig.defaultBackground?.dimContent || 0.3) * 100}
                      onChange={(e) => setFeatureConfig(prev => ({
                        ...prev,
                        defaultBackground: { ...prev.defaultBackground, dimContent: parseInt(e.target.value) / 100 }
                      }))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-zinc-800 to-zinc-500"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                      <span>No dim</span>
                      <span>Heavy dim</span>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* Save Button (always visible) */}
            <div className="max-w-2xl flex items-center gap-4 pt-4 border-t border-zinc-800/50">
              <button
                onClick={saveFeatureConfig}
                disabled={configLoading}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  configLoading
                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-zinc-900'
                }`}
              >
                {configLoading ? 'Saving...' : 'Save All Configuration'}
              </button>
              {configSaved && (
                <span className="text-emerald-400 text-sm flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
              <p className="text-xs text-zinc-600 ml-auto">
                Changes apply to new users and reset sessions
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
