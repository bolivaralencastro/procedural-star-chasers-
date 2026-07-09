import { createSignal, onCleanup, onMount } from 'solid-js';
import type { PerfMonitor, PerfSnapshot } from '../../game/core/perf-monitor';

interface PerfOverlayProps {
  perf: PerfMonitor;
  renderStats: { drawn: number; total: number };
}

interface HeapReading {
  usedMB: number;
  growthMBps: number;
}

/**
 * Dev-only performance HUD, mounted when the URL has ?debug=perf.
 * Polls the engine's PerfMonitor a few times a second (not per frame) so
 * the overlay itself doesn't distort what it measures.
 */
export function PerfOverlay(props: PerfOverlayProps) {
  const [snap, setSnap] = createSignal<PerfSnapshot>(props.perf.snapshot());
  const [heap, setHeap] = createSignal<HeapReading | null>(null);
  const [drawn, setDrawn] = createSignal({ drawn: 0, total: 0 });

  onMount(() => {
    let lastHeapBytes = 0;
    let lastHeapTime = performance.now();

    const id = window.setInterval(() => {
      setSnap(props.perf.snapshot());
      setDrawn({ ...props.renderStats });

      // performance.memory is Chromium-only; degrade gracefully elsewhere.
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
      if (mem) {
        const now = performance.now();
        const used = mem.usedJSHeapSize;
        if (lastHeapBytes !== 0) {
          const dtSec = (now - lastHeapTime) / 1000;
          const growth = ((used - lastHeapBytes) / 1048576 / dtSec) * 5; // MB per 5s
          setHeap({ usedMB: used / 1048576, growthMBps: growth });
        }
        lastHeapBytes = used;
        lastHeapTime = now;
      }
    }, 500);

    onCleanup(() => clearInterval(id));
  });

  const color = (value: number, warn: number, bad: number) =>
    value >= bad ? '#f87171' : value >= warn ? '#fbbf24' : '#4ade80';

  const ms = (v: number) => v.toFixed(1);

  return (
    <div class="pointer-events-none fixed bottom-4 left-4 z-[100] select-none rounded-lg border border-white/10 bg-black/80 px-3 py-2 font-mono text-[11px] leading-relaxed text-gray-200 shadow-2xl backdrop-blur-md">
      <div class="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-gray-500">
        <span>Perf</span>
        <span class="text-gray-600">·</span>
        <span>{snap().sampleCount} frames</span>
      </div>
      <div class="grid grid-cols-[auto_auto] gap-x-4">
        <span class="text-gray-400">FPS</span>
        <span style={{ color: color(60 - snap().fps, 5, 15) }}>{snap().fps.toFixed(0)}</span>

        <span class="text-gray-400">p50 / p95</span>
        <span>
          {ms(snap().p50)} / <span style={{ color: color(snap().p95, 14, 20) }}>{ms(snap().p95)}</span> ms
        </span>

        <span class="text-gray-400">p99 / max</span>
        <span>{ms(snap().p99)} / {ms(snap().max)} ms</span>

        <span class="text-gray-400">jank &gt;20ms</span>
        <span style={{ color: color(snap().jankFrames, 1, 10) }}>{snap().jankFrames}</span>

        <span class="text-gray-400">entities</span>
        <span>{drawn().drawn} / {drawn().total}</span>

        {heap() && (
          <>
            <span class="text-gray-400">heap</span>
            <span>{heap()!.usedMB.toFixed(0)} MB</span>

            <span class="text-gray-400">growth/5s</span>
            <span style={{ color: color(heap()!.growthMBps, 0.5, 2) }}>
              {heap()!.growthMBps >= 0 ? '+' : ''}{heap()!.growthMBps.toFixed(2)} MB
            </span>
          </>
        )}
      </div>
    </div>
  );
}
