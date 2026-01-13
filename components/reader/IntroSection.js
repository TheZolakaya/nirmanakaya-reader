// === INTRO SECTION COMPONENT ===
// Landing page intro text

const IntroSection = () => (
  <div className="mb-6 text-center">
    <div className="max-w-2xl mx-auto">
      <p className="text-zinc-400 text-sm leading-relaxed">
        The Nirmanakaya is both mirror and forge. Bring a question or declare an intention —
        the draw finds what's ready to be seen. Where you are, what's moving, what might need attention.
      </p>
      {/* Help Links */}
      <div className="flex justify-center gap-4 mt-4 text-xs">
        <a
          href="/guide"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 hover:text-amber-400 transition-colors"
        >
          Reader Guide
        </a>
        <span className="text-zinc-700">•</span>
        <a
          href="/about"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 hover:text-amber-400 transition-colors"
        >
          What is this?
        </a>
      </div>
    </div>
  </div>
);

export default IntroSection;
