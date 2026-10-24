"use client";

import { useEffect, useRef } from "react";
import { projectSignal, sampleSignal, SIGNAL_FORMS, SIGNAL_NODE_COUNT } from "./signal-geometry";

const TAU = Math.PI * 2;

export default function SignalField() {
  const stageRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    let context: CanvasRenderingContext2D | null = null;
    try { context = canvas.getContext("2d", { alpha: true }); } catch { /* Keep the SVG fallback. */ }
    if (!context) return;
    const ctx = context;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = { x: -1000, y: -1000, yaw: 0, pitch: 0 };
    const rotation = { yaw: 0, pitch: 0 };
    let pulses: { x: number; y: number; started: number }[] = [];
    let width = 1;
    let height = 1;
    let elapsed = 0;
    let previous: number | null = null;
    let frameId: number | null = null;
    let inView = true;
    let disposed = false;
    let lastMode = "";
    let lastStatus = "";

    const paused = () => motion.matches || document.hidden || !inView
      || document.body.classList.contains("motion-paused")
      || document.body.classList.contains("modal-open");

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const time = elapsed / 1000;
      const scale = Math.min(width * 0.34, height * 0.34);
      const cx = width / 2;
      const cy = height / 2;
      const sample = sampleSignal(time);
      const active = !paused();
      const mode = `${String(sample.mode + 1).padStart(2, "0")} / ${SIGNAL_FORMS[sample.mode]}`;
      const status = !active ? "SIGNAL HELD" : sample.morphing ? "RECONFIGURING" : "SIGNAL EVOLVING";
      if (mode !== lastMode && modeRef.current) { modeRef.current.textContent = mode; lastMode = mode; }
      if (status !== lastStatus && statusRef.current) { statusRef.current.textContent = status; lastStatus = status; }

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 1.65);
      glow.addColorStop(0, "rgba(65, 174, 232, 0.065)");
      glow.addColorStop(0.55, "rgba(42, 132, 201, 0.025)");
      glow.addColorStop(1, "rgba(42, 132, 201, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // Thin orbital paths and traveling satellites, all on a transparent canvas.
      ctx.lineWidth = 0.7;
      for (let orbit = 0; orbit < 3; orbit++) {
        const tilt = -0.45 + orbit * 0.63;
        const radius = scale * (1.25 + orbit * 0.1);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(121, 222, 255, ${0.13 - orbit * 0.025})`;
        ctx.ellipse(cx, cy, radius, radius * 0.46, tilt, 0, TAU);
        ctx.stroke();
        const angle = time * (0.22 + orbit * 0.07) + orbit * 2.2;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(121, 222, 255, 0.5)";
        ctx.ellipse(cx, cy, radius, radius * 0.46, tilt, angle - 0.22, angle);
        ctx.stroke();
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * 0.46;
        ctx.beginPath();
        ctx.fillStyle = "#b6efff";
        ctx.shadowColor = "#79deff";
        ctx.shadowBlur = 10;
        ctx.arc(cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt), 1.7, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      const yaw = time * 0.16 + rotation.yaw;
      const pitch = -0.2 + Math.sin(time * 0.17) * 0.24 + rotation.pitch;
      const projected = sample.points.map(point => {
        const p = projectSignal(point, yaw, pitch, scale);
        p.x += cx;
        p.y += cy;
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (active && distance < 85 && distance > 0) {
          const push = (1 - distance / 85) * 15;
          p.x += dx / distance * push;
          p.y += dy / distance * push;
        }
        return p;
      });

      ctx.lineWidth = 0.65;
      for (let i = 0; i < sample.points.length; i++) {
        for (let j = i + 1; j < sample.points.length; j++) {
          const a = sample.points[i];
          const b = sample.points[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
          if (distance > 0.63) continue;
          const depth = Math.max(0.15, Math.min(1, (projected[i].z + projected[j].z + 2.5) / 5));
          const shimmer = 0.75 + Math.sin(time * 1.4 + i * 0.3 + j) * 0.25;
          ctx.strokeStyle = `rgba(100, 205, 249, ${(1 - distance / 0.75) * depth * shimmer * 0.6})`;
          ctx.beginPath();
          ctx.moveTo(projected[i].x, projected[i].y);
          ctx.lineTo(projected[j].x, projected[j].y);
          ctx.stroke();
        }
      }

      projected.sort((a, b) => a.z - b.z).forEach((point, index) => {
        const brightness = Math.max(0.18, Math.min(1, (point.z + 1.6) / 2.7));
        const twinkle = 0.75 + Math.sin(time * 2 + index * 1.7) * 0.25;
        const halo = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 6 * point.perspective);
        halo.addColorStop(0, `rgba(121, 222, 255, ${brightness * 0.4})`);
        halo.addColorStop(1, "rgba(121, 222, 255, 0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6 * point.perspective, 0, TAU);
        ctx.fill();
        ctx.fillStyle = `rgba(185, 239, 255, ${brightness * twinkle})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, (index % 9 === 0 ? 1.8 : 1.1) * point.perspective, 0, TAU);
        ctx.fill();
      });

      pulses = pulses.filter(pulse => elapsed - pulse.started < 1400);
      for (const pulse of pulses) {
        const age = (elapsed - pulse.started) / 1400;
        ctx.strokeStyle = `rgba(121, 222, 255, ${(1 - age) * 0.65})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, age * Math.max(width, height) * 0.8, 0, TAU);
        ctx.stroke();
      }

      // Small drafting ticks give the field a technical, instrument-like edge.
      ctx.strokeStyle = "rgba(121, 222, 255, 0.28)";
      ctx.lineWidth = 1;
      for (const x of [8, width - 8]) {
        ctx.beginPath();
        ctx.moveTo(x - 3, cy); ctx.lineTo(x + 3, cy);
        ctx.moveTo(x, cy - 7); ctx.lineTo(x, cy + 7);
        ctx.stroke();
      }
    }

    function frame(now: number) {
      frameId = null;
      if (disposed || paused()) { previous = null; return; }
      if (previous === null || now - previous >= 1000 / 30) {
        elapsed += previous === null ? 0 : Math.min(60, now - previous);
        previous = now;
        rotation.yaw += (pointer.yaw - rotation.yaw) * 0.07;
        rotation.pitch += (pointer.pitch - rotation.pitch) * 0.07;
        draw();
      }
      frameId = requestAnimationFrame(frame);
    }

    function refresh() {
      if (disposed) return;
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
      previous = null;
      draw();
      if (!paused()) frameId = requestAnimationFrame(frame);
    }

    function resize() {
      if (disposed) return;
      const rect = stage!.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      refresh();
    }

    function move(event: PointerEvent) {
      if (paused()) return;
      const rect = stage!.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.yaw = (pointer.x / width - 0.5) * 0.9;
      pointer.pitch = (pointer.y / height - 0.5) * 0.6;
    }

    function leave() {
      pointer.x = -1000;
      pointer.y = -1000;
      pointer.yaw = 0;
      pointer.pitch = 0;
    }

    function pulse(event: MouseEvent) {
      if (paused()) return;
      const rect = stage!.getBoundingClientRect();
      pulses.push({
        x: event.detail === 0 ? width / 2 : event.clientX - rect.left,
        y: event.detail === 0 ? height / 2 : event.clientY - rect.top,
        started: elapsed,
      });
      pulses = pulses.slice(-3);
    }

    const bodyObserver = new MutationObserver(refresh);
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    resizeObserver?.observe(stage);
    const intersectionObserver = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      refresh();
    });
    intersectionObserver?.observe(stage);
    stage.addEventListener("pointermove", move, { passive: true });
    stage.addEventListener("pointerleave", leave);
    stage.addEventListener("click", pulse);
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", refresh);
    motion.addEventListener("change", refresh);
    stage.dataset.renderer = "canvas";
    resize();

    return () => {
      disposed = true;
      if (frameId !== null) cancelAnimationFrame(frameId);
      bodyObserver.disconnect();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerleave", leave);
      stage.removeEventListener("click", pulse);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", refresh);
      motion.removeEventListener("change", refresh);
      delete stage.dataset.renderer;
    };
  }, []);

  return (
    <div className="signal-art">
      <div className="signal-top" aria-hidden="true"><span>LIVE SIGNAL FIELD</span><span className="signal-live">● CONNECTED</span></div>
      <button ref={stageRef} className="signal-field__stage" type="button" aria-label="Send a pulse through the animated signal field" data-cursor-label="Send pulse">
        <svg className="signal-field__fallback" viewBox="0 0 400 300" fill="none" aria-hidden="true">
          <g stroke="currentColor" strokeWidth="0.7" opacity="0.55">
            <circle cx="200" cy="150" r="85" /><ellipse cx="200" cy="150" rx="40" ry="85" />
            <ellipse cx="200" cy="150" rx="85" ry="32" /><ellipse cx="200" cy="150" rx="128" ry="45" transform="rotate(-25 200 150)" />
            <ellipse cx="200" cy="150" rx="128" ry="45" transform="rotate(35 200 150)" />
          </g>
        </svg>
        <canvas ref={canvasRef} className="signal-field__canvas" aria-hidden="true" />
        <span ref={modeRef} className="signal-field__mode" aria-hidden="true">01 / ORBITAL NETWORK</span>
        <span className="signal-field__hint" aria-hidden="true">MOVE TO DISTORT / CLICK TO PULSE</span>
      </button>
      <div className="signal-bottom" aria-hidden="true"><span>{SIGNAL_NODE_COUNT} NODES / <span ref={statusRef}>SIGNAL EVOLVING</span></span><span className="signal-live signal-field__strength"><span>ENCRYPTED</span><span className="signal-field__bars"><i /><i /><i /><i /></span></span></div>
    </div>
  );
}
