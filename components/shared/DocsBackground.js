'use client';

// === DOCS BACKGROUND WRAPPER ===
// Provides video/image backgrounds and controls for documentation pages

import { useState, useEffect } from 'react';
import { VERSION } from '../../lib/version';

// Background options (shared with Reader)
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

export default function DocsBackground({ children }) {
  const [theme, setTheme] = useState('dark');
  const [backgroundType, setBackgroundType] = useState('video');
  const [backgroundOpacity, setBackgroundOpacity] = useState(30);
  const [contentDim, setContentDim] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showBgControls, setShowBgControls] = useState(false);

  // Load preferences from localStorage (shared with Reader)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nirmanakaya_prefs');
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.theme !== undefined) setTheme(prefs.theme);
        if (prefs.backgroundType !== undefined) setBackgroundType(prefs.backgroundType);
        if (prefs.backgroundOpacity !== undefined) setBackgroundOpacity(prefs.backgroundOpacity);
        if (prefs.contentDim !== undefined) setContentDim(prefs.contentDim);
        if (prefs.selectedVideo !== undefined) setSelectedVideo(prefs.selectedVideo);
        if (prefs.selectedImage !== undefined) setSelectedImage(prefs.selectedImage);
      }
    } catch (e) {
      console.warn('Failed to load preferences:', e);
    }
  }, []);

  // Get current background
  const getCurrentBackground = () => {
    if (backgroundType === 'video') {
      return videoBackgrounds[selectedVideo] || videoBackgrounds[0];
    }
    return imageBackgrounds[selectedImage] || imageBackgrounds[0];
  };

  // Cycle through backgrounds
  function cycleBackground(direction) {
    if (backgroundType === 'video') {
      setSelectedVideo(prev => {
        const next = prev + direction;
        if (next < 0) return videoBackgrounds.length - 1;
        if (next >= videoBackgrounds.length) return 0;
        return next;
      });
    } else {
      setSelectedImage(prev => {
        const next = prev + direction;
        if (next < 0) return imageBackgrounds.length - 1;
        if (next >= imageBackgrounds.length) return 0;
        return next;
      });
    }
  }

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

      {/* Background controls toggle button */}
      <div className="fixed top-3 left-3 z-50">
        <button
          onClick={() => setShowBgControls(!showBgControls)}
          className="w-8 h-8 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/50 backdrop-blur-sm text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center justify-center transition-all"
          title={showBgControls ? "Hide background controls" : "Show background controls"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      {/* Floating Background Controls Panel */}
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
                onClick={() => cycleBackground(-1)}
                className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm text-zinc-300">{getCurrentBackground().label}</span>
              <button
                onClick={() => cycleBackground(1)}
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
                min="5"
                max="60"
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
                max="100"
                value={contentDim}
                onChange={(e) => setContentDim(Number(e.target.value))}
                className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Theme toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
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

            {/* Version - sneaky placement */}
            <div className="text-center pt-2 border-t border-zinc-800/30 mt-2">
              <span className="text-[0.625rem] text-zinc-600">v{VERSION}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main content with content dimming */}
      <div className="relative z-10" style={{ opacity: 1 - (contentDim / 100) }}>
        {children}
      </div>
    </div>
  );
}
