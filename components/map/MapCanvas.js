'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';

/**
 * MapCanvas - Pan/zoom container for the training map
 * Supports mouse drag, wheel zoom, touch gestures, keyboard controls
 */

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

export default function MapCanvas({
  children,
  width = 1800,
  height = 1650,
  initialZoom = 0.5,
  onViewChange,
  className = '',
  // Optional camera door. Pass a ref and MapCanvas fills it with an imperative handle so an
  // animation can fly the view without MapCanvas losing ownership of pan/zoom — a drag after a
  // flight still works, because the flight went through the same state.
  cameraRef = null
}) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [flightMs, setFlightMs] = useState(0); // >0 while the camera is being flown

  // The camera handle. centreOn takes a DOM element inside the map and works purely from screen
  // geometry — no map-coordinate maths, so it is correct for rotated house containers too.
  useEffect(() => {
    if (!cameraRef) return;
    cameraRef.current = {
      getView: () => ({ pan, zoom }),
      flyTo: (nextPan, nextZoom, ms = 1200) => {
        setFlightMs(ms);
        if (typeof nextZoom === 'number') setZoom(nextZoom);
        if (nextPan) setPan(nextPan);
        window.setTimeout(() => setFlightMs(0), ms + 60);
      },
      centreOn: (el, nextZoom, ms = 1200) => {
        if (!el || !containerRef.current) return;
        const view = containerRef.current.getBoundingClientRect();
        const card = el.getBoundingClientRect();
        const dx = (view.left + view.width / 2) - (card.left + card.width / 2);
        const dy = (view.top + view.height / 2) - (card.top + card.height / 2);
        const z = typeof nextZoom === 'number' ? nextZoom : zoom;
        // The pan delta is in screen pixels; if we also change zoom, the card's offset from the
        // map centre scales with it, so the delta has to scale too.
        const k = z / zoom;
        setFlightMs(ms);
        setZoom(z);
        setPan(p => ({ x: (p.x + dx) * k, y: (p.y + dy) * k }));
        window.setTimeout(() => setFlightMs(0), ms + 60);
      },
      reset: (ms = 800) => {
        setFlightMs(ms);
        setPan({ x: 0, y: 0 });
        setZoom(initialZoom);
        window.setTimeout(() => setFlightMs(0), ms + 60);
      }
    };
  }, [cameraRef, pan, zoom, initialZoom]);

  // Notify parent of view changes
  useEffect(() => {
    if (onViewChange) {
      onViewChange({ zoom, pan });
    }
  }, [zoom, pan, onViewChange]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
  }, []);

  // Mouse drag pan
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPanStart(pan);
  }, [pan]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setPan({ x: panStart.x + dx, y: panStart.y + dy });
  }, [isDragging, dragStart, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      const PAN_AMOUNT = 50;
      switch (e.key) {
        case '+':
        case '=':
          setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP));
          break;
        case '-':
        case '_':
          setZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP));
          break;
        case 'ArrowUp':
          setPan(p => ({ ...p, y: p.y + PAN_AMOUNT }));
          break;
        case 'ArrowDown':
          setPan(p => ({ ...p, y: p.y - PAN_AMOUNT }));
          break;
        case 'ArrowLeft':
          setPan(p => ({ ...p, x: p.x + PAN_AMOUNT }));
          break;
        case 'ArrowRight':
          setPan(p => ({ ...p, x: p.x - PAN_AMOUNT }));
          break;
        case '0':
          setZoom(1);
          setPan({ x: 0, y: 0 });
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Zoom controls
  const zoomIn = () => setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  const zoomOut = () => setZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  const resetView = () => {
    setZoom(initialZoom);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Transform container */}
      <div
        className="absolute"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isDragging
            ? 'none'
            : flightMs > 0
              ? `transform ${flightMs}ms cubic-bezier(.33,.9,.2,1)`
              : 'transform 0.1s ease-out'
        }}
      >
        {children}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-50">
        <button
          onClick={zoomIn}
          className="w-10 h-10 bg-zinc-800/90 hover:bg-zinc-700 border border-amber-500/30 rounded-lg text-amber-400 text-xl flex items-center justify-center transition-colors"
        >
          +
        </button>
        <div className="text-xs text-zinc-500 text-center font-mono">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={zoomOut}
          className="w-10 h-10 bg-zinc-800/90 hover:bg-zinc-700 border border-amber-500/30 rounded-lg text-amber-400 text-xl flex items-center justify-center transition-colors"
        >
          −
        </button>
        <button
          onClick={resetView}
          className="w-10 h-10 bg-zinc-800/90 hover:bg-zinc-700 border border-amber-500/30 rounded-lg text-amber-400 text-sm flex items-center justify-center transition-colors mt-2"
          title="Reset view"
        >
          ⌂
        </button>
      </div>
    </div>
  );
}
