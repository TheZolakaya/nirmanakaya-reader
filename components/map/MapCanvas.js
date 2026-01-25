'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * MapCanvas - Pan/zoom container for the training map
 *
 * Provides:
 * - Mouse drag to pan
 * - Mouse wheel to zoom
 * - Touch gestures (single finger pan)
 * - Keyboard controls (arrows to pan, +/- to zoom)
 */

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const PAN_STEP = 50;

const MapCanvas = ({
  children,
  width = 590,
  height = 530,
  initialZoom = 1,
  initialPan = { x: 0, y: 0 },
  onViewChange,
  className = ''
}) => {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState(initialPan);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });

  // Notify parent of view changes
  useEffect(() => {
    if (onViewChange) {
      onViewChange({ zoom, pan });
    }
  }, [zoom, pan, onViewChange]);

  // Zoom functions
  const zoomIn = useCallback(() => {
    setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  }, []);

  const zoomTo = useCallback((level) => {
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level)));
  }, []);

  const zoomFit = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const padding = 40;
    const scaleX = (container.clientWidth - padding) / width;
    const scaleY = (container.clientHeight - padding) / height;
    const newZoom = Math.min(scaleX, scaleY, 1.5);
    setZoom(newZoom);
    setPan({ x: 0, y: 0 });
  }, [width, height]);

  const resetView = useCallback(() => {
    setZoom(initialZoom);
    setPan(initialPan);
  }, [initialZoom, initialPan]);

  // Pan to specific position
  const panTo = useCallback((x, y) => {
    setPan({ x, y });
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)));
  }, []);

  // Mouse pan start
  const handleMouseDown = useCallback((e) => {
    // Only pan with left mouse button on container (not on cards)
    if (e.button !== 0) return;
    if (e.target !== containerRef.current && !e.target.classList.contains('map-content')) return;

    setIsPanning(true);
    setPanStart({
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y
    });
    e.preventDefault();
  }, [pan]);

  // Mouse pan move
  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    setPan({
      x: panStart.panX + dx,
      y: panStart.panY + dy
    });
  }, [isPanning, panStart]);

  // Mouse pan end
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Touch pan
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsPanning(true);
    setPanStart({
      x: touch.clientX,
      y: touch.clientY,
      panX: pan.x,
      panY: pan.y
    });
  }, [pan]);

  const handleTouchMove = useCallback((e) => {
    if (!isPanning || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - panStart.x;
    const dy = touch.clientY - panStart.y;
    setPan({
      x: panStart.panX + dx,
      y: panStart.panY + dy
    });
  }, [isPanning, panStart]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Keyboard controls
  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowUp':
        setPan(p => ({ ...p, y: p.y + PAN_STEP }));
        e.preventDefault();
        break;
      case 'ArrowDown':
        setPan(p => ({ ...p, y: p.y - PAN_STEP }));
        e.preventDefault();
        break;
      case 'ArrowLeft':
        setPan(p => ({ ...p, x: p.x + PAN_STEP }));
        e.preventDefault();
        break;
      case 'ArrowRight':
        setPan(p => ({ ...p, x: p.x - PAN_STEP }));
        e.preventDefault();
        break;
      case '+':
      case '=':
        zoomIn();
        e.preventDefault();
        break;
      case '-':
        zoomOut();
        e.preventDefault();
        break;
      case '0':
        resetView();
        e.preventDefault();
        break;
      case 'f':
        zoomFit();
        e.preventDefault();
        break;
    }
  }, [zoomIn, zoomOut, resetView, zoomFit]);

  // Set up global mouse/touch listeners for panning
  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPanning, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div
      ref={containerRef}
      className={`map-canvas relative overflow-hidden ${className}`}
      style={{
        cursor: isPanning ? 'grabbing' : 'grab',
        touchAction: 'none'
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Transformed content area */}
      <div
        className="map-content absolute"
        style={{
          width: width,
          height: height,
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.1s ease-out'
        }}
      >
        {children}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-50">
        <button
          onClick={zoomIn}
          className="w-10 h-10 rounded-lg bg-zinc-800/90 border border-amber-500/30 text-amber-400 hover:bg-zinc-700 hover:border-amber-500/50 transition-colors flex items-center justify-center text-xl font-bold"
          title="Zoom in (+)"
        >
          +
        </button>
        <div className="text-center text-xs text-zinc-500 font-mono">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={zoomOut}
          className="w-10 h-10 rounded-lg bg-zinc-800/90 border border-amber-500/30 text-amber-400 hover:bg-zinc-700 hover:border-amber-500/50 transition-colors flex items-center justify-center text-xl font-bold"
          title="Zoom out (-)"
        >
          −
        </button>
        <button
          onClick={zoomFit}
          className="w-10 h-10 rounded-lg bg-zinc-800/90 border border-amber-500/30 text-amber-400 hover:bg-zinc-700 hover:border-amber-500/50 transition-colors flex items-center justify-center text-sm"
          title="Fit to view (f)"
        >
          ⊡
        </button>
        <button
          onClick={resetView}
          className="w-10 h-10 rounded-lg bg-zinc-800/90 border border-amber-500/30 text-amber-400 hover:bg-zinc-700 hover:border-amber-500/50 transition-colors flex items-center justify-center text-sm"
          title="Reset view (0)"
        >
          ↺
        </button>
      </div>

      {/* Keyboard hint */}
      <div className="absolute bottom-4 left-4 text-xs text-zinc-600 hidden sm:block">
        Arrows: pan · +/−: zoom · 0: reset · F: fit
      </div>
    </div>
  );
};

export default MapCanvas;
