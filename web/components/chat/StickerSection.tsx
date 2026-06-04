'use client';

import { useEffect, useState } from 'react';

type Props = {
  query: string;
  onStickerSelect: (sticker: any) => void;
};

export default function StickerSection({
  query,
  onStickerSelect,
}: Props) {
  const GIPHY_KEY =
    process.env.NEXT_PUBLIC_GIPHY_KEY!;

  const [stickers, setStickers] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(false);

  const fetchStickers = async (
    search = 'funny'
  ) => {
    try {
      setLoading(true);

      const endpoint =
        search === 'trending'
          ? `https://api.giphy.com/v1/stickers/trending?api_key=${GIPHY_KEY}&limit=24`
          : `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_KEY}&q=${search}&limit=24`;

      const res = await fetch(endpoint);

      const data = await res.json();

      setStickers(data.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (query.trim().length > 1) {
      fetchStickers(query);
    } else {
      fetchStickers('trending');
    }
  }, [query]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        Loading Stickers...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pr-2">
      <div className="grid grid-cols-3 gap-3">
        {stickers.map((sticker) => (
          <img
            key={sticker.id}
            src={sticker.images.fixed_width.url}
            alt={sticker.title}
            className="
              rounded-xl
              cursor-pointer
              hover:scale-105
              transition
            "
            onClick={() =>
              onStickerSelect(sticker)
            }
          />
        ))}
      </div>
    </div>
  );
}