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
  onTyping,
  createChatRoom,
  deleteChatRoom,
  getRoomMembers,
  inviteToRoom,
  searchUsers,
  removeFromRoom,
  isRoomMember,
  getMyRooms
} from '../../lib/supabase';
import { VERSION } from '../../lib/version';

// === BACKGROUND VIDEOS & IMAGES (shared with Reader) ===
const BACKGROUND_VIDEOS = [
  { id: 'clouds', name: 'Clouds', url: 'https://videos.pexels.com/video-files/857195/857195-hd_1920_1080_25fps.mp4' },
  { id: 'aurora', name: 'Aurora', url: 'https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4' },
  { id: 'waves', name: 'Waves', url: 'https://videos.pexels.com/video-files/1093662/1093662-hd_1920_1080_30fps.mp4' },
  { id: 'rain', name: 'Rain', url: 'https://videos.pexels.com/video-files/3045176/3045176-hd_1920_1080_24fps.mp4' },
  { id: 'stars', name: 'Stars', url: 'https://videos.pexels.com/video-files/857251/857251-hd_1920_1080_25fps.mp4' },
  { id: 'forest', name: 'Forest', url: 'https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4' },
  { id: 'fire', name: 'Fire', url: 'https://videos.pexels.com/video-files/856973/856973-hd_1920_1080_25fps.mp4' },
  { id: 'water', name: 'Water', url: 'https://videos.pexels.com/video-files/1093662/1093662-hd_1920_1080_30fps.mp4' },
];

