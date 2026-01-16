// === HELP MODE OVERLAY ===
// Flashing indicator and click-catcher for help mode

const HelpModeOverlay = ({ active, onExit }) => {
  if (!active) return null;

  return (
    <>
      {/* Flashing indicator */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] pointer-events-auto">
        <div className="animate-pulse bg-amber-500/95 text-black px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/30">
          <span className="text-lg">?</span>
          <span>HELP MODE</span>
          <span className="text-xs text-black/60 ml-1">Click any element for help</span>
          <button
            onClick={onExit}
            className="ml-3 w-5 h-5 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/30 text-black/70 hover:text-black transition-colors"
            title="Exit help mode"
          >
            ×
          </button>
        </div>
      </div>

      {/* Click catcher for background - exits help mode */}
      <div
        className="fixed inset-0 z-[45] cursor-help"
        onClick={onExit}
        aria-hidden="true"
      />
    </>
  );
};

export default HelpModeOverlay;
