'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MONITORS, PULSE_VOICE_PRESETS } from '../../lib/monitorPrompts';
import { STATUSES, STATUS_COLORS, HOUSE_COLORS, HOUSES } from '../../lib/constants';
import { ARCHETYPES } from '../../lib/archetypes';
import { getComponent } from '../../lib/corrections';
import { getHomeArchetype, getDetailedCardType } from '../../lib/cardImages';
import { renderWithHotlinks } from '../../lib/hotlinks';
import { ensureParagraphBreaks } from '../../lib/utils';
import CardImage from '../../components/reader/CardImage';
import Minimap from '../../components/reader/Minimap';
import TextSizeSlider from '../../components/shared/TextSizeSlider';
import InfoModal from '../../components/shared/InfoModal';

// House-aligned border colors (semi-transparent for see-through cards)
const HOUSE_BORDERS = {
  Gestalt: 'border-amber-500/60',
  Spirit:  'border-violet-500/60',
  Mind:    'border-cyan-500/60',
  Emotion: 'border-blue-500/60',
  Body:    'border-green-500/60',
  Portal:  'border-rose-500/60'
};

// Solid dot colors for trend table
const STATUS_DOT = {
  1: 'bg-emerald-500',
  2: 'bg-amber-500',
  3: 'bg-sky-500',
  4: 'bg-violet-500'
};

// Background assets (shared with main reader)
const videoBackgrounds = [
  { id: "cosmos", src: "/video/cosmos.mp4", label: "Cosmos" },
  { id: "ocean", src: "/video/background.mp4", label: "Ocean" },
  { id: "ocean2", src: "/video/ocean2.mp4", label: "Deep Ocean" },
  { id: "rainbow", src: "/video/rainbow.mp4", label: "Rainbow" },
  { id: "forest", src: "/video/forest.mp4", label: "Forest" },
  { id: "violet", src: "/video/violet.mp4", label: "Violet" },
];

const imageBackgrounds = [
  { id: "deep-ocean-1", src: "/images/Zolakaya_abstract_fractal_deep_blue_ocean_fills_the_image_--s_834b4b03-ff4a-4dba-b095-276ca0078063_1.png", label: "Deep Ocean 1" },
  { id: "deep-ocean-2", src: "/images/Zolakaya_abstract_fractal_deep_blue_ocean_fills_the_image_--s_834b4b03-ff4a-4dba-b095-276ca0078063_3.png", label: "Deep Ocean 2" },
  { id: "cosmic-1", src: "/images/Zolakaya_Cosmic_rainbow_of_colors_fractal_expressions_of_holy_71e29517-f921-418c-9415-aa100c5acf4e_0.png", label: "Cosmic 1" },
  { id: "cosmic-2", src: "/images/Zolakaya_Cosmic_rainbow_of_colors_fractal_expressions_of_holy_71e29517-f921-418c-9415-aa100c5acf4e_1.png", label: "Cosmic 2" },
  { id: "cosmic-3", src: "/images/Zolakaya_Cosmic_rainbow_of_colors_fractal_expressions_of_holy_71e29517-f921-418c-9415-aa100c5acf4e_2.png", label: "Cosmic 3" },
  { id: "forest", src: "/images/Zolakaya_imaginary_green_Lucious_fractal_garden_calm_forest_w_ff789520-3ec5-437d-b2da-d378d9a837f2_0.png", label: "Forest" },
  { id: "violet-1", src: "/images/Zolakaya_Sparkling_fractal_Purple_flowers_radiating_from_ever_2da9d73c-5041-4ae6-8f9f-c09b40d828f2_0.png", label: "Violet 1" },
  { id: "violet-2", src: "/images/Zolakaya_Sparkling_fractal_Purple_flowers_radiating_from_ever_2da9d73c-5041-4ae6-8f9f-c09b40d828f2_2.png", label: "Violet 2" },
  { id: "violet-3", src: "/images/Zolakaya_Sparkling_fractal_Purple_flowers_radiating_from_ever_2da9d73c-5041-4ae6-8f9f-c09b40d828f2_3.png", label: "Violet 3" },
  { id: "tunnel-1", src: "/images/Zolakaya_The_beautiful_glowing_circular_tunnel_to_heaven_no_f_ba01ff35-10b4-4a2b-a941-6d3f084b6e44_0.png", label: "Tunnel 1" },
  { id: "tunnel-2", src: "/images/Zolakaya_The_beautiful_glowing_circular_tunnel_to_heaven_no_f_ba01ff35-10b4-4a2b-a941-6d3f084b6e44_3.png", label: "Tunnel 2" },
];

