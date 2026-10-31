'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

import { usePrefersReducedMotion } from './motion';

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
}

/**
 * A slow drifting field of points, joined by hairlines when two pass close —
 * the constellation backdrop behind the hero and the blue sections.
 *
 * `rgb` is the colour as bare channels ("30 160 218"), so dots and lines share
 * one hue at different alphas. Drawing stops while the canvas is off screen,
 * and with reduced motion the field is painted once and left still.
 */
export function Constellation({
  rgb = '30 160 218',
  density = 1,
  className,
}: {
  rgb?: string;
  density?: number;
  className?: string;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const [r, g, b] = rgb.split(' ');
    const color = (alpha: number) => `rgba(${r},${g},${b},${alpha})`;
    let stars: Star[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;
    const pointer = { x: -9999, y: -9999 };

    const seed = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(((width * height) / 14000) * density);
      stars = Array.from({ length: Math.min(count, 160) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: Math.random() * 1.4 + 0.6,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      const link = Math.min(150, width / 7);
      for (let i = 0; i < stars.length; i++) {
        const a = stars[i];
        for (let j = i + 1; j < stars.length; j++) {
          const c = stars[j];
          const d = Math.hypot(a.x - c.x, a.y - c.y);
          if (d < link) {
            ctx.strokeStyle = color((1 - d / link) * 0.22);
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(c.x, c.y);
            ctx.stroke();
          }
        }
        // Points near the pointer reach out to it.
        const p = Math.hypot(a.x - pointer.x, a.y - pointer.y);
        if (p < link * 1.3) {
          ctx.strokeStyle = color((1 - p / (link * 1.3)) * 0.35);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }
      for (const s of stars) {
        const twinkle = 0.55 + Math.sin(time / 900 + s.phase) * 0.35;
        ctx.fillStyle = color(twinkle);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.7) {
          ctx.fillStyle = color(twinkle * 0.15);
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const tick = (time: number) => {
      frame = 0;
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < -10) s.x = width + 10;
        if (s.x > width + 10) s.x = -10;
        if (s.y < -10) s.y = height + 10;
        if (s.y > height + 10) s.y = -10;
      }
      draw(time);
      if (visible) frame = requestAnimationFrame(tick);
    };

    seed();
    if (reduced) draw(0);
    else frame = requestAnimationFrame(tick);

    const onResize = () => {
      seed();
      if (reduced) draw(0);
    };
    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduced && !frame) frame = requestAnimationFrame(tick);
    });
    observer.observe(canvas);
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
    };
  }, [rgb, density, reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
    />
  );
}
