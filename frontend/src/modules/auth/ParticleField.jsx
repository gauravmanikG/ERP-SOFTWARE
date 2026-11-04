import { useEffect, useRef } from "react";

/**
 * Full-bleed canvas background: a grid of dots that drift gently on their own and
 * get pushed away from the cursor when it comes near, easing back once it moves on
 * (the "antigravity.google" hover effect). Self-contained — no dependencies, no
 * React state, just a rAF loop — so it can sit behind any screen cheaply.
 */
export function ParticleField({ dotColor = "203, 213, 225", pushColor = "197, 31, 40" }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const pointsRef = useRef([]);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const SPACING = 34;   // px between resting dots
    const RADIUS = 150;   // px of cursor influence
    const MAX_PUSH = 46;  // px a dot can be displaced
    const EASE = 0.12;    // spring-back speed per frame

    const buildGrid = () => {
      const pts = [];
      const cols = Math.ceil(width / SPACING) + 2;
      const rows = Math.ceil(height / SPACING) + 2;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const bx = c * SPACING;
          const by = r * SPACING;
          pts.push({ bx, by, x: bx, y: by, r: 1.3 + Math.random() * 1.1, phase: Math.random() * Math.PI * 2 });
        }
      }
      pointsRef.current = pts;
    };

    const resize = () => {
      const parent = canvas.parentElement;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildGrid();
    };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };
    const onLeave = () => { mouseRef.current.x = -9999; mouseRef.current.y = -9999; };

    let t = 0;
    const tick = () => {
      t += 0.016;
      ctx.clearRect(0, 0, width, height);
      const { x: mx, y: my } = mouseRef.current;

      for (const p of pointsRef.current) {
        const floatX = Math.sin(t + p.phase) * 1.2;
        const floatY = Math.cos(t * 0.8 + p.phase) * 1.2;
        let targetX = p.bx + floatX;
        let targetY = p.by + floatY;

        const dx = p.bx - mx;
        const dy = p.by - my;
        const dist = Math.hypot(dx, dy);
        let nearness = 0;
        if (dist < RADIUS) {
          nearness = 1 - dist / RADIUS;
          const ang = Math.atan2(dy, dx);
          targetX += Math.cos(ang) * nearness * MAX_PUSH;
          targetY += Math.sin(ang) * nearness * MAX_PUSH;
        }

        p.x += (targetX - p.x) * EASE;
        p.y += (targetY - p.y) * EASE;

        ctx.beginPath();
        ctx.fillStyle = nearness > 0 ? `rgba(${pushColor}, ${0.35 + 0.5 * nearness})` : `rgba(${dotColor}, 0.55)`;
        ctx.arc(p.x, p.y, p.r + nearness * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [dotColor, pushColor]);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}
