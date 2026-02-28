export function Waveform({ active }: { active: boolean }) {
  if (!active) {
    return (
      <div className="flex items-center justify-center gap-1 h-8">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="w-1 h-1 rounded-full bg-gray-300" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="waveform-bar w-1 h-full" />
      ))}
    </div>
  );
}
