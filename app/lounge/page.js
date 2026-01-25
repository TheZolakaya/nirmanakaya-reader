'use client';

// === THE LOUNGE ===
// Real-time chat sanctuary for the Nirmanakaya community
// Design: "The Hearth" - warm amber glows against deep shadow

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getUser,
  getProfile,
  getChatRooms,
  getChatMessages,
  sendChatMessage,
  subscribeToRoom,
  subscribeToPresence,
  trackPresence,
  broadcastTyping,
  onTyping
} from '../../lib/supabase';
import { VERSION } from '../../lib/version';

// Presence dot - softly pulsing like a heartbeat
function PresenceDot({ delay = 0 }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full bg-emerald-400"
      style={{
        animation: `pulse-glow 3s ease-in-out ${delay}s infinite`,
      }}
    />
  );
}

// Room item in sidebar
function RoomItem({ room, isActive, onClick, unreadCount = 0 }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3 rounded-lg transition-all duration-300
        ${isActive
          ? 'bg-gradient-to-r from-amber-900/40 to-amber-800/20 border-l-2 border-amber-500 shadow-lg shadow-amber-900/20'
          : 'hover:bg-zinc-800/50 border-l-2 border-transparent'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-lg ${isActive ? 'text-amber-400' : 'text-zinc-500'}`}>
            #
          </span>
          <span className={`font-medium ${isActive ? 'text-zinc-100' : 'text-zinc-400'}`}>
            {room.name}
          </span>
        </div>
        {unreadCount > 0 && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400">
            {unreadCount}
          </span>
        )}
      </div>
      {room.description && (
        <p className={`text-xs mt-1 ${isActive ? 'text-zinc-400' : 'text-zinc-600'}`}>
          {room.description}
        </p>
      )}
    </button>
  );
}

// Single message component
function ChatMessage({ message, isOwn, isFirst }) {
  const time = new Date(message.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`group flex gap-3 px-4 py-2 hover:bg-zinc-800/30 transition-colors ${
        isFirst ? 'mt-4' : ''
      }`}
    >
      {/* Avatar placeholder - first letter */}
      <div className={`
        flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center
        ${isOwn
          ? 'bg-gradient-to-br from-amber-600/40 to-amber-800/40 text-amber-300'
          : 'bg-gradient-to-br from-zinc-700/60 to-zinc-800/60 text-zinc-300'
        }
        text-sm font-medium shadow-inner
      `}>
        {(message.profiles?.display_name || 'A')[0].toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={`font-medium text-sm ${isOwn ? 'text-amber-400' : 'text-zinc-200'}`}>
            {message.profiles?.display_name || 'Anonymous'}
          </span>
          <span className="text-xs text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
            {time}
          </span>
        </div>
        <p className="text-zinc-300 text-sm leading-relaxed mt-0.5 break-words">
          {message.content}
        </p>
      </div>
    </motion.div>
  );
}

// Typing indicator
function TypingIndicator({ users }) {
  if (users.length === 0) return null;

  const text = users.length === 1
    ? `${users[0]} is typing`
    : users.length === 2
      ? `${users[0]} and ${users[1]} are typing`
      : `${users[0]} and ${users.length - 1} others are typing`;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="px-4 py-2 text-zinc-500 text-xs flex items-center gap-2"
    >
      <span className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
      {text}
    </motion.div>
  );
}

// Online users panel
function OnlinePanel({ users, isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="absolute right-0 top-0 bottom-0 w-64 bg-zinc-900/95 border-l border-zinc-800/50 backdrop-blur-sm z-10"
        >
          <div className="p-4 border-b border-zinc-800/50">
            <div className="flex items-center justify-between">
              <h3 className="text-zinc-300 font-medium">Online Now</h3>
              <button
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {users.length === 0 ? (
              <p className="text-zinc-600 text-sm">No one else is here yet...</p>
            ) : (
              users.map((user, i) => (
                <div key={user.user_id || i} className="flex items-center gap-3">
                  <PresenceDot delay={i * 0.5} />
                  <span className="text-zinc-300 text-sm">{user.display_name}</span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function LoungePage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showOnlinePanel, setShowOnlinePanel] = useState(false);
  const [showMobileRooms, setShowMobileRooms] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const channelRef = useRef(null);
  const presenceChannelRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load initial data
  useEffect(() => {
    async function init() {
      const { user } = await getUser();
      setUser(user);

      if (user) {
        const { data: profileData } = await getProfile();
        setProfile(profileData);
      }

      const { data: roomsData } = await getChatRooms();
      if (roomsData?.length > 0) {
        setRooms(roomsData);
        // Select default room or first room
        const defaultRoom = roomsData.find(r => r.is_default) || roomsData[0];
        setActiveRoom(defaultRoom);
      }

      setLoading(false);
    }
    init();
  }, []);

  // Load messages when room changes
  useEffect(() => {
    if (!activeRoom) return;

    async function loadMessages() {
      const { data } = await getChatMessages(activeRoom.id, 100);
      setMessages(data || []);
      setTimeout(scrollToBottom, 100);
    }
    loadMessages();
  }, [activeRoom, scrollToBottom]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!activeRoom || !user) return;

    // Clean up previous subscriptions
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }
    if (presenceChannelRef.current) {
      presenceChannelRef.current.unsubscribe();
    }

    // Subscribe to new messages
    channelRef.current = subscribeToRoom(activeRoom.id, (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
      setTimeout(scrollToBottom, 100);
    });

    // Subscribe to presence
    presenceChannelRef.current = subscribeToPresence(activeRoom.id, (users) => {
      setOnlineUsers(users.filter(u => u.user_id !== user.id));
    });

    // Track our presence
    setTimeout(() => {
      if (presenceChannelRef.current) {
        trackPresence(presenceChannelRef.current, user, profile?.display_name);
      }
    }, 1000);

    // Subscribe to typing events
    if (presenceChannelRef.current) {
      onTyping(presenceChannelRef.current, ({ user: typingUser, timestamp }) => {
        // Add typing user if not already in list
        setTypingUsers(prev => {
          if (prev.includes(typingUser)) return prev;
          return [...prev, typingUser];
        });
        // Remove after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u !== typingUser));
        }, 3000);
      });
    }

    return () => {
      channelRef.current?.unsubscribe();
      presenceChannelRef.current?.unsubscribe();
    };
  }, [activeRoom, user, profile, scrollToBottom]);

  // Handle sending a message
  async function handleSend() {
    if (!inputValue.trim() || !activeRoom || sending) return;

    setSending(true);
    const { error } = await sendChatMessage(activeRoom.id, inputValue);

    if (!error) {
      setInputValue('');
      inputRef.current?.focus();
    }
    setSending(false);
  }

  // Handle typing indicator
  function handleInputChange(e) {
    setInputValue(e.target.value);

    // Broadcast typing
    if (presenceChannelRef.current && profile?.display_name) {
      // Debounce typing broadcast
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      broadcastTyping(presenceChannelRef.current, profile.display_name);
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null;
      }, 2000);
    }
  }

  // Handle key press
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 flex items-center gap-3">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Entering the Lounge...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-800/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-zinc-400 hover:text-zinc-200 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-light tracking-wide text-zinc-100">
                The Lounge
              </h1>
              <p className="text-xs text-zinc-600">A gathering place for seekers</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Online count */}
            <button
              onClick={() => setShowOnlinePanel(!showOnlinePanel)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
            >
              <PresenceDot />
              <span className="text-sm text-zinc-400">
                {onlineUsers.length + 1} online
              </span>
            </button>

            {/* Mobile room toggle */}
            <button
              onClick={() => setShowMobileRooms(!showMobileRooms)}
              className="lg:hidden p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Room sidebar - desktop */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-zinc-800/50 bg-zinc-900/30">
          <div className="p-4 border-b border-zinc-800/30">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Rooms</h2>
          </div>
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {rooms.map(room => (
              <RoomItem
                key={room.id}
                room={room}
                isActive={activeRoom?.id === room.id}
                onClick={() => setActiveRoom(room)}
              />
            ))}
          </nav>
          <div className="p-4 border-t border-zinc-800/30">
            <p className="text-xs text-zinc-600">v{VERSION}</p>
          </div>
        </aside>

        {/* Mobile room drawer */}
        <AnimatePresence>
          {showMobileRooms && (
            <motion.aside
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className="absolute inset-y-0 left-0 z-20 w-64 border-r border-zinc-800/50 bg-zinc-900/95 backdrop-blur-sm lg:hidden"
            >
              <div className="p-4 border-b border-zinc-800/30 flex items-center justify-between">
                <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Rooms</h2>
                <button
                  onClick={() => setShowMobileRooms(false)}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="p-2 space-y-1">
                {rooms.map(room => (
                  <RoomItem
                    key={room.id}
                    room={room}
                    isActive={activeRoom?.id === room.id}
                    onClick={() => {
                      setActiveRoom(room);
                      setShowMobileRooms(false);
                    }}
                  />
                ))}
              </nav>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Chat area */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          {/* Room header */}
          <div className="px-4 py-3 border-b border-zinc-800/30 bg-zinc-900/20">
            <div className="flex items-center gap-2">
              <span className="text-amber-500 text-lg">#</span>
              <h2 className="font-medium text-zinc-100">{activeRoom?.name || 'General'}</h2>
            </div>
            {activeRoom?.description && (
              <p className="text-xs text-zinc-500 mt-1">{activeRoom.description}</p>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            {!user ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-zinc-300 font-medium mb-2">Join the conversation</h3>
                <p className="text-zinc-500 text-sm mb-4">Sign in to send messages and connect with others</p>
                <button
                  onClick={() => window.dispatchEvent(new Event('open-auth-modal'))}
                  className="px-6 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors"
                >
                  Sign In
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-16 h-16 rounded-full bg-amber-900/20 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <h3 className="text-zinc-300 font-medium mb-2">Start the conversation</h3>
                <p className="text-zinc-500 text-sm">Be the first to share your thoughts in #{activeRoom?.name}</p>
              </div>
            ) : (
              <div className="py-4">
                {messages.map((msg, i) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isOwn={msg.user_id === user?.id}
                    isFirst={i === 0 || messages[i - 1]?.user_id !== msg.user_id}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Typing indicator */}
          <AnimatePresence>
            <TypingIndicator users={typingUsers} />
          </AnimatePresence>

          {/* Input */}
          {user && (
            <div className="p-4 border-t border-zinc-800/30 bg-zinc-900/30">
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message #${activeRoom?.name || 'general'}...`}
                  className="flex-1 px-4 py-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/20 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || sending}
                  className="px-5 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center gap-2"
                >
                  {sending ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Online panel */}
          <OnlinePanel
            users={onlineUsers}
            isOpen={showOnlinePanel}
            onClose={() => setShowOnlinePanel(false)}
          />
        </main>
      </div>

      {/* Keyframe animation for presence dots */}
      <style jsx global>{`
        @keyframes pulse-glow {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 8px rgba(52, 211, 153, 0.4);
          }
          50% {
            opacity: 0.6;
            box-shadow: 0 0 4px rgba(52, 211, 153, 0.2);
          }
        }
      `}</style>
    </div>
  );
}
