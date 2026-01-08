// === MIRROR SECTION COMPONENT ===
// Poetic reflection section (renamed from "Why Moment")
// Recognition + invitation/question

const MirrorSection = ({
  content,
  isBalanced = false,
  className = ''
}) => {
  if (!content) return null;

  // Parse content into lines
  const lines = content.split('\n').filter(line => line.trim());
  const recognition = lines[0] || null;
  const question = lines[1] || null;

  return (
    <div className={`rounded-lg border border-violet-500/30 bg-violet-950/20 p-4 animate-fadeIn ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-violet-400 text-sm">🪞</span>
        <span className="text-xs font-medium text-violet-400 uppercase tracking-wider">
          The Mirror
        </span>
      </div>

      {/* Recognition line */}
      {recognition && (
        <p className={`text-sm leading-relaxed ${isBalanced ? 'text-violet-200/90' : 'text-violet-200/80'} italic`}>
          {recognition}
        </p>
      )}

      {/* Question/invitation (for imbalanced) or confirmation (for balanced) */}
      {question && (
        <p className="text-sm leading-relaxed text-violet-300/70 mt-2 italic">
          {question}
        </p>
      )}
    </div>
  );
};

export default MirrorSection;
