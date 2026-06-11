'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';

interface Props {
  placeId: number;
  initialFavorited: boolean;
}

export function FavoriteButton({ placeId, initialFavorited }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const method = favorited ? 'DELETE' : 'POST';
      const res = await fetch('/api/favorites', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: placeId }),
      });
      if (res.ok) setFavorited(!favorited);
      if (res.status === 401) {
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={favorited ? 'お気に入り解除' : 'お気に入り登録'}
      className={`p-2 rounded-full transition ${favorited ? 'text-rose-500' : 'text-stone-400 hover:text-rose-400'}`}
    >
      <Heart className={`w-5 h-5 ${favorited ? 'fill-current' : ''}`} />
    </button>
  );
}
