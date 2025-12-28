// === WHY MOMENT COMPONENT ===
// Displays the "Why" moment after signature interpretation
// Structure: recognition line + Now re-entry question (imbalanced) or value confirmation (balanced)

export default function WhyMoment({ recognition, question, isBalanced }) {
  if (!recognition) return null;

  return (
    <div className="why-moment my-6 px-6 py-4 text-center">
      {/* Divider with Why label */}
      <div className="why-divider text-zinc-500 text-xs tracking-widest mb-4">
        --- Why ---
      </div>

      {/* Recognition line */}
      <p className="why-recognition text-zinc-300 text-sm leading-relaxed italic mb-3">
        {recognition}
      </p>

      {/* Question (imbalanced) or just the recognition (balanced) */}
      {question && (
        <p className="why-question text-zinc-400 text-sm font-medium">
          {question}
        </p>
      )}

      {/* Balanced value confirmation doesn't need a question */}
      {isBalanced && !question && (
        <p className="why-value text-emerald-400/70 text-xs mt-2">
          This is creation in flow.
        </p>
      )}
    </div>
  );
}
