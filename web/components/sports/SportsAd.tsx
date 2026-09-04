// src/components/sports/SportsAd.tsx

interface SportsAdProps {
  label?: string;
  className?: string;
  minHeight?: number;
}

export default function SportsAd({
  label = "Advertisement",
  className = "",
  minHeight = 100,
}: SportsAdProps) {
  return (
    <div
      className={`w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900 ${className}`}
      style={{ minHeight }}
      aria-label="Advertisement"
    >
      <div className="flex min-h-[inherit] items-center justify-center px-4 py-6">
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {label}
        </span>
      </div>
    </div>
  );
}