// === PERSONA SELECTOR COMPONENT ===
// V3: Three dials — Persona, Humor, Complexity
// No register, no creator, no roast/direct mode

import { PERSONAS, HUMOR_LEVELS, COMPLEXITY_OPTIONS } from '../../lib/personas.js';

const PersonaSelector = ({
  persona,
  setPersona,
  humor,
  setHumor,
  complexity,
  setComplexity,
  compact = false,
  hasReading = false
}) => {

  const getHumorLabel = (val) => HUMOR_LEVELS[val] || 'Balanced';

  // Compact mode for post-reading panel
  if (compact) {
    return (
      <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800/50 mb-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-xs text-zinc-500 mb-3">
          Voice settings {hasReading && <span className="text-amber-600/60">(change & re-interpret)</span>}
        </div>

        {/* Persona buttons - compact row */}
        <div className="flex flex-wrap gap-1 justify-center mb-3">
          {PERSONAS.map(p => (
            <button
              key={p.key}
              onClick={() => setPersona(p.key)}
              title={p.desc}
              className={`px-2 py-1.5 rounded-md text-xs transition-all ${
                persona === p.key
                  ? 'bg-[#2e1065] text-amber-400 border border-amber-800/50'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Sliders & Controls */}
        <div className="space-y-3 border-t border-zinc-800/50 pt-3">
          {/* Humor slider */}
          <div className="px-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[0.625rem] text-zinc-500 uppercase tracking-wider">Humor</span>
              <span className="text-[0.625rem] text-amber-500/80">{getHumorLabel(humor)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">Sacred</span>
              <input
                type="range"
                min="1"
                max="10"
                value={11 - humor}
                onChange={(e) => setHumor(11 - parseInt(e.target.value))}
                className="flex-1 accent-amber-500 h-1"
              />
              <span className="text-[10px] text-zinc-600">Wild</span>
            </div>
          </div>

          {/* Complexity buttons */}
          <div className="px-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[0.625rem] text-zinc-500 uppercase tracking-wider">Complexity</span>
              <span className="text-[0.625rem] text-amber-500/80">{COMPLEXITY_OPTIONS.find(o => o.key === complexity)?.name || 'Clear'}</span>
            </div>
            <div className="flex gap-1 justify-center">
              {COMPLEXITY_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setComplexity(opt.key)}
                  title={opt.desc}
                  className={`px-2.5 py-1 rounded text-xs transition-all ${
                    complexity === opt.key
                      ? 'bg-zinc-700 text-zinc-100'
                      : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {opt.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full mode for pre-reading selection
  return (
    <div className="flex flex-col items-center persona-selector">
      {/* Label */}
      <div className="text-xs text-zinc-500 mb-2">
        Who reads this to you?
      </div>

      {/* Persona buttons */}
      <div className="grid grid-cols-3 gap-1.5 w-full max-w-sm mx-auto px-1 mb-2">
        {PERSONAS.map(p => (
          <button
            key={p.key}
            onClick={() => setPersona(p.key)}
            title={p.desc}
            className={`px-2 py-2 min-h-[40px] rounded-md text-sm font-medium transition-all text-center ${
              persona === p.key
                ? 'bg-[#2e1065] text-amber-400 border border-amber-600/30'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 active:bg-zinc-700 border border-zinc-800'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Persona description */}
      <div className="text-center text-[0.75rem] sm:text-[0.625rem] text-zinc-500 mb-3">
        {PERSONAS.find(p => p.key === persona)?.desc || ''}
      </div>

      {/* Voice controls */}
      <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800/50 max-w-md mx-auto w-full">
        {/* Humor slider */}
        <div className="mb-4 px-2">
          <div className="flex items-center justify-between mb-1 sm:mb-0">
            <span className="text-xs text-zinc-500">Humor</span>
            <span className="text-xs text-amber-500/80 sm:hidden">{getHumorLabel(humor)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600 w-12 text-right">Sacred</span>
            <input
              type="range"
              min="1"
              max="10"
              value={11 - humor}
              onChange={(e) => setHumor(11 - parseInt(e.target.value))}
              className="flex-1 accent-amber-500"
            />
            <span className="text-[10px] text-zinc-600 w-10">Wild</span>
            <span className="hidden sm:inline text-xs text-amber-500/80 w-20 text-right">{getHumorLabel(humor)}</span>
          </div>
        </div>

        {/* Complexity buttons */}
        <div className="px-2 pt-3 border-t border-zinc-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500">Complexity</span>
          </div>
          <div className="flex gap-1.5 justify-center">
            {COMPLEXITY_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setComplexity(opt.key)}
                className={`px-3 py-1.5 rounded-md text-xs transition-all ${
                  complexity === opt.key
                    ? 'bg-[#2e1065] text-amber-400 border border-amber-600/30'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 border border-zinc-800'
                }`}
              >
                {opt.name}
              </button>
            ))}
          </div>
          <div className="text-center text-[0.625rem] text-zinc-600 mt-1.5">
            {COMPLEXITY_OPTIONS.find(o => o.key === complexity)?.desc || ''}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonaSelector;
