// === UNIVERSAL INFO MODAL COMPONENT ===
// Modal popup for displaying card, channel, house, status, role, AND glossary concept information

import { ARCHETYPES } from '../../lib/archetypes.js';
import { CHANNELS, HOUSES, ROLES, STATUS_INFO, HOUSE_COLORS, STATUS_COLORS, CHANNEL_COLORS } from '../../lib/constants.js';
import { getAssociatedCards } from '../../lib/corrections.js';
import { renderWithHotlinks } from '../../lib/hotlinks.js';
import ClickableTermContext from './ClickableTermContext.js';

const InfoModal = ({ info, onClose, setSelectedInfo }) => {
  if (!info) return null;

  const { type, id, data } = info;

  // Local ClickableTerm that has access to setSelectedInfo
  const ClickableTerm = ({ type: termType, id: termId, children }) => (
    <ClickableTermContext type={termType} id={termId} setSelectedInfo={setSelectedInfo}>
      {children}
    </ClickableTermContext>
  );

  // Render based on type
  const renderContent = () => {
    if (type === 'card') {
      const component = data;
      const isArchetype = component.type === "Archetype";
      const isBound = component.type === "Bound";
      const isAgent = component.type === "Agent";
      const associatedArchetype = (isBound || isAgent) ? ARCHETYPES[component.archetype] : null;
      const associations = isArchetype ? getAssociatedCards(id) : null;

      return (
        <>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold text-zinc-100">{component.name}</h3>
              <p className="text-sm text-zinc-500">{component.traditional}</p>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">×</button>
          </div>

          <div className="mb-4">
            <span className={`text-xs px-2 py-1 rounded-full ${
              isArchetype ? 'bg-amber-500/20 text-amber-300' :
              isBound ? 'bg-blue-500/20 text-blue-300' :
              'bg-violet-500/20 text-violet-300'
            }`}>
              {component.type}
            </span>
            {isArchetype && (
              <span className="text-xs text-zinc-500 ml-2">
                <ClickableTerm type="house" id={component.house}>{component.house}</ClickableTerm> House • {component.function}
              </span>
            )}
            {isBound && (
              <span className="text-xs text-zinc-500 ml-2">
                <ClickableTerm type="channel" id={component.channel}>{component.channel}</ClickableTerm> • {component.number <= 5 ? 'Inner' : 'Outer'} Bound
              </span>
            )}
            {isAgent && (
              <span className="text-xs text-zinc-500 ml-2">
                <ClickableTerm type="role" id={component.role}>{component.role}</ClickableTerm> • <ClickableTerm type="channel" id={component.channel}>{component.channel}</ClickableTerm>
              </span>
            )}
          </div>

          <p className="text-sm text-zinc-300 mb-4 leading-relaxed">
            {renderWithHotlinks(component.extended || component.description, setSelectedInfo)}
          </p>

          {associatedArchetype && (
            <div className="border-t border-zinc-700/50 pt-4 mb-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                {isBound ? 'Expresses' : 'Embodies'}
              </p>
              <p className="text-sm text-zinc-300">
                <ClickableTerm type="card" id={component.archetype}>{associatedArchetype.name}</ClickableTerm>
                <span className="text-zinc-500"> — {associatedArchetype.description}</span>
              </p>
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
            <span className={`text-xs px-2 py-1 rounded-full bg-opacity-20 ${CHANNEL_COLORS[id]}`}>
              Channel
            </span>
          </div>

          <p className="text-sm text-zinc-300 mb-4 leading-relaxed">{renderWithHotlinks(channel.extended, setSelectedInfo)}</p>
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
            <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[id]}`}>
              Status
            </span>
          </div>

          <p className="text-sm text-zinc-300 mb-4 leading-relaxed">{renderWithHotlinks(status.extended, setSelectedInfo)}</p>
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
            <span className={`text-xs px-2 py-1 rounded-full ${houseColors?.bg} ${houseColors?.text}`}>
              House
            </span>
          </div>

          <p className="text-sm text-zinc-300 mb-4 leading-relaxed">{renderWithHotlinks(house.extended, setSelectedInfo)}</p>

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
            <span className="text-xs px-2 py-1 rounded-full bg-violet-500/20 text-violet-300">
              Agent Role
            </span>
          </div>

          <p className="text-sm text-zinc-300 mb-4 leading-relaxed">{renderWithHotlinks(role.extended, setSelectedInfo)}</p>
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
            {renderWithHotlinks(glossary.short || glossary.description || '', setSelectedInfo)}
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
      <div className="bg-zinc-900 rounded-xl border border-zinc-700 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
