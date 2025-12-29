'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPanel() {
  const router = useRouter();
  const [mode, setMode] = useState('fullMonty');
  const [level, setLevel] = useState(0);
  const [readingCount, setReadingCount] = useState(0);
  const [showTokens, setShowTokens] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);

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

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 p-8">
      <h1 className="text-2xl font-light tracking-widest mb-2">NIRMANAKAYA ADMIN PANEL</h1>
      <p className="text-zinc-500 text-sm mb-8">Test any feature configuration without earning it through the unlock system.</p>

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
          {mode === 'fullMonty' && 'All features enabled (current v0.39.5 experience)'}
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

      {/* Back Link */}
      <div className="mt-8">
        <a href="/" className="text-zinc-500 hover:text-zinc-300 text-sm">← Back to Reader (normal mode)</a>
      </div>
    </div>
  );
}
