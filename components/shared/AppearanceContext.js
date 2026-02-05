'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Font presets - 4 distinctive options
export const FONT_PRESETS = [
  { id: 'system', label: 'System', value: 'ui-sans-serif, system-ui, sans-serif', preview: 'Aa' },
  { id: 'mono', label: 'Mono', value: 'ui-monospace, "SF Mono", Monaco, "Cascadia Code", monospace', preview: 'Aa' },
  { id: 'serif', label: 'Serif', value: 'Georgia, "Times New Roman", serif', preview: 'Aa' },
  { id: 'rounded', label: 'Soft', value: '"Nunito", "Varela Round", ui-rounded, sans-serif', preview: 'Aa' },
];

// Color presets for text and background
export const TEXT_COLOR_PRESETS = [
  { id: 'white', label: 'White', value: '#ffffff', textClass: 'text-white' },
  { id: 'warm', label: 'Warm', value: '#fef3c7', textClass: 'text-amber-100' },
  { id: 'cool', label: 'Cool', value: '#e0f2fe', textClass: 'text-sky-100' },
  { id: 'soft', label: 'Soft', value: '#d4d4d8', textClass: 'text-zinc-300' },
];

export const BG_COLOR_PRESETS = [
  { id: 'dark', label: 'Dark', value: '#18181b', bgClass: 'bg-zinc-900' },
  { id: 'darker', label: 'Deeper', value: '#09090b', bgClass: 'bg-zinc-950' },
  { id: 'warm', label: 'Warm', value: '#1c1917', bgClass: 'bg-stone-900' },
  { id: 'ink', label: 'Ink', value: '#0f172a', bgClass: 'bg-slate-900' },
];

// Apply settings to CSS variables (the key function!)
const applyToCSSVariables = (settings) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty('--text-scale', String(settings.scale));
  root.style.setProperty('--text-brightness', String(settings.brightness));

  const textPreset = TEXT_COLOR_PRESETS.find(p => p.id === settings.textColor);
  if (textPreset) root.style.setProperty('--input-text-color', textPreset.value);

  const bgPreset = BG_COLOR_PRESETS.find(p => p.id === settings.bgColor);
  if (bgPreset) root.style.setProperty('--input-bg-color', bgPreset.value);

  const fontPreset = FONT_PRESETS.find(p => p.id === settings.font);
  if (fontPreset) root.style.setProperty('--input-font', fontPreset.value);
};

// Get resolved style values for inline styles
const getInputStylesFromSettings = (settings, overrides = {}) => {
  const textPreset = TEXT_COLOR_PRESETS.find(p => p.id === settings.textColor);
  const bgPreset = BG_COLOR_PRESETS.find(p => p.id === settings.bgColor);
  const fontPreset = FONT_PRESETS.find(p => p.id === settings.font);

  return {
    color: overrides.color ?? textPreset?.value ?? '#ffffff',
    backgroundColor: bgPreset?.value ?? '#18181b',
    fontFamily: fontPreset?.value ?? 'inherit',
    opacity: settings.brightness,
    ...overrides,
  };
};

const AppearanceContext = createContext(null);

