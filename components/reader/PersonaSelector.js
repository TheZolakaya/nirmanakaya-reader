// === PERSONA SELECTOR COMPONENT ===
// UI for selecting and customizing the persona translation layer
// Stage 2 voice transformation - translates readings into different personas

import { PERSONAS } from '../../lib/personas.js';

const PersonaSelector = ({
  persona,
  setPersona,
  humor,
  setHumor,
  register,
  setRegister,
  roastMode,
  setRoastMode,
  directMode,
  setDirectMode,
  onRetranslate = null,
  translating = false,
  compact = false,
  hasReading = false
}) => {

  // Slider labels based on value
  const getHumorLabel = (val) => {
    if (val <= 2) return 'Comic';
    if (val <= 4) return 'Playful';
    if (val <= 6) return 'Balanced';
    if (val <= 8) return 'Earnest';
    return 'Sacred';
  };

  const getRegisterLabel = (val) => {
    if (val <= 2) return 'Street';
    if (val <= 4) return 'Casual';
    if (val <= 6) return 'Clear';
    if (val <= 8) return 'Elevated';
    return 'Professor';
  };

  // Compact mode for post-reading (smaller, inline)
  if (compact) {
    return (
      <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50 mb-4 max-w-2xl mx-auto">
        {/* Header with current persona */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-zinc-500">
            Who reads this to you?
          </div>
          {onRetranslate && persona !== 'none' && hasReading && (
            <button
              onClick={onRetranslate}
              disabled={translating}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                translating
                  ? 'bg-zinc-800 text-zinc-500 cursor-wait'
                  : 'bg-amber-900/50 text-amber-400 hover:bg-amber-900/70'
              }`}
            >
              {translating ? 'Translating...' : 'Re-translate'}
            </button>
          )}
        </div>

        {/* Persona buttons - compact row */}
        <div className="flex flex-wrap gap-1 justify-center mb-3">
          {PERSONAS.map(p => (
            <button
              key={p.key}
              onClick={() => setPersona(p.key)}
              title={p.desc}
              disabled={translating}
              className={`px-2 py-1.5 rounded-md text-xs transition-all ${
                persona === p.key
                  ? 'bg-[#2e1065] text-amber-400 border border-amber-800/50'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              } ${translating ? 'opacity-50 cursor-wait' : ''}`}
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
              <span className="text-[10px] text-zinc-600 w-10 text-right">Comic</span>
              <input
                type="range"
                min="1"
                max="10"
                value={humor}
                onChange={(e) => setHumor(parseInt(e.target.value))}
                disabled={translating}
                className="flex-1 accent-amber-500 h-1"
              />
              <span className="text-[10px] text-zinc-600 w-10">Serious</span>
              <span className="text-[10px] text-amber-500/80 w-14 text-right">{getHumorLabel(humor)}</span>
            </div>

            {/* Register slider */}
            <div className="flex items-center gap-2 px-2">
              <span className="text-xs text-zinc-500 w-14">Register</span>
              <span className="text-[10px] text-zinc-600 w-10 text-right">Street</span>
              <input
                type="range"
                min="1"
                max="10"
                value={register}
                onChange={(e) => setRegister(parseInt(e.target.value))}
                disabled={translating}
                className="flex-1 accent-amber-500 h-1"
              />
              <span className="text-[10px] text-zinc-600 w-10">Fancy</span>
              <span className="text-[10px] text-amber-500/80 w-14 text-right">{getRegisterLabel(register)}</span>
            </div>

            {/* Checkboxes */}
            <div className="flex justify-center gap-4 pt-1">
              <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={roastMode}
                  onChange={(e) => setRoastMode(e.target.checked)}
                  disabled={translating}
                  className="accent-amber-500 w-3 h-3"
                />
                Roast Mode
              </label>
              <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={directMode}
                  onChange={(e) => setDirectMode(e.target.checked)}
                  disabled={translating}
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
            <span className="text-[10px] text-zinc-600 w-12 text-right">Comic</span>
            <input
              type="range"
              min="1"
              max="10"
              value={humor}
              onChange={(e) => setHumor(parseInt(e.target.value))}
              className="flex-1 accent-amber-500"
            />
            <span className="text-[10px] text-zinc-600 w-12">Serious</span>
            <span className="text-xs text-amber-500/80 w-16 text-right">{getHumorLabel(humor)}</span>
          </div>

          {/* Register slider */}
          <div className="flex items-center gap-2 mb-3 px-2">
            <span className="text-xs text-amber-600/80 w-16 font-medium">Register</span>
            <span className="text-[10px] text-zinc-600 w-12 text-right">Street</span>
            <input
              type="range"
              min="1"
              max="10"
              value={register}
              onChange={(e) => setRegister(parseInt(e.target.value))}
              className="flex-1 accent-amber-500"
            />
            <span className="text-[10px] text-zinc-600 w-12">Fancy</span>
            <span className="text-xs text-amber-500/80 w-16 text-right">{getRegisterLabel(register)}</span>
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
              <span className="text-[10px] text-zinc-600" title="Loving but savage. The roast IS the love.">(savage)</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer hover:text-zinc-200 transition-colors">
              <input
                type="checkbox"
                checked={directMode}
                onChange={(e) => setDirectMode(e.target.checked)}
                className="accent-amber-500"
              />
              Direct Mode
              <span className="text-[10px] text-zinc-600" title="No softening. Clean truth, delivered straight.">(unfiltered)</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonaSelector;
