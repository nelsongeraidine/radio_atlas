interface AudioVisualizerProps {
  active: boolean;
}

// Five bars with staggered CSS animations defined in globals.css.
// Using CSS classes (not inline styles) lets the browser GPU-composite the
// animation without triggering layout recalcs on every frame.
const BARS = ["bar-1", "bar-2", "bar-3", "bar-4", "bar-5"] as const;

export function AudioVisualizer({ active }: AudioVisualizerProps) {
  return (
    <div data-testid="audio-visualizer" aria-hidden="true" className="flex h-4 items-end gap-[2px]">
      {BARS.map((cls) => (
        <span
          key={cls}
          className={`w-[2px] rounded-full bg-white/70 transition-all duration-300 ${
            active ? cls : ""
          }`}
          style={{ height: active ? undefined : "3px" }}
        />
      ))}
    </div>
  );
}
