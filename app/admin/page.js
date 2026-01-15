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

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (!userIsAdmin) {
    return (
      <div className="min-h-screen bg-zinc-900 text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-zinc-500 mb-4">Admin access required</div>
          <a href="/" className="text-amber-400 hover:text-amber-300">← Back to Reader</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 p-8">
      <h1 className="text-2xl font-light tracking-widest mb-2">NIRMANAKAYA ADMIN</h1>
      <p className="text-zinc-500 text-sm mb-6">v{VERSION} {isSuperAdmin && <span className="text-amber-400 ml-2">Super Admin</span>}</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-t transition-all ${activeTab === 'users' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          Users & Stats
        </button>
        <button
          onClick={() => setActiveTab('testing')}
          className={`px-4 py-2 rounded-t transition-all ${activeTab === 'testing' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          Testing
        </button>
      </div>

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div>
          {/* Stats Cards - Row 1: Core */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <div className="text-2xl font-light text-amber-400">{totals.userCount || 0}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Users</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <div className="text-2xl font-light text-cyan-400">{totals.totalReadings || 0}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Readings</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <div className="text-2xl font-light text-emerald-400">{((totals.totalTokens || 0) / 1000000).toFixed(2)}M</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Tokens</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <div className="text-2xl font-light text-rose-400">${(totals.totalCost || 0).toFixed(2)}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Est. Cost</div>
            </div>
          </div>

          {/* Stats Cards - Row 2: Engagement */}
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-4">
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
              <div className="text-xl font-light text-violet-400">{totals.totalReflects || 0}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Reflects</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
              <div className="text-xl font-light text-orange-400">{totals.totalForges || 0}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Forges</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
              <div className="text-xl font-light text-teal-400">{totals.totalExpansions || 0}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Expansions</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
              <div className="text-xl font-light text-blue-400">{totals.totalDiscussions || 0}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Posts</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
              <div className="text-xl font-light text-pink-400">{totals.totalReplies || 0}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Replies</div>
            </div>
          </div>

          {/* Stats Cards - Row 3: Reading Modes */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
              <div className="text-xl font-light text-sky-400">{totals.modeCounts?.reflect || 0}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Reflect Mode</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
              <div className="text-xl font-light text-lime-400">{totals.modeCounts?.discover || 0}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Discover Mode</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
              <div className="text-xl font-light text-amber-400">{totals.modeCounts?.forge || 0}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Forge Mode</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
              <div className="text-xl font-light text-fuchsia-400">{totals.modeCounts?.explore || 0}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Explore Mode</div>
            </div>
          </div>

          {/* Stats Cards - Row 4: Spread Types */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
              <div className="text-xl font-light text-zinc-300">{totals.spreadCounts?.single || 0}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Single</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
              <div className="text-xl font-light text-zinc-300">{totals.spreadCounts?.triad || 0}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Triad</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
              <div className="text-xl font-light text-zinc-300">{totals.spreadCounts?.pentad || 0}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Pentad</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
              <div className="text-xl font-light text-zinc-300">{totals.spreadCounts?.septad || 0}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Septad</div>
            </div>
          </div>

          {/* User List */}
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-sm text-zinc-500 uppercase tracking-wide">User Management</h2>
            <button
              onClick={loadUsers}
              disabled={usersLoading}
              className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
            >
              {usersLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {/* User Info */}
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{u.display_name || 'Anonymous'}</span>
                      {u.is_admin && <span className="text-xs bg-amber-600/20 text-amber-400 px-2 py-0.5 rounded">Admin</span>}
                      {u.is_banned && <span className="text-xs bg-rose-600/20 text-rose-400 px-2 py-0.5 rounded">Banned</span>}
                      {u.community_banned && <span className="text-xs bg-orange-600/20 text-orange-400 px-2 py-0.5 rounded">Hub Banned</span>}
                    </div>
                    <div className="text-xs text-zinc-500">{u.id}</div>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex gap-4">
                      <div>
                        <div className="text-zinc-400">{u.readingCount}</div>
                        <div className="text-xs text-zinc-600">readings</div>
                      </div>
                      <div>
                        <div className="text-zinc-400">{(u.totalTokens / 1000).toFixed(0)}k</div>
                        <div className="text-xs text-zinc-600">tokens</div>
                      </div>
                      <div>
                        <div className="text-zinc-400">${u.totalCost?.toFixed(2) || '0.00'}</div>
                        <div className="text-xs text-zinc-600">cost</div>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <div className="text-violet-400">{u.totalReflects || 0}</div>
                        <div className="text-xs text-zinc-600">reflects</div>
                      </div>
                      <div>
                        <div className="text-orange-400">{u.totalForges || 0}</div>
                        <div className="text-xs text-zinc-600">forges</div>
                      </div>
                      <div>
                        <div className="text-teal-400">{(u.totalClarifies || 0) + (u.totalUnpacks || 0) + (u.totalExamples || 0)}</div>
                        <div className="text-xs text-zinc-600">expand</div>
                      </div>
                      <div>
                        <div className="text-cyan-400 capitalize">{u.maxDepthReached || 'surface'}</div>
                        <div className="text-xs text-zinc-600">depth</div>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <div className="text-blue-400">{u.discussionCount || 0}</div>
                        <div className="text-xs text-zinc-600">posts</div>
                      </div>
                      <div>
                        <div className="text-pink-400">{u.replyCount || 0}</div>
                        <div className="text-xs text-zinc-600">replies</div>
                      </div>
                    </div>
                    {/* Mode breakdown */}
                    <div className="flex gap-2 text-xs">
                      <span className="text-sky-400" title="Reflect mode">{u.modes?.reflect || 0}R</span>
                      <span className="text-lime-400" title="Discover mode">{u.modes?.discover || 0}D</span>
                      <span className="text-amber-400" title="Forge mode">{u.modes?.forge || 0}F</span>
                      <span className="text-fuchsia-400" title="Explore mode">{u.modes?.explore || 0}E</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {/* Daily Limit */}
                    {editingLimit === u.id ? (
                      <div className="flex gap-1">
                        <input
                          type="number"
                          value={limitValue}
                          onChange={(e) => setLimitValue(e.target.value)}
                          placeholder="∞"
                          className="w-20 px-2 py-1 text-xs bg-zinc-700 rounded border border-zinc-600 focus:outline-none focus:border-amber-600"
                        />
                        <button
                          onClick={() => handleSetLimit(u.id)}
                          className="px-2 py-1 text-xs bg-emerald-700 hover:bg-emerald-600 rounded"
                        >
                          Set
                        </button>
                        <button
                          onClick={() => { setEditingLimit(null); setLimitValue(''); }}
                          className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingLimit(u.id); setLimitValue(u.daily_token_limit?.toString() || ''); }}
                        className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded"
                        title="Set daily token limit"
                      >
                        Limit: {u.daily_token_limit ?? '∞'}
                      </button>
                    )}

                    <button
                      onClick={() => handleResetTokens(u.id)}
                      className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded"
                      title="Reset today's token count"
                    >
                      Reset Daily
                    </button>

                    <button
                      onClick={() => handleCommunityBanToggle(u.id, u.community_banned)}
                      className={`px-2 py-1 text-xs rounded ${u.community_banned ? 'bg-orange-700 hover:bg-orange-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                    >
                      {u.community_banned ? 'Unban Hub' : 'Ban Hub'}
                    </button>

                    <button
                      onClick={() => handleBanToggle(u.id, u.is_banned)}
                      className={`px-2 py-1 text-xs rounded ${u.is_banned ? 'bg-rose-700 hover:bg-rose-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                    >
                      {u.is_banned ? 'Unban' : 'Ban'}
                    </button>

                    {isSuperAdmin && (
                      <button
                        onClick={() => handleAdminToggle(u.id, u.is_admin)}
                        className={`px-2 py-1 text-xs rounded ${u.is_admin ? 'bg-amber-700 hover:bg-amber-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                      >
                        {u.is_admin ? 'Remove Admin' : 'Make Admin'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TESTING TAB */}
      {activeTab === 'testing' && (
        <div>
          {/* Mode Selection */}
          <div className="mb-8">
            <h2 className="text-sm text-zinc-500 uppercase tracking-wide mb-3">Mode</h2>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setMode('fullMonty')}
                className={`px-4 py-2 rounded transition-all ${mode === 'fullMonty' ? 'bg-amber-600 text-zinc-900' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
              >
                Full Monty
              </button>
              <button
                onClick={() => setMode('levelSim')}
                className={`px-4 py-2 rounded transition-all ${mode === 'levelSim' ? 'bg-amber-600 text-zinc-900' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
              >
                Level Simulator
              </button>
              <button
                onClick={() => setMode('firstContact')}
                className={`px-4 py-2 rounded transition-all ${mode === 'firstContact' ? 'bg-amber-600 text-zinc-900' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
              >
                First Contact
              </button>
            </div>
            <p className="text-xs text-zinc-600 mt-2">
              {mode === 'fullMonty' && `All features enabled (current v${VERSION} experience)`}
              {mode === 'levelSim' && 'Pick a level to see that experience'}
              {mode === 'firstContact' && 'Force Level 0 experience (simplified UI, plain English)'}
            </p>
          </div>

          {/* Level Selector (only if levelSim) */}
          {mode === 'levelSim' && (
            <div className="mb-8">
              <h2 className="text-sm text-zinc-500 uppercase tracking-wide mb-3">Select Level</h2>
              <select
                value={level}
                onChange={(e) => setLevel(parseInt(e.target.value))}
                className="bg-zinc-800 text-zinc-100 px-4 py-2 rounded w-full max-w-md border border-zinc-700 focus:border-amber-600 focus:outline-none"
              >
                {LEVELS.map(l => (
                  <option key={l.value} value={l.value}>
                    {l.label} — {l.desc}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* State Override */}
          <div className="mb-8">
            <h2 className="text-sm text-zinc-500 uppercase tracking-wide mb-3">State Override</h2>
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm text-zinc-400">Reading Count:</label>
                <input
                  type="number"
                  value={readingCount}
                  onChange={(e) => setReadingCount(parseInt(e.target.value) || 0)}
                  className="bg-zinc-800 text-zinc-100 px-3 py-1 rounded w-24 border border-zinc-700 focus:border-amber-600 focus:outline-none"
                />
              </div>
              <button
                onClick={resetProgress}
                className="px-4 py-2 bg-red-900 hover:bg-red-800 rounded text-sm transition-all"
              >
                Reset All Progress
              </button>
            </div>
          </div>

          {/* Debug Options */}
          <div className="mb-8">
            <h2 className="text-sm text-zinc-500 uppercase tracking-wide mb-3">Debug</h2>
            <div className="flex gap-6 flex-wrap">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTokens}
                  onChange={(e) => setShowTokens(e.target.checked)}
                  className="rounded bg-zinc-800 border-zinc-600 text-amber-500 focus:ring-amber-500"
                />
                Show token counts
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrompt}
                  onChange={(e) => setShowPrompt(e.target.checked)}
                  className="rounded bg-zinc-800 border-zinc-600 text-amber-500 focus:ring-amber-500"
                />
                Show raw prompt
              </label>
            </div>
          </div>

          {/* Config Summary */}
          <div className="mb-8 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
            <h2 className="text-sm text-zinc-500 uppercase tracking-wide mb-2">Config Summary</h2>
            <div className="text-sm text-zinc-300 space-y-1">
              <p><span className="text-zinc-500">Mode:</span> {mode === 'fullMonty' ? 'Full Monty (Level 16)' : mode === 'firstContact' ? 'First Contact (Level 0)' : `Level ${level}`}</p>
              <p><span className="text-zinc-500">Reading Count:</span> {readingCount}</p>
              <p><span className="text-zinc-500">Show Tokens:</span> {showTokens ? 'Yes' : 'No'}</p>
              <p><span className="text-zinc-500">Show Prompt:</span> {showPrompt ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {/* Launch */}
          <button
            onClick={launch}
            className="px-6 py-3 bg-green-700 hover:bg-green-600 rounded text-lg transition-all"
          >
            Open Reader with Config →
          </button>
        </div>
      )}

      {/* Back Link */}
      <div className="mt-8">
        <a href="/" className="text-zinc-500 hover:text-zinc-300 text-sm">← Back to Reader</a>
      </div>
    </div>
  );
}
