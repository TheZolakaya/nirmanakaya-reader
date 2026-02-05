'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppearance } from './AppearanceContext';

const TextSizeSlider = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const {
    appearance,
    updateAppearance,
    resetAppearance,
    getInputStyles,
    FONT_PRESETS,
    TEXT_COLOR_PRESETS,
    BG_COLOR_PRESETS,
  } = useAppearance();

  const { scale, brightness, textColor, bgColor, font } = appearance;

  // Close dropdown when clicking/tapping outside
  const handleClickOutside = useCallback((e) => {
    if (containerRef.current && !containerRef.current.contains(e.target)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchend', handleClickOutside, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchend', handleClickOutside, true);
    };
  }, [isOpen, handleClickOutside]);

  return (
    <div ref={containerRef} className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/50 backdrop-blur-sm"
        title="Text appearance settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 7 4 4 20 4 20 7"></polyline>
          <line x1="9" y1="20" x2="15" y2="20"></line>
          <line x1="12" y1="4" x2="12" y2="20"></line>
        </svg>
      </button>

      {/* Settings Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-xl z-50 w-[280px]">
          {/* Header with Reset */}
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-800">
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Appearance</span>
            <button
              onClick={resetAppearance}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Reset All
            </button>
          </div>

          {/* Text Size */}
          <div className="mb-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-zinc-500">Text Size</span>
              <span className="text-xs text-zinc-600">{Math.round(scale * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">A</span>
              <input
                type="range"
                min="0.8"
                max="1.2"
                step="0.05"
                value={scale}
                onChange={(e) => updateAppearance('scale', parseFloat(e.target.value))}
                className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:w-4
                           [&::-webkit-slider-thumb]:h-4
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-amber-500
                           [&::-webkit-slider-thumb]:cursor-pointer
                           [&::-webkit-slider-thumb]:transition-transform
                           [&::-webkit-slider-thumb]:hover:scale-110"
              />
              <span className="text-lg text-zinc-500">A</span>
            </div>
          </div>

          {/* Brightness */}
          <div className="mb-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-zinc-500">Text Brightness</span>
              <span className="text-xs text-zinc-600">{Math.round(brightness * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-600">◐</span>
              <input
                type="range"
                min="0.6"
                max="1"
                step="0.05"
                value={brightness}
                onChange={(e) => updateAppearance('brightness', parseFloat(e.target.value))}
                className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:w-4
                           [&::-webkit-slider-thumb]:h-4
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-zinc-400
                           [&::-webkit-slider-thumb]:cursor-pointer
                           [&::-webkit-slider-thumb]:transition-transform
                           [&::-webkit-slider-thumb]:hover:scale-110"
              />
              <span className="text-xs text-zinc-300">●</span>
            </div>
          </div>

          {/* Text Color Presets */}
          <div className="mb-5">
            <span className="text-xs text-zinc-500 block mb-2">Text Color</span>
            <div className="flex gap-2">
              {TEXT_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => updateAppearance('textColor', preset.id)}
                  className={`flex-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all border ${
                    textColor === preset.id
                      ? 'border-amber-500/60 bg-zinc-800'
                      : 'border-zinc-700/50 bg-zinc-800/50 hover:border-zinc-600'
                  }`}
                  style={{ color: preset.value }}
                  title={preset.label}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background Color Presets */}
          <div className="mb-5">
            <span className="text-xs text-zinc-500 block mb-2">Background</span>
            <div className="flex gap-2">
              {BG_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => updateAppearance('bgColor', preset.id)}
                  className={`flex-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all border ${
                    bgColor === preset.id
                      ? 'border-amber-500/60 text-zinc-300'
                      : 'border-zinc-700/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
                  }`}
                  style={{ backgroundColor: preset.value }}
                  title={preset.label}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Presets */}
          <div className="mb-2">
            <span className="text-xs text-zinc-500 block mb-2">Font</span>
            <div className="grid grid-cols-2 gap-2">
              {FONT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => updateAppearance('font', preset.id)}
                  className={`px-3 py-2 rounded-md text-sm transition-all border ${
                    font === preset.id
                      ? 'border-amber-500/60 bg-zinc-800 text-zinc-200'
                      : 'border-zinc-700/50 bg-zinc-800/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
                  }`}
                  style={{ fontFamily: preset.value }}
                  title={preset.label}
                >
                  <span className="text-base">{preset.preview}</span>
                  <span className="text-[10px] block mt-0.5 opacity-70">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="mt-4 pt-3 border-t border-zinc-800">
            <span className="text-[10px] text-zinc-600 block mb-2">Preview</span>
            <div
              className="p-3 rounded-lg border border-zinc-700/50"
              style={getInputStyles({ fontSize: `${scale * 0.875}rem` })}
            >
              What brings you here today?
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextSizeSlider;
