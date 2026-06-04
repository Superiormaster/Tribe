// Skeleton.tsx
import { useEffect } from "react";

type SkeletonProps = {
  onComplete?: () => void;
};

export default function Skeleton({ onComplete }: SkeletonProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 1000); // or however long your skeleton animation lasts

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-700 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-800 rounded-xl" />
        ))}
      </div>
      <div className="h-72 bg-gray-800 rounded-xl" />
    </div>
  );
}