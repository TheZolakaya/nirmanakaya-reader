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
      <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50 mb-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-xs text-zinc-500 mb-3">
          Voice settings {hasReading && <span className="text-amber-600/60">(locked for this reading)</span>}
        </div>

        {/* Creator slider - ALWAYS shows (works independently of persona) */}
        <div className="mb-3 pb-3 border-b border-zinc-800/50">
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs text-amber-600/80 w-14 font-medium">Creator</span>
            <span className="text-[10px] text-zinc-600 w-12 text-right">Witness</span>
            <input
              type="range"
              min="1"
              max="10"
              value={creator}
              onChange={(e) => setCreator(parseInt(e.target.value))}
              disabled={hasReading}
              className="flex-1 accent-amber-500 h-1"
            />
            <span className="text-[10px] text-zinc-600 w-12">Author</span>
            <span className="text-[10px] text-amber-500/80 w-16 text-right">{getCreatorLabel(creator)}</span>
          </div>
        </div>

        {/* Persona buttons - compact row */}
        <div className="flex flex-wrap gap-1 justify-center mb-3">
          {PERSONAS.map(p => (
            <button
              key={p.key}
              onClick={() => setPersona(p.key)}
              title={p.desc}
              disabled={hasReading}
              className={`px-2 py-1.5 rounded-md text-xs transition-all ${
                persona === p.key
                  ? 'bg-[#2e1065] text-amber-400 border border-amber-800/50'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              } ${hasReading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Show controls only when persona is not "none" */}
        {persona !== 'none' && (
          <div className="space-y-2 border-t border-zinc-800/50 pt-3">
            {/* Humor slider */}
            <div className="flex items-center gap-2 px-2">
              <span className="text-xs text-zinc-500 w-14">Humor</span>
              <span className="text-[10px] text-zinc-600 w-12 text-right">Unhinged</span>
              <input
                type="range"
                min="1"
                max="10"
                value={humor}
                onChange={(e) => setHumor(parseInt(e.target.value))}
                disabled={hasReading}
                className="flex-1 accent-amber-500 h-1"
              />
              <span className="text-[10px] text-zinc-600 w-10">Sacred</span>
              <span className="text-[10px] text-amber-500/80 w-16 text-right">{getHumorLabel(humor)}</span>
            </div>

            {/* Register slider */}
            <div className="flex items-center gap-2 px-2">
              <span className="text-xs text-zinc-500 w-14">Register</span>
              <span className="text-[10px] text-zinc-600 w-12 text-right">Unhinged</span>
              <input
                type="range"
                min="1"
                max="10"
                value={register}
                onChange={(e) => setRegister(parseInt(e.target.value))}
                disabled={hasReading}
                className="flex-1 accent-amber-500 h-1"
              />
              <span className="text-[10px] text-zinc-600 w-10">Oracle</span>
              <span className="text-[10px] text-amber-500/80 w-16 text-right">{getRegisterLabel(register)}</span>
            </div>

            {/* Checkboxes */}
            <div className="flex justify-center gap-4 pt-1">
              <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={roastMode}
                  onChange={(e) => setRoastMode(e.target.checked)}
                  disabled={hasReading}
                  className="accent-amber-500 w-3 h-3"
                />
                Roast Mode
              </label>
              <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={directMode}
                  onChange={(e) => setDirectMode(e.target.checked)}
                  disabled={hasReading}
                  className="accent-amber-500 w-3 h-3"
                />
                Direct Mode
              </label>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full mode for pre-reading selection
  return (
    <div className="flex flex-col items-center persona-selector">
      {/* Creator slider - ALWAYS shows first (works independently of persona) */}
      <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50 max-w-md mx-auto w-full mb-4">
        <div className="flex items-center gap-2 px-2">
          <span className="text-xs text-amber-600/80 w-16 font-medium">Creator</span>
          <span className="text-[10px] text-zinc-600 w-14 text-right">Witness</span>
          <input
            type="range"
            min="1"
            max="10"
            value={creator}
            onChange={(e) => setCreator(parseInt(e.target.value))}
            className="flex-1 accent-amber-500"
          />
          <span className="text-[10px] text-zinc-600 w-14">Author</span>
          <span className="text-xs text-amber-500/80 w-20 text-right">{getCreatorLabel(creator)}</span>
        </div>
        <div className="text-center text-[0.625rem] text-zinc-600 mt-2">
          {creator <= 3 ? 'Observation language: "The field shows..."' :
           creator <= 6 ? 'Balanced observation and agency' :
           creator <= 8 ? 'Agency language: "You\'re shaping..."' :
           'Full authorship: "You ARE the field"'}
        </div>
      </div>

      {/* Label */}
      <div className="text-xs text-zinc-500 mb-2">
        Who reads this to you?
      </div>

      {/* Persona buttons - horizontal row like StanceSelector */}
      <div className="flex gap-0.5 sm:gap-1.5 justify-center w-full px-0.5 sm:px-0 mb-2">
        {PERSONAS.map(p => (
          <button
            key={p.key}
            onClick={() => setPersona(p.key)}
            title={p.desc}
            className={`flex-1 px-0.5 sm:px-2 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-sm text-[0.8125rem] sm:text-[0.6875rem] font-medium sm:font-normal transition-all text-center overflow-hidden ${
              persona === p.key
                ? 'bg-[#2e1065] text-amber-400'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 active:bg-zinc-700'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Show persona description */}
      <div className="text-center text-[0.75rem] sm:text-[0.625rem] text-zinc-500 mb-2">
        {PERSONAS.find(p => p.key === persona)?.desc || ''}
      </div>

      {/* Show controls only when persona is not "none" */}
      {persona !== 'none' && (
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50 max-w-md mx-auto w-full mt-2">
          {/* Humor slider */}
          <div className="flex items-center gap-2 mb-3 px-2">
            <span className="text-xs text-amber-600/80 w-16 font-medium">Humor</span>
            <span className="text-[10px] text-zinc-600 w-14 text-right">Unhinged</span>
            <input
              type="range"
              min="1"
              max="10"
              value={humor}
              onChange={(e) => setHumor(parseInt(e.target.value))}
              className="flex-1 accent-amber-500"
            />
            <span className="text-[10px] text-zinc-600 w-12">Sacred</span>
            <span className="text-xs text-amber-500/80 w-20 text-right">{getHumorLabel(humor)}</span>
          </div>

          {/* Register slider */}
          <div className="flex items-center gap-2 mb-3 px-2">
            <span className="text-xs text-amber-600/80 w-16 font-medium">Register</span>
            <span className="text-[10px] text-zinc-600 w-14 text-right">Unhinged</span>
            <input
              type="range"
              min="1"
              max="10"
              value={register}
              onChange={(e) => setRegister(parseInt(e.target.value))}
              className="flex-1 accent-amber-500"
            />
            <span className="text-[10px] text-zinc-600 w-12">Oracle</span>
            <span className="text-xs text-amber-500/80 w-20 text-right">{getRegisterLabel(register)}</span>
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
      )}
    </div>
  );
};

export default PersonaSelector;
