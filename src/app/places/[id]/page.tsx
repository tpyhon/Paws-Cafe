import { notFound } from 'next/navigation';
import { MapPin, Clock, Wallet, ExternalLink, ArrowLeft, Info, Map } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Place, CATEGORY_LABELS } from '@/lib/types';
import { ImageCarousel } from '@/components/ImageCarousel';
import { PolicyBadge } from '@/components/PolicyBadge';
import { FavoriteButton } from '@/components/FavoriteButton';
import { VisitedButton } from '@/components/VisitedButton';

export default async function PlaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: place, error }, { data: { user } }] = await Promise.all([
    supabase.from('dog_friendly_places').select('*').eq('id', id).single(),
    supabase.auth.getUser(),
  ]);

  if (error || !place) notFound();

  const p = place as Place;

  let isFavorited = false;
  let isVisited = false;

  if (user) {
    const [fav, vis] = await Promise.all([
      supabase.from('user_favorites').select('id').eq('user_id', user.id).eq('place_id', p.id).maybeSingle(),
      supabase.from('user_visited').select('id').eq('user_id', user.id).eq('place_id', p.id).maybeSingle(),
    ]);
    isFavorited = !!fav.data;
    isVisited = !!vis.data;
  }

  const allImages = [
    ...(p.image_url ? [p.image_url] : []),
    ...(p.interior_images ?? []),
  ];

  return (
    <div className="space-y-4 pb-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700">
        <ArrowLeft className="w-4 h-4" /> 検索に戻る
      </Link>

      {/* 画像ギャラリー */}
      <div className="rounded-2xl overflow-hidden">
        <ImageCarousel images={allImages} alt={p.name} />
      </div>

      {/* 基本情報 */}
      <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <PolicyBadge policy={p.policy} />
              <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                {CATEGORY_LABELS[p.category]}
              </span>
            </div>
            <h1 className="text-xl font-bold text-stone-800 mt-2">{p.name}</h1>
          </div>
          <div className="flex items-center gap-0">
            <FavoriteButton placeId={p.id} initialFavorited={isFavorited} />
            <VisitedButton placeId={p.id} initialVisited={isVisited} />
          </div>
        </div>

        {p.comment && (
          <p className="text-sm text-stone-600 leading-relaxed">{p.comment}</p>
        )}

        <div className="space-y-1.5 text-sm text-stone-600">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-stone-400" />
            <span>{p.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 shrink-0 text-stone-400" />
            <span>{p.station_name}（{p.area_name}）</span>
          </div>
          {p.business_hours && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0 text-stone-400" />
              <span>{p.business_hours}</span>
            </div>
          )}
          {(p.budget_lunch || p.budget_dinner) && (
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 shrink-0 text-stone-400" />
              <span>
                {p.budget_lunch && `ランチ ${p.budget_lunch}`}
                {p.budget_lunch && p.budget_dinner && ' / '}
                {p.budget_dinner && `ディナー ${p.budget_dinner}`}
              </span>
            </div>
          )}
        </div>

        {/* 路線タグ */}
        {p.lines.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {p.lines.map((line) => (
              <span key={line} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                🚃 {line}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 犬連れ情報 */}
      <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
        <h2 className="font-bold text-stone-800 flex items-center gap-2">
          🐾 犬連れ情報
        </h2>
        <div className="flex flex-wrap gap-2">
          {p.dog_features.map((f) => (
            <span key={f} className="text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1">
              {f}
            </span>
          ))}
        </div>
        {p.dog_rules && (
          <div className="flex items-start gap-2 text-sm text-stone-600 bg-stone-50 p-3 rounded-xl">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-stone-400" />
            <p>{p.dog_rules}</p>
          </div>
        )}
      </div>

      {/* 外部リンク */}
      <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-2">
        <h2 className="font-bold text-stone-800">外部リンク</h2>
        <div className="space-y-2">
          {/* Google Maps は常に表示（name+addressから生成） */}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.address}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-700 hover:underline font-medium"
          >
            <Map className="w-4 h-4" /> Google マップで見る
          </a>
          {p.tabelog_url && (
            <a
              href={p.tabelog_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-red-700 hover:underline"
            >
              <ExternalLink className="w-4 h-4" /> ホットペッパー
            </a>
          )}
          {p.website_url && (
            <a
              href={p.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-amber-700 hover:underline"
            >
              <ExternalLink className="w-4 h-4" /> 公式サイト
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