const BACKGROUND_IMAGES = [
  { id: 'cosmos1', name: 'Deep Space', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920' },
  { id: 'cosmos2', name: 'Nebula', url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920' },
  { id: 'mountain', name: 'Mountain', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920' },
  { id: 'ocean', name: 'Ocean', url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1920' },
  { id: 'forest', name: 'Forest', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920' },
  { id: 'desert', name: 'Desert', url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920' },
  { id: 'temple', name: 'Temple', url: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1920' },
  { id: 'abstract', name: 'Abstract', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920' },
];

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
function RoomItem({ room, isActive, onClick, unreadCount = 0, isOwner = false }) {
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
          {room.is_private ? (
            <svg className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-zinc-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ) : (
            <span className={`text-lg ${isActive ? 'text-amber-400' : 'text-zinc-500'}`}>
              #
            </span>
          )}
          <span className={`font-medium ${isActive ? 'text-zinc-100' : 'text-zinc-400'}`}>
            {room.name}
          </span>
          {isOwner && (
            <span className="text-xs text-amber-600">owner</span>
          )}
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

// Create Room Modal
function CreateRoomModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!name.trim()) {
      setError('Room name is required');
      return;
    }
    setError('');
    setCreating(true);

    const { data, error: createError } = await createChatRoom(name, description, isPrivate);

    if (createError) {
      setError(createError.message || 'Failed to create room');
      setCreating(false);
      return;
    }

    setName('');
    setDescription('');
    setIsPrivate(false);
    setCreating(false);
    onCreate(data);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl"
      >
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-zinc-100">Create Room</h2>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Room Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-room"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-600/50"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this room about?"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-600/50"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                isPrivate ? 'bg-amber-600' : 'bg-zinc-700'
              }`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                isPrivate ? 'left-6' : 'left-1'
              }`} />
            </button>
            <div>
              <span className="text-zinc-200 text-sm">Private Room</span>
              <p className="text-xs text-zinc-500">Only invited members can see and join</p>
            </div>
          </div>

          {error && (
            <p className="text-rose-400 text-sm">{error}</p>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Room Settings Panel (for owners)
function RoomSettingsPanel({ room, isOpen, onClose, onInvite, onDelete, onLeave, isOwner, members, user }) {
  const [inviteQuery, setInviteQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState(null);

  async function handleSearch(query) {
    setInviteQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data } = await searchUsers(query);
    // Filter out users already in room
    const memberIds = members.map(m => m.user_id);
    setSearchResults(data.filter(u => !memberIds.includes(u.id)));
    setSearching(false);
  }

  async function handleInvite(userId) {
    setInviting(userId);
    await onInvite(userId);
    setSearchResults(prev => prev.filter(u => u.id !== userId));
    setInviting(null);
    setInviteQuery('');
  }

  if (!isOpen || !room) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="absolute right-0 top-0 bottom-0 w-72 bg-zinc-900/95 border-l border-zinc-800/50 backdrop-blur-sm z-20 flex flex-col"
      >
        <div className="p-4 border-b border-zinc-800/50">
          <div className="flex items-center justify-between">
            <h3 className="text-zinc-300 font-medium">Room Settings</h3>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-zinc-500 mt-1">{room.name}</p>
        </div>

        {/* Members section */}
        <div className="flex-1 overflow-y-auto p-4">
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
            Members ({members.length})
          </h4>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.user_id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-xs">
                    {(member.profiles?.display_name || 'A')[0].toUpperCase()}
                  </div>
                  <span className="text-zinc-300 text-sm">
                    {member.profiles?.display_name || 'Anonymous'}
                  </span>
                  {member.role === 'owner' && (
                    <span className="text-xs text-amber-600">owner</span>
                  )}
                </div>
                {isOwner && member.user_id !== user?.id && (
                  <button
                    onClick={() => onInvite(member.user_id, true)}
                    className="text-zinc-600 hover:text-rose-400 text-xs"
                    title="Remove member"
                  >
                    remove
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Invite section (for private rooms) */}
          {room.is_private && isOwner && (
            <div className="mt-6">
              <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                Invite Members
              </h4>
              <input
                type="text"
                value={inviteQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by name..."
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-600/50"
              />
              {searching && (
                <p className="text-zinc-500 text-xs mt-2">Searching...</p>
              )}
              {searchResults.length > 0 && (
                <div className="mt-2 space-y-1">
                  {searchResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between py-1.5 px-2 bg-zinc-800/50 rounded">
                      <span className="text-zinc-300 text-sm">{result.display_name}</span>
                      <button
                        onClick={() => handleInvite(result.id)}
                        disabled={inviting === result.id}
                        className="text-amber-400 hover:text-amber-300 text-xs disabled:opacity-50"
                      >
                        {inviting === result.id ? '...' : 'invite'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-zinc-800/50 space-y-2">
          {!room.is_default && (
            <>
              {isOwner ? (
                <button
                  onClick={onDelete}
                  className="w-full px-4 py-2 text-rose-400 hover:bg-rose-900/20 rounded-lg text-sm transition-colors"
                >
                  Delete Room
                </button>
              ) : (
                <button
                  onClick={onLeave}
                  className="w-full px-4 py-2 text-zinc-400 hover:bg-zinc-800 rounded-lg text-sm transition-colors"
                >
                  Leave Room
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
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
  // Room management state
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [roomMembers, setRoomMembers] = useState([]);
  const [myRooms, setMyRooms] = useState({}); // { roomId: role }

  // === BACKGROUND & THEME STATE (shared with Reader preferences) ===
  const [theme, setTheme] = useState('dark');
  const [backgroundType, setBackgroundType] = useState('video');
  const [backgroundOpacity, setBackgroundOpacity] = useState(30);
  const [contentDim, setContentDim] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showBgControls, setShowBgControls] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const channelRef = useRef(null);
  const presenceChannelRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load preferences from localStorage (shared with Reader)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nirmanakaya_prefs');
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.theme) setTheme(prefs.theme);
        if (prefs.backgroundType) setBackgroundType(prefs.backgroundType);
        if (typeof prefs.backgroundOpacity === 'number') setBackgroundOpacity(prefs.backgroundOpacity);
        if (typeof prefs.contentDim === 'number') setContentDim(prefs.contentDim);
        if (typeof prefs.selectedVideo === 'number') setSelectedVideo(prefs.selectedVideo);
        if (typeof prefs.selectedImage === 'number') setSelectedImage(prefs.selectedImage);
      }
    } catch (e) {
      console.warn('Failed to load preferences:', e);
    }
  }, []);

  // Save preferences when they change
  useEffect(() => {
    try {
      const prefs = {
        theme,
        backgroundType,
        backgroundOpacity,
        contentDim,
        selectedVideo,
        selectedImage,
      };
      localStorage.setItem('nirmanakaya_prefs', JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save preferences:', e);
    }
  }, [theme, backgroundType, backgroundOpacity, contentDim, selectedVideo, selectedImage]);

  // Load initial data
  useEffect(() => {
    async function init() {
      try {
        const { user } = await getUser();
        setUser(user);

        if (user) {
          const { data: profileData } = await getProfile();
          setProfile(profileData);

          // Load user's room memberships (may fail if RLS not set up)
          try {
            const { data: myRoomsData, error: myRoomsError } = await getMyRooms();
            if (myRoomsError) {
              console.warn('Failed to load room memberships:', myRoomsError);
            } else if (myRoomsData) {
              const roleMap = {};
              myRoomsData.forEach(r => { roleMap[r.id] = r.myRole; });
              setMyRooms(roleMap);
            }
          } catch (e) {
            console.warn('Room memberships unavailable:', e);
          }
        }

        const { data: roomsData, error: roomsError } = await getChatRooms();
        if (roomsError) {
          console.error('Failed to load rooms:', roomsError);
        } else if (roomsData?.length > 0) {
          setRooms(roomsData);
          // Select default room or first room
          const defaultRoom = roomsData.find(r => r.is_default) || roomsData[0];
          setActiveRoom(defaultRoom);
        }
      } catch (e) {
        console.error('Failed to initialize lounge:', e);
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

  // Room management handlers
  async function handleCreateRoom(newRoom) {
    setRooms(prev => [...prev, newRoom]);
    setMyRooms(prev => ({ ...prev, [newRoom.id]: 'owner' }));
    setActiveRoom(newRoom);
  }

  async function handleDeleteRoom() {
    if (!activeRoom || activeRoom.is_default) return;
    if (!window.confirm(`Delete "${activeRoom.name}"? This cannot be undone.`)) return;

    const { error } = await deleteChatRoom(activeRoom.id);
    if (!error) {
      setRooms(prev => prev.filter(r => r.id !== activeRoom.id));
      setActiveRoom(rooms.find(r => r.is_default) || rooms[0]);
      setShowRoomSettings(false);
    }
  }

  async function handleLeaveRoom() {
    if (!activeRoom || activeRoom.is_default) return;
    if (!window.confirm(`Leave "${activeRoom.name}"?`)) return;

    const { error } = await removeFromRoom(activeRoom.id);
    if (!error) {
      setRooms(prev => prev.filter(r => r.id !== activeRoom.id));
      setMyRooms(prev => {
        const updated = { ...prev };
        delete updated[activeRoom.id];
        return updated;
      });
      setActiveRoom(rooms.find(r => r.is_default) || rooms[0]);
      setShowRoomSettings(false);
    }
  }

  async function handleInviteMember(userId, isRemove = false) {
    if (!activeRoom) return;

    if (isRemove) {
      const { error } = await removeFromRoom(activeRoom.id, userId);
      if (!error) {
        setRoomMembers(prev => prev.filter(m => m.user_id !== userId));
      }
    } else {
      const { data, error } = await inviteToRoom(activeRoom.id, userId);
      if (!error && data) {
        // Reload members
        const { data: members } = await getRoomMembers(activeRoom.id);
        setRoomMembers(members || []);
      }
    }
  }

  async function openRoomSettings() {
    if (!activeRoom) return;
    const { data: members } = await getRoomMembers(activeRoom.id);
    setRoomMembers(members || []);
    setShowRoomSettings(true);
    setShowOnlinePanel(false);
  }

  // Background navigation
  function nextBackground() {
    if (backgroundType === 'video') {
      setSelectedVideo((prev) => (prev + 1) % BACKGROUND_VIDEOS.length);
    } else {
      setSelectedImage((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }
  }

  function prevBackground() {
    if (backgroundType === 'video') {
      setSelectedVideo((prev) => (prev - 1 + BACKGROUND_VIDEOS.length) % BACKGROUND_VIDEOS.length);
    } else {
      setSelectedImage((prev) => (prev - 1 + BACKGROUND_IMAGES.length) % BACKGROUND_IMAGES.length);
    }
  }

  // Check if current user is owner of active room
  const isRoomOwner = activeRoom && myRooms[activeRoom.id] === 'owner';

  // Get current background name
  const currentBgName = backgroundType === 'video'
    ? BACKGROUND_VIDEOS[selectedVideo]?.name
    : BACKGROUND_IMAGES[selectedImage]?.name;

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
    <div
      className={`min-h-screen flex flex-col ${theme === 'light' ? 'bg-stone-200 text-stone-900' : 'bg-zinc-950 text-zinc-100'}`}
      data-theme={theme}
      style={{ '--content-dim': contentDim / 100 }}
    >
      {/* Video Background */}
      {backgroundType === 'video' && (
        <div className="fixed inset-0 z-0 overflow-hidden">
          <video
            key={BACKGROUND_VIDEOS[selectedVideo]?.url}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: backgroundOpacity / 100 }}
          >
            <source src={BACKGROUND_VIDEOS[selectedVideo]?.url} type="video/mp4" />
          </video>
          <div className={`absolute inset-0 ${theme === 'light' ? 'bg-stone-100/60' : 'bg-zinc-950/60'}`} />
        </div>
      )}

      {/* Image Background */}
      {backgroundType === 'image' && (
        <div className="fixed inset-0 z-0 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${BACKGROUND_IMAGES[selectedImage]?.url})`,
              opacity: backgroundOpacity / 100,
            }}
          />
          <div className={`absolute inset-0 ${theme === 'light' ? 'bg-stone-100/60' : 'bg-zinc-950/60'}`} />
        </div>
      )}

      {/* Main NIRMANAKAYA header */}
      <div className="content-pane relative z-10 text-center py-6 border-b border-zinc-800/30 bg-zinc-900/50 backdrop-blur-sm">
        <Link href="/" className="inline-block">
          <h1 className="text-[1.25rem] sm:text-2xl md:text-3xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] mb-1 hover:opacity-80 transition-opacity">
            <span className="rainbow-letter rainbow-letter-0">N</span>
            <span className="rainbow-letter rainbow-letter-1">I</span>
            <span className="rainbow-letter rainbow-letter-2">R</span>
            <span className="rainbow-letter rainbow-letter-3">M</span>
            <span className="rainbow-letter rainbow-letter-4">A</span>
            <span className="rainbow-letter rainbow-letter-5">N</span>
            <span className="rainbow-letter rainbow-letter-6">A</span>
            <span className="rainbow-letter rainbow-letter-7">K</span>
            <span className="rainbow-letter rainbow-letter-8">A</span>
            <span className="rainbow-letter rainbow-letter-9">Y</span>
            <span className="rainbow-letter rainbow-letter-10">A</span>
          </h1>
        </Link>
        <p className="text-zinc-300 text-sm tracking-wide font-light">The Lounge</p>
        <p className="text-zinc-500 text-[0.625rem] mt-0.5">v{VERSION} alpha</p>
        {/* Nav Links - rainbow hover colors */}
        <div className="flex justify-center gap-2 mt-3 text-xs">
          <Link
            href="/"
            className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-rose-400 hover:border-rose-500/50 transition-all"
          >
            Reader
          </Link>
          <Link
            href="/hub"
            className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-amber-400 hover:border-amber-500/50 transition-all"
          >
            Community
          </Link>
          <Link
            href="/guide"
            className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-emerald-400 hover:border-emerald-500/50 transition-all"
          >
            Guide
          </Link>
          <Link
            href="/about"
            className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-all"
          >
            About
          </Link>
          <Link
            href="/council"
            className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-violet-400 hover:border-violet-500/50 transition-all"
          >
            Council
          </Link>
        </div>
      </div>

      {/* Lounge sub-header */}
      <header className="content-pane relative z-10 border-b border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h2 className="text-lg font-light tracking-wide text-zinc-100">
              The Lounge
            </h2>
            <p className="text-xs text-zinc-600">A gathering place for seekers</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Background controls toggle */}
            <button
              onClick={() => setShowBgControls(!showBgControls)}
              className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
              title="Background settings"
            >
              <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

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

      {/* Floating Background Controls Panel */}
      <AnimatePresence>
        {showBgControls && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-32 right-4 z-50 w-72 bg-zinc-900/95 border border-zinc-700/50 rounded-xl shadow-2xl backdrop-blur-sm"
          >
            <div className="p-4 border-b border-zinc-800/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-200">Background</h3>
                <button onClick={() => setShowBgControls(false)} className="text-zinc-500 hover:text-zinc-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Type Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBackgroundType('video')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    backgroundType === 'video'
                      ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                      : 'bg-zinc-800/50 text-zinc-400 border border-transparent hover:bg-zinc-800'
                  }`}
                >
                  Video
                </button>
                <button
                  onClick={() => setBackgroundType('image')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    backgroundType === 'image'
                      ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                      : 'bg-zinc-800/50 text-zinc-400 border border-transparent hover:bg-zinc-800'
                  }`}
                >
                  Image
                </button>
              </div>

              {/* Background Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={prevBackground}
                  className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm text-zinc-300">{currentBgName}</span>
                <button
                  onClick={nextBackground}
                  className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Background Opacity */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500">Brightness</span>
                  <span className="text-xs text-zinc-400">{backgroundOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={backgroundOpacity}
                  onChange={(e) => setBackgroundOpacity(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Content Dimming */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500">Content Dim</span>
                  <span className="text-xs text-zinc-400">{contentDim}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={contentDim}
                  onChange={(e) => setContentDim(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Theme Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                <span className="text-xs text-zinc-500">Theme</span>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? (
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="relative flex-1 flex overflow-hidden z-10">
        {/* Room sidebar - desktop */}
        <aside className="content-pane hidden lg:flex flex-col w-64 border-r border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm">
          <div className="p-4 border-b border-zinc-800/30 flex items-center justify-between">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Rooms</h2>
            {user && (
              <button
                onClick={() => setShowCreateRoom(true)}
                className="text-zinc-500 hover:text-amber-400 transition-colors"
                title="Create room"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {rooms.map(room => (
              <RoomItem
                key={room.id}
                room={room}
                isActive={activeRoom?.id === room.id}
                onClick={() => setActiveRoom(room)}
                isOwner={myRooms[room.id] === 'owner'}
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
              className="content-pane absolute inset-y-0 left-0 z-20 w-64 border-r border-zinc-800/50 bg-zinc-900/95 backdrop-blur-sm lg:hidden"
            >
              <div className="p-4 border-b border-zinc-800/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Rooms</h2>
                  {user && (
                    <button
                      onClick={() => { setShowMobileRooms(false); setShowCreateRoom(true); }}
                      className="text-zinc-500 hover:text-amber-400 transition-colors"
                      title="Create room"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  )}
                </div>
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
                    isOwner={myRooms[room.id] === 'owner'}
                  />
                ))}
              </nav>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Chat area */}
        <main className="content-pane flex-1 flex flex-col min-w-0 relative bg-zinc-900/20 backdrop-blur-sm">
          {/* Room header */}
          <div className="px-4 py-3 border-b border-zinc-800/30 bg-zinc-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {activeRoom?.is_private ? (
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ) : (
                  <span className="text-amber-500 text-lg">#</span>
                )}
                <h2 className="font-medium text-zinc-100">{activeRoom?.name || 'General'}</h2>
                {activeRoom?.is_private && (
                  <span className="text-xs text-zinc-500">private</span>
                )}
              </div>
              {/* Settings button for non-default rooms */}
              {user && activeRoom && !activeRoom.is_default && (
                <button
                  onClick={openRoomSettings}
                  className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded transition-colors"
                  title="Room settings"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
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

          {/* Room settings panel */}
          <RoomSettingsPanel
            room={activeRoom}
            isOpen={showRoomSettings}
            onClose={() => setShowRoomSettings(false)}
            onInvite={handleInviteMember}
            onDelete={handleDeleteRoom}
            onLeave={handleLeaveRoom}
            isOwner={isRoomOwner}
            members={roomMembers}
            user={user}
          />
        </main>
      </div>

      {/* Create room modal */}
      <AnimatePresence>
        {showCreateRoom && (
          <CreateRoomModal
            isOpen={showCreateRoom}
            onClose={() => setShowCreateRoom(false)}
            onCreate={handleCreateRoom}
          />
        )}
      </AnimatePresence>

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