// Strip AI format markers from interpretation text
function cleanInterpretation(text) {
  if (!text) return { interpretation: '', correction: '' };
  let cleaned = text;
  // Extract correction section
  const correctionMatch = cleaned.match(/\[CORRECTION\]\s*([\s\S]*?)$/i);
  const correction = correctionMatch ? correctionMatch[1].trim() : '';
  // Remove markers
  cleaned = cleaned.replace(/\[READING\]\s*/gi, '').replace(/\[CORRECTION\][\s\S]*$/gi, '').trim();
  return { interpretation: cleaned, correction };
}

// Get minimap props for a reading's card
function getMinimapProps(reading) {
  const transientId = reading.transient_id;
  const positionId = reading.position_id;
  const correctionTargetId = reading.correction_target_id;
  const fromId = getHomeArchetype(transientId);
  const cardDetail = getDetailedCardType(transientId);
  const fromCardType = cardDetail?.type?.toLowerCase() || null;
  const boundIsInner = cardDetail?.isInner ?? null;

  return {
    fromId,
    toId: positionId,
    fromCardType,
    boundIsInner,
    secondToId: reading.status_id !== 1 ? correctionTargetId : null,
  };
}

// Voice options for the switcher (Raw at end)
const VOICE_OPTIONS = [
  ...Object.values(PULSE_VOICE_PRESETS).map(v => ({ key: v.key, label: v.label })),
  { key: 'default', label: 'Raw' }
];

