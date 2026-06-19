'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';

interface Props {
  images: string[];
  alt: string;
  /** カード用は "card"（固定高め）、詳細ページは "detail"（4:3） */
  variant?: 'card' | 'detail';
}

export function ImageCarousel({ images, alt, variant = 'card' }: Props) {
  const [current, setCurrent] = useState(0);
  const [errors, setErrors] = useState<Set<number>>(new Set());

  const validImages = images.filter((_, i) => !errors.has(i));

  const containerClass = variant === 'detail'
    ? 'relative w-full aspect-[4/3] bg-stone-900 overflow-hidden'
    : 'relative w-full h-52 bg-stone-900 overflow-hidden';

  if (!validImages.length) {
    return (
      <div className={containerClass.replace('bg-stone-900', 'bg-stone-100') + ' flex items-center justify-center'}>
        <ImageOff className="w-10 h-10 text-stone-300" />
      </div>
    );
  }

  const idx = Math.min(current, validImages.length - 1);
  const src = validImages[idx];

  const prev = () => setCurrent((c) => (c === 0 ? validImages.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === validImages.length - 1 ? 0 : c + 1));

  return (
    <div className={containerClass + ' select-none'}>
      {/* ぼかし背景（引き伸ばしをごまかす） */}
      <Image
        key={`bg-${src}`}
        src={src}
        alt=""
        fill
        aria-hidden
        className="object-cover scale-110 blur-xl opacity-50"
        sizes="100vw"
        unoptimized
      />
      {/* メイン画像（引き伸ばしなし） */}
      <Image
        key={`main-${src}`}
        src={src}
        alt={`${alt} ${idx + 1}`}
        fill
        className="object-contain"
        sizes={variant === 'detail' ? '(max-width: 768px) 100vw, 640px' : '(max-width: 768px) 100vw, 400px'}
        priority={idx === 0}
        onError={() => setErrors((prev) => new Set(prev).add(images.indexOf(src)))}
      />

      {validImages.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition z-10"
            aria-label="前の画像"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition z-10"
            aria-label="次の画像"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {validImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition ${i === idx ? 'bg-white' : 'bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
