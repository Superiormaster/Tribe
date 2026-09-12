'use client';

import { useEffect, useState } from 'react';
import type { MouseEvent } from "react";

type Props = {
  src?: string;
  thumb?: string;
  className?: string;
  onClick?: (
    event: React.MouseEvent<HTMLImageElement>
  ) => void;  
  priority?: boolean;
};

export default function ProgressiveImage({
  src,
  thumb,
  className = "",
  onClick,
  priority = false,
}: Props) {

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  if (!src && !thumb) return null;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onClick={onClick}
    >

      {/* Thumbnail */}
      {thumb && !loaded && (
        <img
          src={thumb}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          draggable={false}
          className="
            absolute inset-0
            w-full h-full
            object-cover
            blur-xl
            scale-110
            transition-opacity
            duration-300
          "
        />
      )}

      {/* Full media */}
      <img
        src={src || thumb}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "low"}
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        className={`
          w-full h-full object-cover
          transition-opacity duration-300
          ${loaded ? "opacity-100" : "opacity-0"}
        `}
      />

    </div>
  );
}