"use client";

// ════════════════════════════════════════════════════════════════
// De bol: een levende 3D-deeltjessfeer (canvas, geen libraries).
// Punten op een fibonacci-sfeer, geroteerd en geprojecteerd, met
// lijnen tussen buren. Het gedrag volgt de staat van Jarvis:
//   idle      → rustig draaien, langzame ademhaling
//   listening → uitgezet en fel, snelle puls (hij hoort je)
//   thinking  → sneller draaien, samengetrokken
//   speaking  → pulseert op het ritme van het spreken
// ════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";

export type OrbMode = "idle" | "listening" | "thinking" | "speaking";

interface P3 {
  x: number;
  y: number;
  z: number;
}

function spherePoints(n: number): P3[] {
  // Fibonacci-sfeer: mooi gelijkmatig verdeeld.
  const pts: P3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
  }
  return pts;
}

const MODE_CONF: Record<OrbMode, { speed: number; scale: number; pulse: number; pulseHz: number; glow: number }> = {
  idle: { speed: 0.12, scale: 1.0, pulse: 0.02, pulseHz: 0.25, glow: 0.55 },
  listening: { speed: 0.2, scale: 1.12, pulse: 0.05, pulseHz: 1.4, glow: 1.0 },
  thinking: { speed: 0.85, scale: 0.88, pulse: 0.03, pulseHz: 2.2, glow: 0.8 },
  speaking: { speed: 0.3, scale: 1.05, pulse: 0.075, pulseHz: 3.0, glow: 0.9 },
};

export function JarvisOrb({ mode }: { mode: OrbMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modeRef = useRef<OrbMode>(mode);
  modeRef.current = mode;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const points = spherePoints(220);
    // Vaste buren éénmalig bepalen (dichtstbijzijnde punten op de sfeer),
    // zodat de lijnen stabiel zijn en het frame goedkoop blijft.
    const neighbors: [number, number][] = [];
    for (let i = 0; i < points.length; i++) {
      const dists = points
        .map((p, j) => ({ j, d: (p.x - points[i].x) ** 2 + (p.y - points[i].y) ** 2 + (p.z - points[i].z) ** 2 }))
        .filter((e) => e.j > i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const e of dists) neighbors.push([i, e.j]);
    }

    let raf = 0;
    let rotY = 0;
    let rotX = 0.35;
    // Zachte overgangen tussen staten.
    let curSpeed = MODE_CONF.idle.speed;
    let curScale = MODE_CONF.idle.scale;
    let curGlow = MODE_CONF.idle.glow;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const conf = MODE_CONF[modeRef.current];

      // Traag naar de doelwaarden toe bewegen (lerp).
      curSpeed += (conf.speed - curSpeed) * Math.min(1, dt * 3);
      curScale += (conf.scale - curScale) * Math.min(1, dt * 3);
      curGlow += (conf.glow - curGlow) * Math.min(1, dt * 3);

      rotY += curSpeed * dt;
      rotX += curSpeed * 0.23 * dt;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const t = now / 1000;
      const breath = 1 + Math.sin(t * Math.PI * 2 * conf.pulseHz) * conf.pulse;
      const R = Math.min(w, h) * 0.36 * curScale * breath;
      const cx = w / 2;
      const cy = h / 2;

      // Kern-gloed
      const halo = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.5);
      halo.addColorStop(0, `rgba(80, 180, 255, ${0.16 * curGlow})`);
      halo.addColorStop(0.6, `rgba(60, 140, 255, ${0.05 * curGlow})`);
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      // Roteren + projecteren
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const proj = points.map((p) => {
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;
        const y1 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;
        const depth = (z2 + 1.6) / 2.6; // 0 (achter) .. 1 (voor)
        return { sx: cx + x1 * R, sy: cy + y1 * R, depth };
      });

      // Lijnen
      ctx.lineWidth = 0.7;
      for (const [a, b] of neighbors) {
        const pa = proj[a];
        const pb = proj[b];
        const d = (pa.depth + pb.depth) / 2;
        ctx.strokeStyle = `rgba(90, 190, 255, ${(0.05 + d * 0.22) * curGlow})`;
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.stroke();
      }

      // Punten
      for (const p of proj) {
        const size = 0.6 + p.depth * 1.7;
        ctx.fillStyle = `rgba(150, 215, 255, ${(0.25 + p.depth * 0.65) * curGlow})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, size, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const label: Record<OrbMode, string> = {
    idle: "Online",
    listening: "Luistert…",
    thinking: "Denkt na…",
    speaking: "Spreekt",
  };

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="w-full h-[240px] block" aria-hidden />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted">
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            mode === "idle" ? "bg-emerald-400" : mode === "listening" ? "bg-red-400 animate-pulse" : "bg-sky-400 animate-pulse"
          }`}
        />
        {label[mode]}
      </div>
    </div>
  );
}
