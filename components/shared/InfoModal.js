// === UNIVERSAL INFO MODAL COMPONENT ===
// Modal popup for displaying card, channel, house, status, role, AND glossary concept information

import { ARCHETYPES } from '../../lib/archetypes.js';
import { CHANNELS, HOUSES, ROLES, STATUS_INFO, HOUSE_COLORS, STATUS_COLORS, CHANNEL_COLORS } from '../../lib/constants.js';
import { getAssociatedCards } from '../../lib/corrections.js';
import { renderWithHotlinks } from '../../lib/hotlinks.js';
import { getGlossaryEntry } from '../../lib/glossary.js';
import { getCardImagePath, getDetailedCardType, getHomeArchetype } from '../../lib/cardImages.js';
import ClickableTermContext from './ClickableTermContext.js';
import Minimap from '../reader/Minimap.js';

const InfoModal = ({ info, onClose, setSelectedInfo, showTraditional, canGoBack, onGoBack }) => {
  if (!info) return null;

  const { type, id, data } = info;

  // Local ClickableTerm that has access to setSelectedInfo
  const ClickableTerm = ({ type: termType, id: termId, children }) => (
    <ClickableTermContext type={termType} id={termId} setSelectedInfo={setSelectedInfo}>
      {children}
    </ClickableTermContext>
  );

  // Clickable glossary term (for fundamental terms like "House", "Archetype", etc.)
  const GlossaryTerm = ({ slug, children, className = "" }) => {
    const entry = getGlossaryEntry(slug);
    if (!entry) return <span className={className}>{children}</span>;
    return (
      <span
        className={`cursor-pointer hover:underline decoration-dotted underline-offset-2 text-violet-300/90 ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedInfo({ type: 'glossary', id: slug, data: entry });
        }}
      >
        {children}
      </span>
    );
  };

  // Render based on type
  const renderContent = () => {
    if (type === 'card') {
      const component = data;
      const isArchetype = component.type === "Archetype";
      const isBound = component.type === "Bound";
      const isAgent = component.type === "Agent";
      const associatedArchetype = (isBound || isAgent) ? ARCHETYPES[component.archetype] : null;
      const associations = isArchetype ? getAssociatedCards(id) : null;
      const cardImagePath = getCardImagePath(id);
      const detailedType = getDetailedCardType(id);

      // Minimap: show where this card lives on the architecture map
      const homeArchetype = getHomeArchetype(id);
      const minimapCardType = isBound ? 'bound' : isAgent ? 'agent' : 'archetype';
      const minimapBoundIsInner = isBound && component.number <= 5;

      return (
        <>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold text-zinc-100">{component.name}</h3>
              <p className="text-sm text-zinc-500">{component.traditional}</p>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">×</button>
          </div>

          {/* Card Image - scaled to fit popup, constrained height to avoid scroll */}
          {cardImagePath && (
            <div className="flex justify-center mb-4">
              <img
                src={cardImagePath}
                alt={component.name}
                className="w-[95%] h-auto rounded-lg shadow-lg"
                style={{ maxHeight: '35vh', objectFit: 'contain' }}
              />
            </div>
          )}

          {/* Minimap - show card's home position on the architecture map */}
          {homeArchetype !== null && (
            <div className="flex justify-center mb-4">
              <div
                className="rounded-lg overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(107, 77, 138, 0.1) 0%, rgba(13, 13, 26, 0.6) 50%, rgba(107, 77, 138, 0.1) 100%)',
                  border: '1px solid rgba(107, 77, 138, 0.25)',
                  padding: '8px'
                }}
              >
                <Minimap
                  highlightId={homeArchetype}
                  fromId={homeArchetype}
                  size="sm"
                  singleMode={true}
                  fromCardType={minimapCardType}
                  boundIsInner={minimapBoundIsInner}
                />
              </div>
            </div>
          )}

          <div className="mb-4">
            <GlossaryTerm slug={
              // Use specific glossary slug based on detailed card type
              isBound && detailedType?.subtype === 'INNER' ? 'inner-bound' :
              isBound && detailedType?.subtype === 'OUTER' ? 'outer-bound' :
              isArchetype && detailedType?.subtype === 'INNER' ? 'inner-archetype' :
              isArchetype && detailedType?.subtype === 'OUTER' ? 'outer-archetype' :
              isArchetype && detailedType?.subtype === 'INGRESS' ? 'ingress-portal' :
              isArchetype && detailedType?.subtype === 'EGRESS' ? 'egress-portal' :
              isAgent ? 'agent' :
              component.type.toLowerCase()
            }>
              <span className={`text-xs px-2 py-1 rounded-full cursor-pointer hover:opacity-80 ${
                isArchetype ? 'bg-amber-500/20 text-amber-300' :
                isBound ? 'bg-blue-500/20 text-blue-300' :
                'bg-violet-500/20 text-violet-300'
              }`}>
                {detailedType?.label || component.type}
              </span>
            </GlossaryTerm>
            {isBound && (
              <span className="text-xs text-zinc-500 ml-2">
                <ClickableTerm type="channel" id={component.channel}>{component.channel}</ClickableTerm> <GlossaryTerm slug="channel">Channel</GlossaryTerm>
              </span>
            )}
            {isAgent && (
              <span className="text-xs text-zinc-500 ml-2">
                <ClickableTerm type="role" id={component.role}>{component.role}</ClickableTerm> • <ClickableTerm type="channel" id={component.channel}>{component.channel}</ClickableTerm> <GlossaryTerm slug="channel">Channel</GlossaryTerm>
              </span>
            )}
            {/* Card type description */}
            {detailedType?.descriptions?.short && (
              <p className="text-xs text-zinc-400 mt-2 italic leading-relaxed">
                {detailedType.descriptions.short}
              </p>
            )}
          </div>

          <p className="text-sm text-zinc-300 mb-4 leading-relaxed">
            {renderWithHotlinks(component.extended || component.description, setSelectedInfo, showTraditional)}
          </p>

          {/* Archetype metadata: House, Process Stage, Channel */}
          {isArchetype && (
            <div className="border-t border-zinc-700/50 pt-4 mb-4">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                <span>
                  <span className="text-zinc-500">House:</span>{' '}
                  <ClickableTerm type="house" id={component.house}>
                    <span className="text-amber-300/80">{component.house}</span>
                  </ClickableTerm>
                </span>
                <span>
                  <span className="text-zinc-500">Process:</span>{' '}
                  <GlossaryTerm slug={component.function.toLowerCase()}>
                    <span className="text-emerald-300/80">{component.function}</span>
                  </GlossaryTerm>
                </span>
                {component.channel && (
                  <span>
                    <span className="text-zinc-500">Channel:</span>{' '}
                    <ClickableTerm type="channel" id={component.channel}>
                      <span className="text-sky-300/80">{component.channel}</span>
                    </ClickableTerm>
                  </span>
                )}
              </div>
            </div>
          )}

          {associatedArchetype && (
            <div className="border-t border-zinc-700/50 pt-4 mb-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                {isBound ? 'Expresses' : 'Embodies'}
              </p>
              <p className="text-sm text-zinc-300 mb-2">
                <ClickableTerm type="card" id={component.archetype}>{associatedArchetype.name}</ClickableTerm>
                <span className="text-zinc-500"> — {associatedArchetype.description}</span>
              </p>
              {/* Archetype metadata: House, Process Stage, Channel */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                <span>
                  <span className="text-zinc-500">House:</span>{' '}
                  <ClickableTerm type="house" id={associatedArchetype.house}>
                    <span className="text-amber-300/80">{associatedArchetype.house}</span>
                  </ClickableTerm>
                </span>
                <span>
                  <span className="text-zinc-500">Process:</span>{' '}
                  <GlossaryTerm slug={associatedArchetype.function.toLowerCase()}>
                    <span className="text-emerald-300/80">{associatedArchetype.function}</span>
                  </GlossaryTerm>
                </span>
                <span>
                  <span className="text-zinc-500">Channel:</span>{' '}
                  <ClickableTerm type="channel" id={component.channel}>
                    <span className="text-sky-300/80">{component.channel}</span>
                  </ClickableTerm>
                </span>
              </div>
            </div>
          )}

          {associations && (associations.bounds.length > 0 || associations.agents.length > 0) && (
            <div className="border-t border-zinc-700/50 pt-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Expressed By</p>

              {associations.bounds.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-zinc-600 mb-1">Bounds:</p>
                  <div className="flex flex-wrap gap-1">
                    {associations.bounds.map(b => (
                      <ClickableTerm key={b.id} type="card" id={b.id}>
                        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded hover:bg-zinc-700 cursor-pointer">
                          {b.name}
                        </span>
                      </ClickableTerm>
                    ))}
                  </div>
                </div>
              )}

              {associations.agents.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-600 mb-1">Agents:</p>
                  <div className="flex flex-wrap gap-1">
                    {associations.agents.map(a => (
                      <ClickableTerm key={a.id} type="card" id={a.id}>
                        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded hover:bg-zinc-700 cursor-pointer">
                          {a.name}
                        </span>
                      </ClickableTerm>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      );
    }

    if (type === 'channel') {
      const channel = CHANNELS[id];
      if (!channel) return null;

      return (
        <>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold text-zinc-100">{channel.name}</h3>
              <p className="text-sm text-zinc-500">{channel.traditional} • {channel.element}</p>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">×</button>
          </div>

          <div className="mb-4">
            <GlossaryTerm slug="channel">
              <span className={`text-xs px-2 py-1 rounded-full bg-opacity-20 cursor-pointer hover:opacity-80 ${CHANNEL_COLORS[id]}`}>
                Channel
              </span>
            </GlossaryTerm>
          </div>

          <p className="text-sm text-zinc-300 mb-4 leading-relaxed">{renderWithHotlinks(channel.extended, setSelectedInfo, showTraditional)}</p>
        </>
      );
    }

    if (type === 'status') {
      const status = STATUS_INFO[id];
      if (!status) return null;

      return (
        <>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold text-zinc-100">{status.name}</h3>
              <p className="text-sm text-zinc-500">{status.orientation}</p>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">×</button>
          </div>

          <div className="mb-4">
            <GlossaryTerm slug="status">
              <span className={`text-xs px-2 py-1 rounded-full cursor-pointer hover:opacity-80 ${STATUS_COLORS[id]}`}>
                Status
              </span>
            </GlossaryTerm>
          </div>

          <p className="text-sm text-zinc-300 mb-4 leading-relaxed">{renderWithHotlinks(status.extended, setSelectedInfo, showTraditional)}</p>
        </>
      );
    }

    if (type === 'house') {
      const house = HOUSES[id];
      if (!house) return null;
      const houseColors = HOUSE_COLORS[id];

      return (
        <>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold text-zinc-100">{house.name} House</h3>
              <p className="text-sm text-zinc-500">
                {house.governor !== null ? `Governed by ${ARCHETYPES[house.governor]?.name}` : 'No governor'}
              </p>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">×</button>
          </div>

          <div className="mb-4">
            <GlossaryTerm slug="house">
              <span className={`text-xs px-2 py-1 rounded-full cursor-pointer hover:opacity-80 ${houseColors?.bg} ${houseColors?.text}`}>
                House
              </span>
            </GlossaryTerm>
          </div>

          <p className="text-sm text-zinc-300 mb-4 leading-relaxed">{renderWithHotlinks(house.extended, setSelectedInfo, showTraditional)}</p>

          <div className="border-t border-zinc-700/50 pt-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Members</p>
            <div className="flex flex-wrap gap-1">
              {house.members.map(m => (
                <ClickableTerm key={m} type="card" id={m}>
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded hover:bg-zinc-700 cursor-pointer">
                    {ARCHETYPES[m]?.name}
                  </span>
                </ClickableTerm>
              ))}
            </div>
          </div>
        </>
      );
    }

    if (type === 'role') {
      const role = ROLES[id];
      if (!role) return null;

      return (
        <>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold text-zinc-100">{role.name}</h3>
              <p className="text-sm text-zinc-500">{role.traditional} in traditional tarot</p>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">×</button>
          </div>

          <div className="mb-4">
            <GlossaryTerm slug="agent">
              <span className="text-xs px-2 py-1 rounded-full bg-violet-500/20 text-violet-300 cursor-pointer hover:opacity-80">
                Agent Role
              </span>
            </GlossaryTerm>
          </div>

          <p className="text-sm text-zinc-300 mb-4 leading-relaxed">{renderWithHotlinks(role.extended, setSelectedInfo, showTraditional)}</p>
        </>
      );
    }

    // GLOSSARY CONCEPTS - framework terms, operations, relationships, etc.
    if (type === 'glossary') {
      const glossary = data;
      if (!glossary) return null;

      // Determine badge color based on glossary type
      const getTypeColor = (gType) => {
        switch(gType) {
          case 'archetype': return 'bg-amber-500/20 text-amber-300';
          case 'bound': return 'bg-blue-500/20 text-blue-300';
          case 'agent': return 'bg-violet-500/20 text-violet-300';
          case 'status': return 'bg-emerald-500/20 text-emerald-300';
          case 'house': return 'bg-rose-500/20 text-rose-300';
          case 'channel': return 'bg-sky-500/20 text-sky-300';
          case 'ring': return 'bg-indigo-500/20 text-indigo-300';
          case 'concept': return 'bg-violet-500/20 text-violet-300';
          case 'operation': return 'bg-orange-500/20 text-orange-300';
          case 'relationship': return 'bg-pink-500/20 text-pink-300';
          case 'phase': return 'bg-teal-500/20 text-teal-300';
          case 'function': return 'bg-lime-500/20 text-lime-300';
          case 'pillar': return 'bg-yellow-500/20 text-yellow-300';
          case 'role': return 'bg-fuchsia-500/20 text-fuchsia-300';
          default: return 'bg-zinc-500/20 text-zinc-300';
        }
      };

      const typeLabel = glossary.type ? glossary.type.charAt(0).toUpperCase() + glossary.type.slice(1) : 'Concept';

      return (
        <>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold text-zinc-100">{glossary.name}</h3>
              {glossary.traditional && (
                <p className="text-sm text-zinc-500">{glossary.traditional}</p>
              )}
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">×</button>
          </div>

          <div className="mb-4">
            <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(glossary.type)}`}>
              {typeLabel}
            </span>
            {glossary.element && (
              <span className="text-xs text-zinc-500 ml-2">{glossary.element}</span>
            )}
            {glossary.position !== undefined && (
              <span className="text-xs text-zinc-500 ml-2">Position {glossary.position}</span>
            )}
          </div>

          <p className="text-sm text-zinc-300 mb-4 leading-relaxed">
            {renderWithHotlinks(glossary.short || glossary.description || '', setSelectedInfo, showTraditional)}
          </p>

          {glossary.verb && (
            <div className="border-t border-zinc-700/50 pt-4 mb-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Core Verb</p>
              <p className="text-sm text-violet-300 font-medium">{glossary.verb}</p>
            </div>
          )}

          {glossary.command && (
            <div className="border-t border-zinc-700/50 pt-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Command</p>
              <p className="text-sm text-amber-300 italic">"{glossary.command}"</p>
            </div>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 rounded-lg border border-zinc-700 max-w-md w-full max-h-[80vh] overflow-y-auto info-modal-scroll"
        onClick={e => e.stopPropagation()}
        onWheel={e => e.stopPropagation()}
        style={{ overscrollBehavior: 'contain' }}
      >
        <style jsx>{`
          .info-modal-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .info-modal-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .info-modal-scroll::-webkit-scrollbar-thumb {
            background: rgba(63, 63, 70, 0.5);
            border-radius: 3px;
          }
          .info-modal-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(82, 82, 91, 0.7);
          }
        `}</style>
        {/* Navigation bar - shows back button when there's history */}
        {canGoBack && (
          <div className="flex items-center gap-2 px-5 pt-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGoBack();
              }}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Go back to previous card"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>
        )}
        <div className={canGoBack ? "p-5 pt-2" : "p-5"}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
