// === PERSONA SELECTOR COMPONENT ===
// UI for selecting and customizing persona voice settings
// V2: One-pass voice integration - voice baked into generation

import { PERSONAS, HUMOR_LEVELS, REGISTER_LEVELS, CREATOR_LEVELS } from '../../lib/personas.js';

const PersonaSelector = ({
  persona,
  setPersona,
  humor,
  setHumor,
  register,
  setRegister,
  creator,
  setCreator,
  roastMode,
  setRoastMode,
  directMode,
  setDirectMode,
  compact = false,
  hasReading = false
}) => {

  // True 10-level labels
  const getHumorLabel = (val) => HUMOR_LEVELS[val] || 'Balanced';
  const getRegisterLabel = (val) => REGISTER_LEVELS[val] || 'Clear';
  const getCreatorLabel = (val) => CREATOR_LEVELS[val] || 'Balanced';

  // Compact mode for post-reading (smaller, inline)
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

        {/* All sliders */}
        <div className="space-y-2 border-t border-zinc-800/50 pt-3">
          {/* Humor slider */}
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs text-zinc-500 w-14">Humor</span>
            <span className="text-[10px] text-zinc-600 w-14 text-right">Unhinged</span>
            <input
              type="range"
              min="1"
              max="10"
              value={humor}
              onChange={(e) => setHumor(parseInt(e.target.value))}
              className="flex-1 accent-amber-500 h-1"
            />
            <span className="text-[10px] text-zinc-600 w-10">Sacred</span>
            <span className="text-[10px] text-amber-500/80 w-16 text-right">{getHumorLabel(humor)}</span>
          </div>

          {/* Register slider */}
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs text-zinc-500 w-14">Register</span>
            <span className="text-[10px] text-zinc-600 w-14 text-right">Chaos</span>
            <input
              type="range"
              min="1"
              max="10"
              value={register}
              onChange={(e) => setRegister(parseInt(e.target.value))}
              className="flex-1 accent-amber-500 h-1"
            />
            <span className="text-[10px] text-zinc-600 w-10">Oracle</span>
            <span className="text-[10px] text-amber-500/80 w-16 text-right">{getRegisterLabel(register)}</span>
          </div>

          {/* Agency slider */}
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs text-amber-600/80 w-14 font-medium">Agency</span>
            <span className="text-[10px] text-zinc-600 w-14 text-right">Witness</span>
            <input
              type="range"
              min="1"
              max="10"
              value={creator}
              onChange={(e) => setCreator(parseInt(e.target.value))}
              className="flex-1 accent-amber-500 h-1"
            />
            <span className="text-[10px] text-zinc-600 w-10">Creator</span>
            <span className="text-[10px] text-amber-500/80 w-16 text-right">{getCreatorLabel(creator)}</span>
          </div>

          {/* Checkboxes */}
          <div className="flex justify-center gap-4 pt-1">
            <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={roastMode}
                onChange={(e) => setRoastMode(e.target.checked)}
                className="accent-amber-500 w-3 h-3"
              />
              Roast Mode
            </label>
            <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={directMode}
                onChange={(e) => setDirectMode(e.target.checked)}
                className="accent-amber-500 w-3 h-3"
              />
              Direct Mode
            </label>
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

      {/* Persona buttons - always 2 rows of 3 for readability */}
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

      {/* Show persona description */}
      <div className="text-center text-[0.75rem] sm:text-[0.625rem] text-zinc-500 mb-3">
        {PERSONAS.find(p => p.key === persona)?.desc || ''}
      </div>

      {/* Voice sliders */}
      <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800/50 max-w-md mx-auto w-full">
        {/* Humor slider - stacked on mobile, inline on desktop */}
        <div className="mb-3 px-2">
          <div className="flex items-center justify-between mb-1 sm:mb-0">
            <span className="text-xs text-zinc-500">Humor</span>
            <span className="text-xs text-amber-500/80 sm:hidden">{getHumorLabel(humor)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[10px] text-zinc-600 w-14 text-right">Unhinged</span>
            <input
              type="range"
              min="1"
              max="10"
              value={humor}
              onChange={(e) => setHumor(parseInt(e.target.value))}
              className="flex-1 accent-amber-500"
            />
            <span className="hidden sm:inline text-[10px] text-zinc-600 w-12">Sacred</span>
            <span className="hidden sm:inline text-xs text-amber-500/80 w-24 text-right">{getHumorLabel(humor)}</span>
          </div>
        </div>

        {/* Register slider - stacked on mobile, inline on desktop */}
        <div className="mb-3 px-2">
          <div className="flex items-center justify-between mb-1 sm:mb-0">
            <span className="text-xs text-zinc-500">Register</span>
            <span className="text-xs text-amber-500/80 sm:hidden">{getRegisterLabel(register)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[10px] text-zinc-600 w-14 text-right">Chaos</span>
            <input
              type="range"
              min="1"
              max="10"
              value={register}
              onChange={(e) => setRegister(parseInt(e.target.value))}
              className="flex-1 accent-amber-500"
            />
            <span className="hidden sm:inline text-[10px] text-zinc-600 w-12">Oracle</span>
            <span className="hidden sm:inline text-xs text-amber-500/80 w-24 text-right">{getRegisterLabel(register)}</span>
          </div>
        </div>

        {/* Agency slider - stacked on mobile, inline on desktop */}
        <div className="mb-3 px-2">
          <div className="flex items-center justify-between mb-1 sm:mb-0">
            <span className="text-xs text-amber-600/80 font-medium">Agency</span>
            <span className="text-xs text-amber-500/80 sm:hidden">{getCreatorLabel(creator)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[10px] text-zinc-600 w-14 text-right">Witness</span>
            <input
              type="range"
              min="1"
              max="10"
              value={creator}
              onChange={(e) => setCreator(parseInt(e.target.value))}
              className="flex-1 accent-amber-500"
            />
            <span className="hidden sm:inline text-[10px] text-zinc-600 w-12">Creator</span>
            <span className="hidden sm:inline text-xs text-amber-500/80 w-24 text-right">{getCreatorLabel(creator)}</span>
          </div>
        </div>

        {/* Agency hint */}
        <div className="text-center text-[0.625rem] text-zinc-600 mb-3 pb-3 border-b border-zinc-800/50">
          {creator <= 3 ? 'Observation: "The field shows..."' :
           creator <= 6 ? 'Balanced observation and agency' :
           creator <= 8 ? 'Agency: "You\'re shaping..."' :
           'Full authorship: "You ARE the field"'}
        </div>

        {/* Checkboxes */}
        <div className="flex justify-center gap-6 pt-1">
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer hover:text-zinc-200 transition-colors">
            <input
              type="checkbox"
              checked={roastMode}
              onChange={(e) => setRoastMode(e.target.checked)}
              className="accent-amber-500"
            />
            Roast Mode
            <span className="text-[10px] text-zinc-600" title="Best friend who's HAD IT. Read them for filth.">(savage)</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer hover:text-zinc-200 transition-colors">
            <input
              type="checkbox"
              checked={directMode}
              onChange={(e) => setDirectMode(e.target.checked)}
              className="accent-amber-500"
            />
            Direct Mode
            <span className="text-[10px] text-zinc-600" title="No hedging. State observations as facts.">(unfiltered)</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default PersonaSelector;
