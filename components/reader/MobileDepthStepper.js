// === MOBILE DEPTH STEPPER COMPONENT ===
// Compact stepper navigation for depth selection on mobile
// Left-justified, with loading animation centered below

const MobileDepthStepper = ({
  currentDepth,        // 'shallow' | 'wade' | 'swim' | 'deep'
  onDepthChange,       // (newDepth) => void
  hasContent,          // { shallow: bool, wade: bool, swim: bool, deep: bool }
  accentColor = 'amber', // amber | emerald | teal | cyan | violet
  loading = false      // Show pulsating animation when loading deeper content
}) => {
  const depths = ['shallow', 'wade', 'swim', 'deep'];
  const idx = depths.indexOf(currentDepth);
  const canLeft = idx > 0;
  const canRight = idx < depths.length - 1;
  const needsGen = canRight && !hasContent[depths[idx + 1]];

  // Color classes for each accent
  const textColors = {
    amber: 'text-amber-500',
    emerald: 'text-emerald-500',
    teal: 'text-teal-500',
    cyan: 'text-cyan-500',
    violet: 'text-violet-500'
  };

  const handleLeft = () => {
    if (canLeft && !loading) {
      onDepthChange(depths[idx - 1]);
    }
  };

  const handleRight = () => {
    if (canRight && !loading) {
      onDepthChange(depths[idx + 1]);
    }
  };

  return (
    <div>
      {/* Navigation row - left justified */}
      <div className="flex items-center justify-start gap-3 py-2">
        {/* LEFT ARROW - compact */}
        <button
          onClick={handleLeft}
          disabled={!canLeft || loading}
          className={`w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-md transition-all ${
            loading
              ? 'bg-zinc-800/50 text-zinc-600 cursor-wait'
              : canLeft
                ? 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 active:bg-zinc-600'
                : 'bg-zinc-800/30 text-zinc-700 cursor-not-allowed'
          }`}
          aria-label="Previous depth"
        >
          <span className="text-xs">◀</span>
        </button>

        {/* CENTER - depth name + dots */}
        <div className="text-center min-w-[80px]">
          <div className={`text-xs font-medium ${textColors[accentColor]}`}>
            {currentDepth.charAt(0).toUpperCase() + currentDepth.slice(1)}
          </div>
          <div className="flex justify-center gap-1.5 mt-0.5">
            {depths.map((d, i) => (
              <span
                key={d}
                className={`text-[8px] transition-colors ${
                  i === idx ? textColors[accentColor] : 'text-zinc-600'
                }`}
              >
                {i === idx ? '●' : '○'}
              </span>
            ))}
          </div>
        </div>

        {/* RIGHT ARROW - compact */}
        <button
          onClick={handleRight}
          disabled={!canRight || loading}
          className={`w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-md transition-all ${
            loading
              ? 'bg-zinc-800/50 text-zinc-600 cursor-wait'
              : canRight
                ? 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 active:bg-zinc-600'
                : 'bg-zinc-800/30 text-zinc-700 cursor-not-allowed'
          }`}
          aria-label={needsGen ? "Generate next depth" : "Next depth"}
        >
          <span className="text-xs">
            ▶{needsGen && !loading && <span className="text-[8px] align-super opacity-70">+</span>}
          </span>
        </button>
      </div>

      {/* Loading indicator - centered below navigation */}
      {loading && (
        <div className={`text-center text-xs ${textColors[accentColor]} animate-pulse mt-1`}>
          Going deeper...
        </div>
      )}
    </div>
  );
};

export default MobileDepthStepper;
