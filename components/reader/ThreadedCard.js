// === THREADED CARD COMPONENT ===
// Recursive component for nested thread cards with Reflect/Forge

import { STATUSES, STATUS_INFO, STATUS_COLORS } from '../../lib/constants.js';
import { getComponent } from '../../lib/corrections.js';
import { renderWithHotlinks } from '../../lib/hotlinks.js';

const ThreadedCard = ({
  threadItem,
  threadIndex,
  cardIndex,
  parentThreadPath = '', // e.g., "0.1.2" for nested threads
  depth = 0, // track nesting depth for max 1 level indentation
  showTraditional,
  collapsedThreads,
  setCollapsedThreads,
  setSelectedInfo, // for hotlink popups
}) => {
  const isReflect = threadItem.operation === 'reflect';
  // Both Reflect and Forge draw new cards
  const threadTrans = getComponent(threadItem.draw.transient);
  const threadStat = STATUSES[threadItem.draw.status];
  const threadStatusPrefix = threadStat.prefix || 'Balanced';
  const operationLabel = isReflect ? 'Reflecting' : 'Forging';

  // Unique key for this thread node
  const threadKey = parentThreadPath ? `${parentThreadPath}.${threadIndex}` : `${cardIndex}:${threadIndex}`;
  const isCollapsed = collapsedThreads?.[threadKey] === true;

  const toggleCollapse = (e) => {
    e.stopPropagation();
    setCollapsedThreads?.(prev => ({ ...prev, [threadKey]: !isCollapsed }));
  };

  // Only indent for first level (depth 0), flatten after that
  const indentClass = depth === 0 ? 'ml-4 border-l-2 border-zinc-700/50 pl-4' : 'mt-3';

  return (
    <div className={indentClass}>
      {/* Thread connector label with collapse toggle */}
      <div
        className={`text-xs mb-2 flex items-center gap-2 cursor-pointer ${isReflect ? 'text-sky-400' : 'text-orange-400'}`}
        onClick={toggleCollapse}
      >
        <span
          className={`transition-transform duration-200 ${isCollapsed ? 'text-red-500' : 'text-emerald-500'}`}
          style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', display: 'inline-block' }}
        >
          ▼
        </span>
        <span className="text-zinc-600">↳</span>
        <span>{operationLabel}{threadItem.context ? `: "${threadItem.context}"` : ''}</span>
      </div>

      {/* Nested card - collapsible */}
      {!isCollapsed && (
        <div className={`rounded-lg p-4 ${isReflect ? 'border border-sky-500/30 bg-sky-950/20' : 'border border-orange-500/30 bg-orange-950/20'}`}>
          {/* Card header - both Reflect and Forge draw new cards, with clickable terms */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full cursor-pointer hover:ring-1 hover:ring-white/30 ${STATUS_COLORS[threadItem.draw.status]}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedInfo?.({ type: 'status', id: threadItem.draw.status, data: STATUS_INFO[threadItem.draw.status] });
              }}
            >
              {threadStat.name}
            </span>
            <span className="text-sm font-medium text-zinc-200">
              <span
                className="cursor-pointer hover:underline decoration-dotted underline-offset-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedInfo?.({ type: 'status', id: threadItem.draw.status, data: STATUS_INFO[threadItem.draw.status] });
                }}
              >
                {threadStatusPrefix}
              </span>
              {threadStatusPrefix && ' '}
              <span
                className="cursor-pointer hover:underline decoration-dotted underline-offset-2 text-amber-300/90"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedInfo?.({ type: 'card', id: threadItem.draw.transient, data: getComponent(threadItem.draw.transient) });
                }}
              >
                {threadTrans.name}
              </span>
            </span>
          </div>
          {showTraditional && (
            <div className="text-xs text-zinc-500 mb-2">{threadTrans.traditional}</div>
          )}

          {/* Interpretation with hotlinks - split into paragraphs */}
          <div className="text-sm leading-relaxed text-zinc-300 space-y-3">
            {(threadItem.interpretation || '').split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
              <p key={i} className="whitespace-pre-wrap">
                {renderWithHotlinks(para.trim(), setSelectedInfo)}
              </p>
            ))}
          </div>

          {/* Recursive nested threads */}
          {threadItem.children && threadItem.children.length > 0 && (
            <div className="mt-4 space-y-3">
              {threadItem.children.map((childItem, childIndex) => (
                <ThreadedCard
                  key={childIndex}
                  threadItem={childItem}
                  threadIndex={childIndex}
                  cardIndex={cardIndex}
                  parentThreadPath={threadKey}
                  depth={depth + 1}
                  showTraditional={showTraditional}
                  collapsedThreads={collapsedThreads}
                  setCollapsedThreads={setCollapsedThreads}
                  setSelectedInfo={setSelectedInfo}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ThreadedCard;