// MonitorCard defined at module level so React identity is stable across renders
function MonitorCard({ monitorId, reading, featured = false, contentDim = 60, onInfoClick = null, voiceLoading = false }) {
  const monitor = MONITORS[monitorId];
  if (!reading || !monitor) return null;

  const houseColors = HOUSE_COLORS[monitor.house];
  const borderColor = HOUSE_BORDERS[monitor.house] || 'border-zinc-500/60';
  const component = getComponent(reading.transient_id);
  const position = ARCHETYPES[reading.position_id];
  const { interpretation, correction } = cleanInterpretation(reading.interpretation);
  const minimapProps = getMinimapProps(reading);
  const isBalanced = reading.status_id === 1;

  const rounded = featured ? 'rounded-2xl' : 'rounded-xl';
  const padding = featured ? 'p-6' : 'p-5';
  const minimapSize = 'card';
  const cardSize = 'compact';

  // contentDim controls card background opacity:
  // dim=0 → 0.3 (transparent, background visible) | dim=100 → 0.92 (opaque, readable)
  const cardBgOpacity = 0.3 + (contentDim / 100) * 0.62;

  return (
    <div
      className={`${rounded} content-pane border-2 ${borderColor} ${padding} h-full`}
      style={{ backgroundColor: `rgba(24, 24, 27, ${cardBgOpacity})` }}
    >
        {/* Header: emoji, name, scope, status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className={featured ? 'text-4xl' : 'text-2xl'}>{monitor.emoji}</span>
            <div>
              <h2 className={`${featured ? 'text-2xl' : 'text-lg'} font-light ${houseColors.text}`}>
                {monitor.publicName || monitor.name}
              </h2>
              <p className="text-zinc-500 text-xs mt-0.5">{monitor.description}</p>
            </div>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full shrink-0 cursor-pointer hover:brightness-125 transition-all ${STATUS_COLORS[reading.status_id]}`}
            onClick={() => onInfoClick && onInfoClick({ type: 'status', id: reading.status_id, data: STATUSES[reading.status_id] })}
          >
            {STATUSES[reading.status_id]?.name}
          </span>
        </div>

        {/* Scope question */}
        <p className="text-zinc-500 text-xs italic mb-4">{monitor.question}</p>

        {/* Card visual: CardImage + Minimap (stacks on mobile) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-3">
          <div
            className="shrink-0 p-3 -m-3 overflow-visible cursor-pointer"
            onClick={() => onInfoClick && onInfoClick({ type: 'card', id: reading.transient_id, data: component })}
          >
            <CardImage
              transient={reading.transient_id}
              status={reading.status_id}
              cardName={component?.name || ''}
              size={cardSize}
              showFrame={true}
            />
          </div>
          <div className="shrink-0">
            <Minimap
              {...minimapProps}
              size={minimapSize}
              singleMode={true}
            />
          </div>
        </div>

        {/* Signature (between card visuals and interpretation) */}
        <div className="mb-3">
          <div className={`${featured ? 'text-lg' : 'text-sm'} text-white/90 font-medium mb-1`}>
            {reading.signature}
          </div>
          <div className="text-zinc-500 text-xs">
            <span
              className="cursor-pointer hover:underline decoration-dotted underline-offset-2 hover:text-zinc-300 transition-colors"
              onClick={() => onInfoClick && onInfoClick({ type: 'card', id: reading.transient_id, data: component })}
            >
              {component?.name || 'Unknown'}
            </span>
            {' in '}
            <span
              className="cursor-pointer hover:underline decoration-dotted underline-offset-2 hover:text-zinc-300 transition-colors"
              onClick={() => onInfoClick && position && onInfoClick({ type: 'card', id: reading.position_id, data: position })}
            >
              {position?.name || 'Unknown'}
            </span>
            {component?.house && (
              <span
                className={`ml-2 cursor-pointer hover:underline decoration-dotted underline-offset-2 transition-colors ${HOUSE_COLORS[component.house]?.text || 'text-zinc-500'}`}
                onClick={() => onInfoClick && onInfoClick({ type: 'house', id: component.house, data: component.house })}
              >
                {component.house} House
              </span>
            )}
          </div>
        </div>

        {/* Interpretation */}
        <div className="mb-3">
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Interpretation</h4>
          {voiceLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-3 bg-zinc-700/50 rounded w-full" />
              <div className="h-3 bg-zinc-700/50 rounded w-11/12" />
              <div className="h-3 bg-zinc-700/50 rounded w-4/5" />
              <div className="h-3 bg-zinc-700/50 rounded w-9/12" />
              <div className="h-3 bg-zinc-700/40 rounded w-3/5" />
            </div>
          ) : (
            <div className={`${featured ? 'text-zinc-300' : 'text-zinc-400'} text-sm leading-relaxed space-y-3`}>
              {ensureParagraphBreaks(interpretation).split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                <p key={i} className="whitespace-pre-wrap">
                  {onInfoClick ? renderWithHotlinks(para.trim(), onInfoClick) : para.trim()}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Path to Balance (only if imbalanced) */}
        {!isBalanced && !voiceLoading && correction && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Path to Balance</h4>
            <div className="text-zinc-400 text-sm leading-relaxed space-y-3">
              {ensureParagraphBreaks(correction).split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                <p key={i} className="whitespace-pre-wrap">
                  {onInfoClick ? renderWithHotlinks(para.trim(), onInfoClick) : para.trim()}
                </p>
              ))}
            </div>
          </div>
        )}
        {voiceLoading && !isBalanced && (
          <div className="mt-3 pt-3 border-t border-white/5 animate-pulse">
            <div className="h-2.5 bg-zinc-700/30 rounded w-24 mb-2" />
            <div className="h-3 bg-zinc-700/40 rounded w-full" />
            <div className="h-3 bg-zinc-700/40 rounded w-3/4 mt-2" />
          </div>
        )}
    </div>
  );
}

