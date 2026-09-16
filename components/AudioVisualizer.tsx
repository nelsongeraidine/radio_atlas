interface AudioVisualizerProps {
  active: boolean;
}

const BAR_HEIGHTS_PX = [6, 10, 8];

export function AudioVisualizer({ active }: AudioVisualizerProps) {
  return (
    <div data-testid="audio-visualizer" aria-hidden="true" className="flex h-4 items-end gap-0.5">
      {BAR_HEIGHTS_PX.map((height, i) => (
        <span
          key={i}
          className={`w-0.5 bg-white/70 ${active ? "animate-pulse" : ""}`}
          style={{ height: active ? `${height}px` : "3px" }}
        />
      ))}
    </div>
  );
}
