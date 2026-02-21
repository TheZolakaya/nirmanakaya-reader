'use client';

// === CHAT MODE ===
// "Dear Reader" — conversational AI with five-house consciousness middleware
// Hidden route: /chat — not linked from nav
// Each AI response is:
//   1. Generated vanilla
//   2. Read by five draws (one per house)
//   3. Revised with structural self-awareness
// Optional: click to reveal the five-house reading

import { useState, useRef, useEffect } from 'react';
import { getCardImagePath } from '../../lib/cardImages';

const HOUSE_LABELS = {
  Mind: { label: 'Mind', color: 'text-sky-400' },
  Emotion: { label: 'Emotion', color: 'text-rose-400' },
  Spirit: { label: 'Spirit', color: 'text-violet-400' },
  Body: { label: 'Body', color: 'text-emerald-400' },
  Gestalt: { label: 'Gestalt', color: 'text-amber-400' }
};

const STATUS_COLORS = {
  'Balanced': 'text-emerald-500',
  'Too Much': 'text-amber-500',
  'Too Little': 'text-blue-400',
  'Unacknowledged': 'text-purple-400'
};

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [draws, setDraws] = useState({}); // messageIndex → { Mind: draw, Emotion: draw, ... }
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
        // Store draws (five-house or legacy single)
        if (data.draws) {
          setDraws(prev => ({ ...prev, [newMessages.length]: data.draws }));
        } else if (data.draw) {
          // Legacy single-draw compat
          setDraws(prev => ({ ...prev, [newMessages.length]: { single: data.draw } }));
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

  const renderHouseDraw = (house, draw) => {
    if (!draw) return null;
    const hl = HOUSE_LABELS[house] || { label: house, color: 'text-zinc-400' };
    return (
      <div key={house} className="flex items-start gap-2 py-1.5">
        {getCardImagePath(draw.transientId) && (
          <div className="w-7 h-10 rounded overflow-hidden border border-zinc-700/50 flex-shrink-0">
            <img
              src={getCardImagePath(draw.transientId)}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="text-[10px] leading-relaxed">
          <p>
            <span className={`font-medium ${hl.color}`}>{hl.label}</span>
            <span className="text-zinc-600"> — </span>
            <span className="text-zinc-400">{draw.transientName}</span>
            {draw.transientTraditional && (
              <span className="text-zinc-600"> ({draw.transientTraditional})</span>
            )}
          </p>
          <p className="text-zinc-600">
            in {draw.durableName}
            <span className="mx-1">·</span>
            <span className={STATUS_COLORS[draw.statusName] || 'text-zinc-500'}>{draw.statusName}</span>
            <span className="mx-1">·</span>
            <span className="text-zinc-500">{draw.rebalancerName}</span>
          </p>
        </div>
      </div>
    );
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
                  {revealedDraws[i] ? 'hide field reading' : '◇ what did the field see?'}
                </button>
              </div>
            )}

            {/* Five-house draw reveal */}
            {msg.role === 'assistant' && draws[i] && revealedDraws[i] && (
              <div className="flex justify-start mt-1 ml-1">
                <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-lg px-3 py-2 max-w-[90%]">
                  <p className="text-[9px] text-zinc-600 mb-1.5 uppercase tracking-wider">Five-House Reading on AI Response</p>
                  <div className="divide-y divide-zinc-800/50">
                    {Object.entries(draws[i]).map(([house, draw]) =>
                      renderHouseDraw(house, draw)
                    )}
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
          Each response is shaped by a five-house reading from the field
        </p>
      </div>
    </div>
  );
}