export default function PulsePage() {
  const [readings, setReadings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [trends, setTrends] = useState(null);

  // Voice state (default to 'friend'; localStorage or URL params may override)
  const [selectedVoice, setSelectedVoice] = useState('friend');
  const [voiceLoadingMonitors, setVoiceLoadingMonitors] = useState(new Set());
  const [throughline, setThroughline] = useState(null);

  // InfoModal state (for hotlinks)
  const [selectedInfo, setSelectedInfo] = useState(null);

  // Background/theme state
  const [showBgControls, setShowBgControls] = useState(false);
  const [backgroundOpacity, setBackgroundOpacity] = useState(30);
  const [contentDim, setContentDim] = useState(60);
  const [theme, setTheme] = useState('dark');
  const [backgroundType, setBackgroundType] = useState('video');
  const [selectedVideo, setSelectedVideo] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);

  // Mark pulse as seen (stops flash on Reader's pulse button)
  useEffect(() => {
    try {
      localStorage.setItem('nirmanakaya_last_pulse_seen', new Date().toISOString().split('T')[0]);
    } catch (e) { /* localStorage unavailable */ }
  }, []);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nirmanakaya_pulse_prefs');
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.backgroundOpacity !== undefined) setBackgroundOpacity(prefs.backgroundOpacity);
        if (prefs.contentDim !== undefined) setContentDim(prefs.contentDim);
        if (prefs.theme !== undefined) setTheme(prefs.theme);
        if (prefs.backgroundType !== undefined) setBackgroundType(prefs.backgroundType);
        if (prefs.selectedVideo !== undefined) setSelectedVideo(prefs.selectedVideo);
        if (prefs.selectedImage !== undefined) setSelectedImage(prefs.selectedImage);
        if (prefs.selectedVoice !== undefined) setSelectedVoice(prefs.selectedVoice);
      }
    } catch (e) {
      console.warn('Failed to load pulse preferences:', e);
    }
  }, []);

  // Auto-save preferences
  useEffect(() => {
    const prefs = { backgroundOpacity, contentDim, theme, backgroundType, selectedVideo, selectedImage, selectedVoice };
    try {
      localStorage.setItem('nirmanakaya_pulse_prefs', JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save pulse preferences:', e);
    }
  }, [backgroundOpacity, contentDim, theme, backgroundType, selectedVideo, selectedImage, selectedVoice]);

  // Background helpers
  const getCurrentBackground = () => {
    if (backgroundType === 'video') return videoBackgrounds[selectedVideo] || videoBackgrounds[0];
    return imageBackgrounds[selectedImage] || imageBackgrounds[0];
  };

  const nudgeBackground = (direction) => {
    if (backgroundType === 'video') {
      setSelectedVideo((prev) => {
        const next = prev + direction;
        if (next < 0) return videoBackgrounds.length - 1;
        if (next >= videoBackgrounds.length) return 0;
        return next;
      });
    } else {
      setSelectedImage((prev) => {
        const next = prev + direction;
        if (next < 0) return imageBackgrounds.length - 1;
        if (next >= imageBackgrounds.length) return 0;
        return next;
      });
    }
  };

  // Track previous date and voice to distinguish what changed
  const [prevDate, setPrevDate] = useState(selectedDate);
  const [prevVoice, setPrevVoice] = useState(null); // null = initial load

  // Fetch readings for selected date + voice
  useEffect(() => {
    const isDateChange = selectedDate !== prevDate;
    const isVoiceSwitch = !isDateChange && prevVoice !== null && selectedVoice !== prevVoice;

    async function fetchReadings() {
      // Full-page loading for date changes or initial load
      // Voice switches show per-card shimmer instead
      if (!isVoiceSwitch) {
        setLoading(true);
      } else {
        // Mark all monitors as loading for per-card shimmer
        setVoiceLoadingMonitors(new Set(['global', 'power', 'heart', 'mind', 'body']));
      }
      setError(null);
      setPrevDate(selectedDate);
      setPrevVoice(selectedVoice);

      try {
        // On date change or initial load, fetch default readings first for throughline
        if (!isVoiceSwitch) {
          const defaultRes = await fetch(`/api/collective-pulse?date=${selectedDate}`);
          const defaultData = await defaultRes.json();
          if (defaultData.success && defaultData.readings[selectedDate]) {
            const defaultReadings = defaultData.readings[selectedDate];
            // Capture throughline (only stored on default voice global row)
            if (defaultReadings.global?.throughline) {
              setThroughline(defaultReadings.global.throughline);
            } else {
              setThroughline(null);
            }
            // If voice IS default, use these readings directly
            if (selectedVoice === 'default') {
              setReadings(defaultReadings);
              setVoiceLoadingMonitors(new Set());
              return;
            }
          } else {
            setThroughline(null);
            if (selectedVoice === 'default') {
              setReadings(null);
              return;
            }
          }
        }

        // Fetch voice-specific readings
        const voiceParam = selectedVoice !== 'default' ? `&voice=${selectedVoice}` : '';
        const res = await fetch(`/api/collective-pulse?date=${selectedDate}${voiceParam}`);
        const data = await res.json();
        if (data.success && data.readings[selectedDate]) {
          setReadings(data.readings[selectedDate]);
          setVoiceLoadingMonitors(new Set());
        } else {
          // Voice variant not cached yet — try on-demand generation
          if (selectedVoice !== 'default') {
            await fetchVoiceOnDemand(selectedDate, selectedVoice);
          } else {
            setReadings(null);
          }
        }
      } catch (err) {
        console.error('Error fetching readings:', err);
        setError('Failed to load readings');
        setVoiceLoadingMonitors(new Set());
      } finally {
        setLoading(false);
      }
    }
    fetchReadings();
  }, [selectedDate, selectedVoice]);

  // On-demand voice generation for all monitors
  const fetchVoiceOnDemand = useCallback(async (date, voice) => {
    const monitorIds = ['global', 'power', 'heart', 'mind', 'body'];
    setVoiceLoadingMonitors(new Set(monitorIds));
    const results = {};

    for (const monitorId of monitorIds) {
      try {
        const res = await fetch(`/api/collective-pulse/voice?date=${date}&monitor=${monitorId}&voice=${voice}`);
        const data = await res.json();
        if (data.success && data.reading) {
          results[monitorId] = data.reading;
          // Update readings progressively as each monitor completes
          setReadings(prev => ({ ...prev, ...{ [monitorId]: data.reading } }));
        }
      } catch (err) {
        console.error(`Error generating ${monitorId} voice:`, err);
      }
      setVoiceLoadingMonitors(prev => {
        const next = new Set(prev);
        next.delete(monitorId);
        return next;
      });
    }
  }, []);

  // Fetch 7-day trends
  useEffect(() => {
    async function fetchTrends() {
      try {
        const res = await fetch('/api/collective-pulse?days=7');
        const data = await res.json();
        if (data.success) setTrends(data.readings);
      } catch (err) {
        console.error('Error fetching trends:', err);
      }
    }
    fetchTrends();
  }, []);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const changeDate = (days) => {
    const current = new Date(selectedDate + 'T12:00:00');
    current.setDate(current.getDate() + days);
    const newDate = current.toISOString().split('T')[0];
    if (newDate <= new Date().toISOString().split('T')[0]) setSelectedDate(newDate);
  };

  // Share current pulse URL
  const handleShare = async () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const voiceParam = selectedVoice !== 'default' ? `&voice=${selectedVoice}` : '';
    const shareUrl = `${baseUrl}/pulse?date=${selectedDate}${voiceParam}`;
    const shareText = `Collective Pulse - ${formatDate(selectedDate)}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: shareText, url: shareUrl });
      } catch (e) {
        // User cancelled or error — fall through to clipboard
        if (e.name !== 'AbortError') {
          await navigator.clipboard?.writeText(shareUrl);
        }
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  // Read date/voice from URL params on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');
    const voiceParam = params.get('voice');
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) setSelectedDate(dateParam);
    if (voiceParam && VOICE_OPTIONS.some(v => v.key === voiceParam)) setSelectedVoice(voiceParam);
  }, []);

  const monitorIds = Object.keys(MONITORS);

  return (
    <div
      className={`min-h-screen ${theme === 'light' ? 'bg-stone-200 text-stone-900' : 'bg-zinc-950 text-zinc-100'}`}
      data-theme={theme}
    >
      {/* Background - Video or Image */}
      {backgroundType === 'video' && videoBackgrounds[selectedVideo]?.src && (
        <video
          key={videoBackgrounds[selectedVideo].id}
          autoPlay
          loop
          muted
          playsInline
          ref={(el) => { if (el) el.playbackRate = 1.0; }}
          className="fixed inset-0 w-full h-full object-cover z-0"
          style={{ pointerEvents: "none", opacity: backgroundOpacity / 100 }}
        >
          <source src={videoBackgrounds[selectedVideo].src} type="video/mp4" />
        </video>
      )}
      {backgroundType === 'image' && imageBackgrounds[selectedImage]?.src && (
        <div
          key={imageBackgrounds[selectedImage].id}
          className="fixed inset-0 w-full h-full z-0"
          style={{
            backgroundImage: `url(${imageBackgrounds[selectedImage].src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            pointerEvents: "none",
            opacity: backgroundOpacity / 100
          }}
        />
      )}

      {/* Main content overlay */}
      <div className="relative z-10" style={{ '--content-dim': contentDim / 100 }}>

        {/* Floating Controls */}
        <div className="fixed top-3 left-3 z-50 flex items-center gap-2">
          {/* Settings gear */}
          <button
            onClick={() => setShowBgControls(!showBgControls)}
            className="w-8 h-8 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/50 backdrop-blur-sm text-zinc-400 hover:text-amber-400 text-xs flex items-center justify-center transition-all"
            title="Background settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* TextSizeSlider */}
        <div className="fixed top-3 right-3 z-50">
          <TextSizeSlider />
        </div>

        {/* Settings Panel */}
        {showBgControls && (
          <div className="fixed top-14 left-3 z-50 w-72 bg-zinc-900/95 border border-zinc-700/50 rounded-xl shadow-2xl backdrop-blur-sm">
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
                  onClick={() => nudgeBackground(-1)}
                  className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm text-zinc-300">{getCurrentBackground().label}</span>
                <button
                  onClick={() => nudgeBackground(1)}
                  className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Brightness */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500">Brightness</span>
                  <span className="text-xs text-zinc-400">{backgroundOpacity}%</span>
                </div>
                <input
                  type="range" min="5" max="60" value={backgroundOpacity}
                  onChange={(e) => setBackgroundOpacity(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Content Dim */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500">Content Dim</span>
                  <span className="text-xs text-zinc-400">{contentDim}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={contentDim}
                  onChange={(e) => setContentDim(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Theme toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Theme</span>
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                    title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
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
            </div>
          </div>
        )}

        {/* Header */}
        <header className="content-pane border-b border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-light text-white tracking-wide">
                  Collective Pulse
                </h1>
                <p className="text-zinc-400 mt-1">
                  Geometric Weather for Humanity
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Share button */}
                <button
                  onClick={handleShare}
                  className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-amber-400 transition-all border border-zinc-700/30"
                  title="Share this pulse"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
                <Link
                  href="/"
                  className="text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Back to Reader
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Date Navigation */}
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => changeDate(-1)}
              className="text-zinc-400 hover:text-white transition-colors p-2"
            >
              Previous
            </button>
            <div className="text-white text-lg">
              {formatDate(selectedDate)}
            </div>
            <button
              onClick={() => changeDate(1)}
              disabled={selectedDate >= new Date().toISOString().split('T')[0]}
              className="text-zinc-400 hover:text-white transition-colors p-2 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>

        {/* Voice Switcher */}
        <div className="max-w-6xl mx-auto px-4 pb-2">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {VOICE_OPTIONS.map(voice => {
              const isActive = selectedVoice === voice.key;
              const isLoading = isActive && voiceLoadingMonitors.size > 0;
              return (
                <button
                  key={voice.key}
                  onClick={() => setSelectedVoice(voice.key)}
                  disabled={isLoading}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                      : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/30 hover:text-zinc-300 hover:bg-zinc-800'
                  } ${isLoading ? 'animate-pulse' : ''}`}
                >
                  {isLoading && (
                    <svg className="inline-block w-3 h-3 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {voice.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 py-8">
          {loading ? (
            <div className="text-center py-20">
              <div className="text-zinc-400">Loading collective readings...</div>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="text-red-400">{error}</div>
            </div>
          ) : !readings ? (
            <div className="text-center py-20">
              <div className="text-zinc-400">No readings available for this date.</div>
              <p className="text-zinc-500 mt-2 text-sm">
                Readings are generated daily at 6:00 AM UTC.
              </p>
            </div>
          ) : (
            <>
              {/* Global Field - Featured */}
              {readings.global && (
                <div className="mb-8">
                  <MonitorCard
                    monitorId="global"
                    reading={readings.global}
                    featured={true}
                    contentDim={contentDim}
                    onInfoClick={setSelectedInfo}
                    voiceLoading={voiceLoadingMonitors.has('global')}
                  />
                </div>
              )}

              {/* Four Monitors Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {['power', 'heart', 'mind', 'body'].map(id => (
                  readings[id] ? (
                    <MonitorCard
                      key={id}
                      monitorId={id}
                      reading={readings[id]}
                      contentDim={contentDim}
                      onInfoClick={setSelectedInfo}
                      voiceLoading={voiceLoadingMonitors.has(id)}
                    />
                  ) : null
                ))}
              </div>

              {/* Throughline (cross-monitor synthesis) — shown for all voices */}
              {throughline && (
                <div
                  className="mb-8 rounded-xl border border-amber-500/30 p-6"
                  style={{ backgroundColor: `rgba(24, 24, 27, ${0.3 + (contentDim / 100) * 0.62})` }}
                >
                  <h3 className="text-xs font-medium text-amber-500 uppercase tracking-wider mb-3">
                    Today&apos;s Throughline
                  </h3>
                  <div className="text-zinc-200 text-sm leading-relaxed space-y-3">
                    {ensureParagraphBreaks(throughline).split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                      <p key={i} className="whitespace-pre-wrap">
                        {renderWithHotlinks(para.trim(), setSelectedInfo)}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* 7-Day Trend */}
              {trends && Object.keys(trends).length > 1 && (
                <div className="content-pane rounded-xl bg-white/5 border border-white/10 p-6">
                  <h3 className="text-white font-light mb-4">7-Day Pattern</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-zinc-500">
                          <th className="text-left py-2 px-2">Date</th>
                          {monitorIds.map(m => (
                            <th key={m} className="text-center py-2 px-2">{MONITORS[m].emoji}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(trends)
                          .sort(([a], [b]) => b.localeCompare(a))
                          .slice(0, 7)
                          .map(([date, dayReadings]) => (
                            <tr key={date} className="border-t border-white/5">
                              <td className="py-2 px-2 text-zinc-400">
                                {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </td>
                              {monitorIds.map(m => (
                                <td key={m} className="text-center py-2 px-2">
                                  {dayReadings[m] ? (
                                    <span
                                      className={`inline-block w-6 h-6 rounded-full ${STATUS_DOT[dayReadings[m].status_id] || 'bg-zinc-600'}`}
                                      title={STATUSES[dayReadings[m].status_id]?.name}
                                    />
                                  ) : (
                                    <span className="text-zinc-600">&mdash;</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-4 mt-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-emerald-500" /> Balanced
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-amber-500" /> Too Much
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-sky-500" /> Too Little
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-violet-500" /> Unacknowledged
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* Footer Disclaimer */}
        <footer className="content-pane border-t border-white/10 bg-black/20 mt-12">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <p className="text-zinc-500 text-sm text-center">
              This is a geometric mirror for contemplation, not news or prediction.
              <br />
              The map reflects. You decide.
            </p>
            <p className="text-zinc-600 text-xs text-center mt-2">
              Nirmanakaya Reader
            </p>
          </div>
        </footer>
      </div>

      {/* InfoModal for hotlinks */}
      {selectedInfo && (
        <InfoModal
          info={selectedInfo}
          onClose={() => setSelectedInfo(null)}
          setSelectedInfo={setSelectedInfo}
        />
      )}
    </div>
  );
}
