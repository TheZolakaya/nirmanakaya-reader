'use client';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * UnfoldPanel - 3D origami-style panel animation wrapper
 *
 * Panels "unfold" from behind a center anchor point like paper folding.
 * - direction="down": Panel unfolds downward (for controls ABOVE the anchor)
 * - direction="up": Panel unfolds upward (for controls BELOW the anchor)
 *
 * The animation uses CSS 3D transforms (rotateX + perspective) for the
 * paper-fold effect, with Framer Motion handling the orchestration.
 */
const UnfoldPanel = ({
  children,
  isOpen,
  direction = 'down',  // 'down' = unfolds downward, 'up' = unfolds upward
  delay = 0,
  duration = 0.4,
  className = '',
  onAnimationComplete,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Origin point: top edge for 'down', bottom edge for 'up'
  const origin = direction === 'down' ? 'top' : 'bottom';

  // Mobile gets reduced animation intensity
  const perspective = isMobile ? 800 : 1000;
  const rotationAngle = isMobile ? 60 : 90;
  const effectiveDuration = isMobile ? duration * 0.75 : duration;

  // Reduced motion: instant show/hide
  if (prefersReducedMotion) {
    return (
      <div
        className={className}
        style={{
          opacity: isOpen ? 1 : 0,
          display: isOpen ? 'block' : 'none',
          transition: 'opacity 0.15s ease'
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={`unfold-container ${className}`}
      style={{
        perspective: `${perspective}px`,
        perspectiveOrigin: `center ${origin}`,
      }}
    >
      <motion.div
        className="unfold-panel"
        style={{
          transformStyle: 'preserve-3d',
          transformOrigin: `center ${origin}`,
          backfaceVisibility: 'hidden',
        }}
        initial={false}
        animate={{
          rotateX: isOpen ? 0 : (direction === 'down' ? -rotationAngle : rotationAngle),
          opacity: isOpen ? 1 : 0,
          scaleY: isOpen ? 1 : 0.8,
        }}
        transition={{
          duration: effectiveDuration,
          // On open: use provided delay. On close: reverse the stagger order
          delay: isOpen ? delay : Math.max(0, 0.3 - delay),
          // Custom spring-like easing with slight overshoot
          ease: [0.34, 1.56, 0.64, 1],
        }}
        onAnimationComplete={onAnimationComplete}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

export default UnfoldPanel;
