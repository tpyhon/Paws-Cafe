'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';

interface Props {
  images: string[];
  alt: string;
}

export function ImageCarousel({ images, alt }: Props) {
  const [current, setCurrent] = useState(0);

  if (!images.length) {
    return (
      <div className="w-full h-48 bg-stone-100 flex items-center justify-center rounded-xl">
        <ImageOff className="w-10 h-10 text-stone-300" />
      </div>
    );
  }

  const prev = () => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));

  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden bg-stone-100 select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[current]}
        alt={`${alt} ${current + 1}`}
        className="w-full h-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
      />
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition"
            aria-label="前の画像"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition"
            aria-label="次の画像"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition ${i === current ? 'bg-white' : 'bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
