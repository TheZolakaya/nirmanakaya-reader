'use client';

// === CHAT MODE ===
// "Dear Reader" — conversational AI grounded by field draws
// Hidden route: /chat — not linked from nav
// Each AI response is shaped by a random draw from the full 78 signatures
// Optional: click to reveal what the field drew

import { useState, useRef, useEffect } from 'react';
import { ARCHETYPES, BOUNDS, AGENTS } from '../../lib/archetypes';
import { getCardImagePath } from '../../lib/cardImages';

function getSignatureName(id) {
  if (ARCHETYPES[id]) return ARCHETYPES[id];
  if (BOUNDS[id]) return BOUNDS[id];
  if (AGENTS[id]) return AGENTS[id];
  return null;
}

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [draws, setDraws] = useState({}); // messageIndex → draw data
  const [revealedDraws, setRevealedDraws] = useState({}); // messageIndex → boolean
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });
      const data = await res.json();

      if (data.error) {
        setMessages([...newMessages, { role: 'assistant', content: `Something went wrong: ${data.error}` }]);
      } else {
        const assistantMessage = { role: 'assistant', content: data.reply };
        setMessages([...newMessages, assistantMessage]);
        // Store the draw data for this response
        if (data.draw) {
          setDraws(prev => ({ ...prev, [newMessages.length]: data.draw }));
        }
      }
    } catch (e) {
      setMessages([...newMessages, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    }

    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const toggleReveal = (index) => {
    setRevealedDraws(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800/50 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-medium text-zinc-300">Dear Reader</h1>
          <p className="text-[10px] text-zinc-600">Speak freely. The field is listening.</p>
        </div>
        <a href="/" className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">
          ← Back
        </a>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-sm mb-2">What's on your mind?</p>
            <p className="text-zinc-700 text-xs">No topic is too small or too big.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-zinc-800 text-zinc-200 rounded-br-sm'
                  : 'bg-zinc-900/50 text-zinc-300 border border-zinc-800/50 rounded-bl-sm'
              }`}>
                {msg.content.split('\n').map((line, j) => (
                  <p key={j} className={j > 0 ? 'mt-2' : ''}>{line}</p>
                ))}
              </div>
            </div>

            {/* Reveal button — only for assistant messages with draws */}
            {msg.role === 'assistant' && draws[i] && (
              <div className="flex justify-start mt-1 ml-1">
                <button
                  onClick={() => toggleReveal(i)}
                  className="text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors"
                >
                  {revealedDraws[i] ? 'hide field draw' : '◇ what did the field draw?'}
                </button>
              </div>
            )}

            {/* Draw reveal */}
            {msg.role === 'assistant' && draws[i] && revealedDraws[i] && (
              <div className="flex justify-start mt-1 ml-1">
                <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-lg px-3 py-2 max-w-[85%] flex items-start gap-3">
                  {/* Card image */}
                  {getCardImagePath(draws[i].transientId) && (
                    <div className="w-10 h-14 rounded overflow-hidden border border-zinc-700 flex-shrink-0">
                      <img
                        src={getCardImagePath(draws[i].transientId)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="text-[11px] text-zinc-500 space-y-0.5">
                    <p>
                      <span className="text-zinc-400">{draws[i].transientName}</span>
                      {draws[i].transientTraditional && (
                        <span className="text-zinc-600"> ({draws[i].transientTraditional})</span>
                      )}
                    </p>
                    <p>
                      Landed in <span className="text-zinc-400">{draws[i].durableName}</span>
                      <span className="text-zinc-600"> ({draws[i].durableHouse})</span>
                    </p>
                    <p>
                      Status: <span className={
                        draws[i].statusName === 'Balanced' ? 'text-emerald-500' :
                        draws[i].statusName === 'Too Much' ? 'text-amber-500' :
                        draws[i].statusName === 'Too Little' ? 'text-blue-400' :
                        'text-purple-400'
                      }>{draws[i].statusName}</span>
                    </p>
                    <p>
                      Rebalancer: <span className="text-zinc-400">{draws[i].rebalancerName}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-pulse" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800/50 px-4 py-3 max-w-2xl mx-auto w-full">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type here..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-700 transition-colors"
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 rounded-full bg-zinc-800 text-zinc-400 text-sm hover:bg-zinc-700 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Send
          </button>
        </div>
        <p className="text-center text-[9px] text-zinc-700 mt-2">
          Each response is shaped by a draw from the field
        </p>
      </div>
    </div>
  );
}
