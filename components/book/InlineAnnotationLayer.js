'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getInlineAnnotations, createInlineAnnotation, deleteAnnotation, searchUsers,
} from '../../lib/book-annotations';
import { getUser, isAdmin } from '../../lib/supabase';

/**
 * InlineAnnotationLayer — wraps chapter content to enable:
 * 1. Text selection → popover → annotate
 * 2. Highlighted passages with annotation counts
 * 3. Click highlight → view annotations
 * 4. @mention autocomplete
 */
export default function InlineAnnotationLayer({ slug, children }) {
  const contentRef = useRef(null);
  const popoverRef = useRef(null);

  const [user, setUser] = useState(null);
  const [annotations, setAnnotations] = useState([]);

  // Selection state
  const [selection, setSelection] = useState(null); // { text, prefix, suffix, rect }
  const [showAnnotatePopover, setShowAnnotatePopover] = useState(false);
  const [annotateText, setAnnotateText] = useState('');
  const [posting, setPosting] = useState(false);

  // View annotation state
  const [activeHighlight, setActiveHighlight] = useState(null); // annotation id
  const [highlightRect, setHighlightRect] = useState(null);

  // @mention state
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionResults, setMentionResults] = useState([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionedUsers, setMentionedUsers] = useState([]);
  const textareaRef = useRef(null);

  useEffect(() => {
    checkUser();
    loadAnnotations();
  }, [slug]);

  const checkUser = async () => {
    const { user: u } = await getUser();
    setUser(u);
  };

  const loadAnnotations = async () => {
    const data = await getInlineAnnotations(slug);
    setAnnotations(data);
  };

  // Apply highlights to the DOM when annotations change
  useEffect(() => {
    if (!contentRef.current) return;
    clearHighlights();
    annotations.forEach(ann => applyHighlight(ann));
  }, [annotations]);

  // --- TEXT SELECTION HANDLING ---

  const handleMouseUp = useCallback((e) => {
    // Ignore if clicking on a popover or highlight popover
    if (popoverRef.current?.contains(e.target)) return;
    if (e.target.closest('[data-annotation-popover]')) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      // Delay clearing to allow popover clicks
      setTimeout(() => {
        if (!popoverRef.current?.contains(document.activeElement)) {
          setShowAnnotatePopover(false);
          setSelection(null);
        }
      }, 200);
      return;
    }

    const text = sel.toString().trim();
    if (text.length < 3 || text.length > 1000) return;

    // Ensure selection is within our content area
    if (!contentRef.current?.contains(sel.anchorNode)) return;

    // Get surrounding context for anchoring
    const fullText = contentRef.current.textContent;
    const selIndex = fullText.indexOf(text);
    const prefix = selIndex > 0 ? fullText.slice(Math.max(0, selIndex - 50), selIndex) : '';
    const suffix = fullText.slice(selIndex + text.length, selIndex + text.length + 50);

    // Get position for popover
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = contentRef.current.getBoundingClientRect();

    setSelection({
      text,
      prefix,
      suffix,
      rect: {
        top: rect.top - containerRect.top,
        left: rect.left - containerRect.left + rect.width / 2,
        bottom: rect.bottom - containerRect.top,
      },
    });
    setShowAnnotatePopover(true);
    setAnnotateText('');
    setMentionedUsers([]);
  }, []);

  // --- HIGHLIGHT APPLICATION ---

  const clearHighlights = () => {
    if (!contentRef.current) return;
    const marks = contentRef.current.querySelectorAll('mark[data-annotation-id]');
    marks.forEach(mark => {
      const parent = mark.parentNode;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    });
  };

  const applyHighlight = (ann) => {
    if (!contentRef.current || !ann.selected_text) return;

    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    let found = false;

    while ((node = walker.nextNode()) && !found) {
      const nodeText = node.textContent;
      const idx = nodeText.indexOf(ann.selected_text);

      if (idx !== -1) {
        // Verify context match if available
        if (ann.text_prefix) {
          const fullText = contentRef.current.textContent;
          const fullIdx = fullText.indexOf(ann.selected_text);
          if (fullIdx > 0) {
            const actualPrefix = fullText.slice(Math.max(0, fullIdx - 50), fullIdx);
            // Rough match — at least half the prefix should match
            if (ann.text_prefix.length > 10 && !actualPrefix.includes(ann.text_prefix.slice(-10))) {
              continue;
            }
          }
        }

        // Count how many annotations are on this text
        const count = annotations.filter(a =>
          a.selected_text === ann.selected_text
        ).length;

        // Split the text node and wrap the selection
        const before = nodeText.slice(0, idx);
        const selected = nodeText.slice(idx, idx + ann.selected_text.length);
        const after = nodeText.slice(idx + ann.selected_text.length);

        const mark = document.createElement('mark');
        mark.setAttribute('data-annotation-id', ann.id);
        mark.setAttribute('data-selected-text', ann.selected_text);
        mark.className = 'bg-amber-400/15 hover:bg-amber-400/25 cursor-pointer transition-colors rounded-sm relative';
        mark.textContent = selected;
        mark.title = `${count} annotation${count > 1 ? 's' : ''}`;

        mark.addEventListener('click', (e) => {
          e.stopPropagation();
          const markRect = mark.getBoundingClientRect();
          const containerRect = contentRef.current.getBoundingClientRect();
          setHighlightRect({
            top: markRect.bottom - containerRect.top + 4,
            left: markRect.left - containerRect.left + markRect.width / 2,
          });
          setActiveHighlight(ann.selected_text);
          setShowAnnotatePopover(false);
          setSelection(null);
        });

        const parent = node.parentNode;
        if (before) parent.insertBefore(document.createTextNode(before), node);
        parent.insertBefore(mark, node);
        if (after) parent.insertBefore(document.createTextNode(after), node);
        parent.removeChild(node);

        found = true;
      }
    }
  };

  // --- ANNOTATION POSTING ---

  const handlePost = async () => {
    if (!annotateText.trim() || !selection || posting) return;
    setPosting(true);

    const mentionIds = mentionedUsers.map(u => u.id);
    const { error } = await createInlineAnnotation(
      slug,
      annotateText,
      selection.text,
      selection.prefix,
      selection.suffix,
      mentionIds,
    );

    if (!error) {
      setShowAnnotatePopover(false);
      setSelection(null);
      setAnnotateText('');
      setMentionedUsers([]);
      window.getSelection()?.removeAllRanges();
      loadAnnotations();
    }
    setPosting(false);
  };

  const handleDeleteAnnotation = async (id) => {
    await deleteAnnotation(id);
    setActiveHighlight(null);
    loadAnnotations();
  };

  // --- @MENTION HANDLING ---

  const handleTextareaChange = (e) => {
    const value = e.target.value;
    setAnnotateText(value);

    // Check for @mention trigger
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
      setMentionResults([]);
    }
  };

  useEffect(() => {
    if (mentionQuery === null) return;
    if (mentionQuery.length < 1) {
      setMentionResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await searchUsers(mentionQuery);
      setMentionResults(results);
    }, 200);

    return () => clearTimeout(timer);
  }, [mentionQuery]);

  const insertMention = (user) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = annotateText.slice(0, cursorPos);
    const mentionStart = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = annotateText.slice(cursorPos);

    const newText = textBeforeCursor.slice(0, mentionStart) + `@${user.display_name} ` + textAfterCursor;
    setAnnotateText(newText);
    setMentionQuery(null);
    setMentionResults([]);

    if (!mentionedUsers.find(u => u.id === user.id)) {
      setMentionedUsers(prev => [...prev, user]);
    }

    setTimeout(() => {
      textarea.focus();
      const newPos = mentionStart + user.display_name.length + 2;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleTextareaKeyDown = (e) => {
    // Handle @mention navigation
    if (mentionResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => Math.min(prev + 1, mentionResults.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        insertMention(mentionResults[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        setMentionResults([]);
        return;
      }
    }

    // Ctrl+Enter to post
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handlePost();
    }
  };

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeHighlight && !e.target.closest('[data-annotation-popover]') && !e.target.closest('mark[data-annotation-id]')) {
        setActiveHighlight(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeHighlight]);

  // Get annotations for a highlighted text
  const getAnnotationsForText = (selectedText) => {
    return annotations.filter(a => a.selected_text === selectedText);
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  // Render @mentions in text
  const renderAnnotationContent = (text) => {
    const parts = text.split(/(@\w+(?:\s\w+)?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="text-amber-400 font-medium">{part}</span>;
      }
      return part;
    });
  };

  const userIsAdmin = user && isAdmin(user);

  return (
    <div className="relative" ref={contentRef} onMouseUp={handleMouseUp}>
      {children}

      {/* Selection popover — "Annotate" button + textarea */}
      {showAnnotatePopover && selection && (
        <div
          ref={popoverRef}
          data-annotation-popover
          className="absolute z-50 transform -translate-x-1/2"
          style={{
            top: `${selection.rect.bottom + 8}px`,
            left: `${selection.rect.left}px`,
          }}
        >
          {user ? (
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-3 w-72 sm:w-80">
              {/* Selected text preview */}
              <div className="mb-2 px-2 py-1.5 bg-zinc-800/50 rounded text-xs text-zinc-400 line-clamp-2 border-l-2 border-amber-400/40">
                &ldquo;{selection.text.slice(0, 100)}{selection.text.length > 100 ? '...' : ''}&rdquo;
              </div>

              {/* Textarea with @mention */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={annotateText}
                  onChange={handleTextareaChange}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder="Add your annotation... (@ to mention)"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 resize-y min-h-[60px]"
                  autoFocus
                />

                {/* @mention dropdown */}
                {mentionResults.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg overflow-hidden w-full z-50">
                    {mentionResults.map((u, i) => (
                      <button
                        key={u.id}
                        onClick={() => insertMention(u)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                          i === mentionIndex ? 'bg-amber-400/10 text-amber-400' : 'text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-amber-600/30 flex items-center justify-center text-[8px] text-amber-400">
                            {u.display_name?.[0]?.toUpperCase()}
                          </div>
                        )}
                        {u.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={() => { setShowAnnotatePopover(false); setSelection(null); window.getSelection()?.removeAllRanges(); }}
                  className="text-xs font-mono text-zinc-500 hover:text-zinc-400 px-2 py-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePost}
                  disabled={!annotateText.trim() || posting}
                  className="text-xs font-mono px-3 py-1.5 rounded bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {posting ? 'Posting...' : 'Annotate'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-3">
              <button
                onClick={() => { window.dispatchEvent(new CustomEvent('open-auth-modal')); setShowAnnotatePopover(false); }}
                className="text-sm text-zinc-400 hover:text-amber-400 transition-colors whitespace-nowrap"
              >
                Sign in to annotate
              </button>
            </div>
          )}
        </div>
      )}

      {/* Highlight click popover — view annotations on a passage */}
      {activeHighlight && highlightRect && (
        <div
          data-annotation-popover
          className="absolute z-50 transform -translate-x-1/2"
          style={{
            top: `${highlightRect.top}px`,
            left: `${highlightRect.left}px`,
          }}
        >
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-3 w-72 sm:w-80 max-h-64 overflow-y-auto">
            {/* Quoted passage */}
            <div className="mb-3 px-2 py-1.5 bg-zinc-800/50 rounded text-xs text-zinc-400 line-clamp-2 border-l-2 border-amber-400/40">
              &ldquo;{activeHighlight.slice(0, 100)}{activeHighlight.length > 100 ? '...' : ''}&rdquo;
            </div>

            {/* Annotations on this text */}
            <div className="space-y-3">
              {getAnnotationsForText(activeHighlight).map(ann => {
                const isOwn = user && ann.user_id === user.id;
                const canDelete = isOwn || userIsAdmin;
                const name = ann.profiles?.display_name || 'Anonymous';
                const avatar = ann.profiles?.avatar_url;

                return (
                  <div key={ann.id} className="group">
                    <div className="flex items-center gap-1.5 mb-1">
                      {avatar ? (
                        <img src={avatar} alt="" className="w-4 h-4 rounded-full" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-amber-600/30 flex items-center justify-center text-[8px] text-amber-400 font-medium">
                          {name[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="text-[11px] text-zinc-400">{name}</span>
                      <span className="text-[10px] text-zinc-600 font-mono">{formatTime(ann.created_at)}</span>
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteAnnotation(ann.id)}
                          className="ml-auto text-zinc-600 hover:text-red-400 p-0.5"
                          title={userIsAdmin && !isOwn ? 'Delete (admin)' : 'Delete'}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed pl-[22px]">
                      {renderAnnotationContent(ann.content)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Close */}
            <button
              onClick={() => setActiveHighlight(null)}
              className="mt-2 text-[10px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
