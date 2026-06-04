'use client';

import { useEffect, useState } from 'react';

type Props = {
  query: string;
  onGifSelect: (gif: any) => void;
};

export default function GifSection({
  query,
  onGifSelect,
}: Props) {
  const GIPHY_KEY =
    process.env.NEXT_PUBLIC_GIPHY_KEY!;

  const [gifs, setGifs] = useState<any[]>([]);
  const [loading, setLoading] =
    useState(false);

  const fetchGifs = async (
    search = 'trending'
  ) => {
    try {
      setLoading(true);

      const endpoint =
        search === 'trending'
          ? `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=24`
          : `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${search}&limit=24`;

      const res = await fetch(endpoint);

      const data = await res.json();

      setGifs(data.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (query.trim().length > 1) {
      fetchGifs(query);
    } else {
      fetchGifs();
    }
  }, [query]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        Loading GIFs...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-2">
        {gifs.map((gif) => (
          <img
            key={gif.id}
            src={gif.images.fixed_width.url}
            alt={gif.title}
            className="
              rounded-xl
              cursor-pointer
              hover:opacity-80
              transition
            "
            onClick={() => onGifSelect(gif)}
          />
        ))}
      </div>
    </div>
  );
}