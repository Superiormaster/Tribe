export default function ReelSkeleton() {
  return (
    <div className="absolute h-screen inset-0 z-30 bg-black animate-pulse">
      {/* Background */}
      <div className="absolute inset-0 bg-neutral-900" />

      {/* Loading Spinner */}
      <div className="absolute inset-0 flex items-center justify-center gap-2">
        <div className="w-3 h-3 rounded-full bg-white animate-bounce" />
        <div
          className="w-3 h-3 rounded-full bg-white animate-bounce"
          style={{ animationDelay: "0.15s" }}
        />
        <div
          className="w-3 h-3 rounded-full bg-white animate-bounce"
          style={{ animationDelay: "0.3s" }}
        />
      </div>

      {/* Right Actions */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5">
        <div className="w-12 h-12 rounded-full bg-white/10" />
        <div className="w-12 h-12 rounded-full bg-white/10" />
        <div className="w-12 h-12 rounded-full bg-white/10" />
        <div className="w-12 h-12 rounded-full bg-white/10" />
      </div>

      {/* Caption */}
      <div className="absolute left-4 bottom-10 space-y-3 w-2/3">
        <div className="h-5 w-32 rounded bg-white/10" />
        <div className="h-4 w-full rounded bg-white/10" />
        <div className="h-4 w-3/4 rounded bg-white/10" />
      </div>

      {/* Top Back Button */}
      <div className="absolute top-4 left-4 h-12 w-56 rounded-full bg-white/10" />

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
        <div className="h-full w-1/3 bg-white/30 animate-pulse" />
      </div>
    </div>
  );
}