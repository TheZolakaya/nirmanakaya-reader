// === MOBILE DEPTH STEPPER COMPONENT ===
// Stepper navigation for depth selection on mobile
// Fixed-position arrows with centered depth label and dot indicator

const MobileDepthStepper = ({
  currentDepth,        // 'shallow' | 'wade' | 'swim' | 'deep'
  onDepthChange,       // (newDepth) => void
  hasContent,          // { shallow: bool, wade: bool, swim: bool, deep: bool }
  accentColor = 'amber' // amber | emerald | teal | cyan | violet
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

  const bgColors = {
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    teal: 'bg-teal-500',
    cyan: 'bg-cyan-500',
    violet: 'bg-violet-500'
  };

  const handleLeft = () => {
    if (canLeft) {
      onDepthChange(depths[idx - 1]);
    }
  };

  const handleRight = () => {
    if (canRight) {
      onDepthChange(depths[idx + 1]);
    }
  };

  return (
    <div className="flex items-center w-full py-1">
      {/* LEFT ARROW - fixed width, never moves */}
      <button
        onClick={handleLeft}
        disabled={!canLeft}
        className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg transition-all ${
          canLeft
            ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white active:bg-zinc-600'
            : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
        }`}
        aria-label="Previous depth"
      >
        <span className="text-lg">◀</span>
      </button>

      {/* CENTER - depth name + dots */}
      <div className="flex-1 text-center min-w-0">
        <div className={`font-medium text-base ${textColors[accentColor]}`}>
          {currentDepth.charAt(0).toUpperCase() + currentDepth.slice(1)}
        </div>
        <div className="flex justify-center gap-2 mt-1">
          {depths.map((d, i) => (
            <span
              key={d}
              className={`text-sm transition-colors ${
                i === idx ? textColors[accentColor] : 'text-zinc-600'
              }`}
            >
              {i === idx ? '●' : '○'}
            </span>
          ))}
        </div>
      </div>

      {/* RIGHT ARROW - fixed width, never moves */}
      <button
        onClick={handleRight}
        disabled={!canRight}
        className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg transition-all ${
          canRight
            ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white active:bg-zinc-600'
            : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
        }`}
        aria-label={needsGen ? "Generate next depth" : "Next depth"}
      >
        <span className="text-lg">
          ▶{needsGen && <span className="text-[10px] align-super opacity-70">+</span>}
        </span>
      </button>
    </div>
  );
};

export default MobileDepthStepper;