export function AppearanceProvider({ children }) {
  const [appearance, setAppearance] = useState({
    scale: 1,
    brightness: 1,
    textColor: 'white',
    bgColor: 'dark',
    font: 'system',
  });

  useEffect(() => {
    const savedScale = localStorage.getItem('nirmanakaya-text-scale');
    const savedBrightness = localStorage.getItem('nirmanakaya-text-brightness');
    const savedTextColor = localStorage.getItem('nirmanakaya-text-color');
    const savedBgColor = localStorage.getItem('nirmanakaya-bg-color');
    const savedFont = localStorage.getItem('nirmanakaya-font');

    const newAppearance = {
      scale: savedScale ? parseFloat(savedScale) : 1,
      brightness: savedBrightness ? parseFloat(savedBrightness) : 1,
      textColor: savedTextColor || 'white',
      bgColor: savedBgColor || 'dark',
      font: savedFont || 'system',
    };

    setAppearance(newAppearance);
    applyToCSSVariables(newAppearance);
  }, []);

  const updateAppearance = useCallback((key, value) => {
    setAppearance(prev => {
      const newAppearance = { ...prev, [key]: value };

      const storageKey = key === 'textColor' ? 'text-color'
        : key === 'bgColor' ? 'bg-color'
        : key === 'scale' ? 'text-scale'
        : key === 'brightness' ? 'text-brightness'
        : 'font';
      localStorage.setItem(`nirmanakaya-${storageKey}`, String(value));

      applyToCSSVariables(newAppearance);
      return newAppearance;
    });
  }, []);

  const resetAppearance = useCallback(() => {
    const defaults = {
      scale: 1,
      brightness: 1,
      textColor: 'white',
      bgColor: 'dark',
      font: 'system',
    };
    setAppearance(defaults);

    localStorage.removeItem('nirmanakaya-text-scale');
    localStorage.removeItem('nirmanakaya-text-brightness');
    localStorage.removeItem('nirmanakaya-text-color');
    localStorage.removeItem('nirmanakaya-bg-color');
    localStorage.removeItem('nirmanakaya-font');

    applyToCSSVariables(defaults);
  }, []);

  const getInputStyles = useCallback((overrides = {}) => {
    return getInputStylesFromSettings(appearance, overrides);
  }, [appearance]);

  return (
    <AppearanceContext.Provider value={{
      appearance,
      updateAppearance,
      resetAppearance,
      getInputStyles,
      FONT_PRESETS,
      TEXT_COLOR_PRESETS,
      BG_COLOR_PRESETS,
    }}>
      {children}
    </AppearanceContext.Provider>
  );
}

// Standalone hook - always manages its own state, ignores context
// This avoids the conditional hooks problem
export function useAppearance() {
  const [appearance, setAppearance] = useState({
    scale: 1,
    brightness: 1,
    textColor: 'white',
    bgColor: 'dark',
    font: 'system',
  });

  // Load from localStorage on mount and apply CSS variables
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedScale = localStorage.getItem('nirmanakaya-text-scale');
    const savedBrightness = localStorage.getItem('nirmanakaya-text-brightness');
    const savedTextColor = localStorage.getItem('nirmanakaya-text-color');
    const savedBgColor = localStorage.getItem('nirmanakaya-bg-color');
    const savedFont = localStorage.getItem('nirmanakaya-font');

    const newAppearance = {
      scale: savedScale ? parseFloat(savedScale) : 1,
      brightness: savedBrightness ? parseFloat(savedBrightness) : 1,
      textColor: savedTextColor || 'white',
      bgColor: savedBgColor || 'dark',
      font: savedFont || 'system',
    };

    setAppearance(newAppearance);
    applyToCSSVariables(newAppearance);
  }, []);

  const updateAppearance = useCallback((key, value) => {
    setAppearance(prev => {
      const newAppearance = { ...prev, [key]: value };

      const storageKey = key === 'textColor' ? 'text-color'
        : key === 'bgColor' ? 'bg-color'
        : key === 'scale' ? 'text-scale'
        : key === 'brightness' ? 'text-brightness'
        : 'font';
      localStorage.setItem(`nirmanakaya-${storageKey}`, String(value));

      applyToCSSVariables(newAppearance);
      return newAppearance;
    });
  }, []);

  const resetAppearance = useCallback(() => {
    const defaults = {
      scale: 1,
      brightness: 1,
      textColor: 'white',
      bgColor: 'dark',
      font: 'system',
    };
    setAppearance(defaults);

    localStorage.removeItem('nirmanakaya-text-scale');
    localStorage.removeItem('nirmanakaya-text-brightness');
    localStorage.removeItem('nirmanakaya-text-color');
    localStorage.removeItem('nirmanakaya-bg-color');
    localStorage.removeItem('nirmanakaya-font');

    applyToCSSVariables(defaults);
  }, []);

  const getInputStyles = useCallback((overrides = {}) => {
    return getInputStylesFromSettings(appearance, overrides);
  }, [appearance]);

  return {
    appearance,
    updateAppearance,
    resetAppearance,
    getInputStyles,
    FONT_PRESETS,
    TEXT_COLOR_PRESETS,
    BG_COLOR_PRESETS,
  };
}
