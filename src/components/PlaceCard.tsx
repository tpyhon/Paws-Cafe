'use client';

import Link from 'next/link';
import { MapPin, Clock, Wallet, Map, ExternalLink } from 'lucide-react';
import { Place, CATEGORY_LABELS } from '@/lib/types';
import { ImageCarousel } from './ImageCarousel';
import { PolicyBadge } from './PolicyBadge';
import { FavoriteButton } from './FavoriteButton';
import { VisitedButton } from './VisitedButton';

interface Props {
  place: Place;
  isFavorited?: boolean;
  isVisited?: boolean;
  distanceMeters?: number;
}

function googleMapsUrl(place: Place) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} ${place.address}`)}`;
}

export function PlaceCard({ place, isFavorited = false, isVisited = false, distanceMeters }: Props) {
  const allImages = [
    ...(place.image_url ? [place.image_url] : []),
    ...(place.interior_images ?? []),
  ];

  const distanceText = distanceMeters != null
    ? distanceMeters < 1000
      ? `${Math.round(distanceMeters)}m`
      : `${(distanceMeters / 1000).toFixed(1)}km`
    : null;

  return (
    <div className={`rounded-2xl shadow-sm border overflow-hidden transition ${
      place.is_smoking
        ? 'bg-stone-900 border-stone-800 text-zinc-100'
        : 'bg-white border-stone-100 text-stone-800'
    }`}>
      <div className="relative">
        <ImageCarousel images={allImages} alt={place.name} />
        <div className="absolute top-2 left-2">
          <PolicyBadge policy={place.policy} size="sm" isSmoking={place.is_smoking} />
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/places/${place.id}`} className="flex-1 min-w-0">
            <h3 className={`font-bold text-base leading-tight transition truncate ${
              place.is_smoking
                ? 'text-zinc-100 hover:text-zinc-300'
                : 'text-stone-800 hover:text-amber-700'
            }`}>
              {place.name}
            </h3>
            <p className={`text-xs mt-0.5 ${place.is_smoking ? 'text-zinc-400' : 'text-stone-500'}`}>
              {CATEGORY_LABELS[place.category]} · {place.station_name}
            </p>
          </Link>
          <div className="flex items-center shrink-0">
            <FavoriteButton placeId={place.id} initialFavorited={isFavorited} />
            <VisitedButton placeId={place.id} initialVisited={isVisited} />
          </div>
        </div>

        {place.comment && (
          <p className={`text-sm mt-2 line-clamp-2 ${place.is_smoking ? 'text-zinc-300' : 'text-stone-600'}`}>{place.comment}</p>
        )}

        <div className="flex flex-wrap gap-1 mt-3">
          {place.dog_features.slice(0, 4).map((f) => (
            <span
              key={f}
              className={`text-xs border rounded-full px-2 py-0.5 ${
                place.is_smoking
                  ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {f}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className={`flex items-center gap-3 text-xs flex-wrap ${place.is_smoking ? 'text-zinc-400' : 'text-stone-500'}`}>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {distanceText ?? place.area_name}
            </span>
            {place.business_hours && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {place.business_hours}
              </span>
            )}
            {(place.budget_lunch || place.budget_dinner) && (
              <span className="flex items-center gap-1">
                <Wallet className="w-3 h-3" />
                {place.budget_lunch ?? place.budget_dinner}
              </span>
            )}
          </div>

          {/* 外部リンク */}
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <a
              href={googleMapsUrl(place)}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1 text-xs hover:underline ${
                place.is_smoking ? 'text-blue-400' : 'text-blue-600'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <Map className="w-3 h-3" />
              地図
            </a>
            {place.tabelog_url && (
              <a
                href={place.tabelog_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-1 text-xs hover:underline ${
                  place.is_smoking ? 'text-red-400' : 'text-red-600'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
                ホットペッパー
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
