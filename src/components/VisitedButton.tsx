'use client';

import { useState } from 'react';
import { Footprints } from 'lucide-react';

interface Props {
  placeId: number;
  initialVisited: boolean;
}

export function VisitedButton({ placeId, initialVisited }: Props) {
  const [visited, setVisited] = useState(initialVisited);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const method = visited ? 'DELETE' : 'POST';
      const res = await fetch('/api/visited', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: placeId }),
      });
      if (res.ok) setVisited(!visited);
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
      aria-label={visited ? 'あしあと解除' : 'あしあと記録'}
      className={`p-2 rounded-full transition ${visited ? 'text-amber-500' : 'text-stone-400 hover:text-amber-400'}`}
    >
      <Footprints className={`w-5 h-5 ${visited ? 'fill-current' : ''}`} />
    </button>
  );
}
