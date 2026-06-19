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
      <Link
        href="/"
        className={`inline-flex items-center gap-1 text-sm transition ${
          p.is_smoking ? 'text-zinc-400 hover:text-zinc-200' : 'text-stone-500 hover:text-stone-700'
        }`}
      >
        <ArrowLeft className="w-4 h-4" /> 検索に戻る
      </Link>

      {/* 画像ギャラリー */}
      <div className="rounded-2xl overflow-hidden">
        <ImageCarousel images={allImages} alt={p.name} variant="detail" />
      </div>

      {/* 基本情報 */}
      <div className={`rounded-2xl border p-4 space-y-3 ${
        p.is_smoking
          ? 'bg-stone-900 border-stone-800 text-zinc-100'
          : 'bg-white border-stone-100 text-stone-800'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <PolicyBadge policy={p.policy} isSmoking={p.is_smoking} />
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                p.is_smoking ? 'bg-zinc-800 text-zinc-300' : 'bg-stone-100 text-stone-600'
              }`}>
                {CATEGORY_LABELS[p.category]}
              </span>
            </div>
            <h1 className={`text-xl font-bold mt-2 ${p.is_smoking ? 'text-zinc-100' : 'text-stone-800'}`}>{p.name}</h1>
          </div>
          <div className="flex items-center gap-0">
            <FavoriteButton placeId={p.id} initialFavorited={isFavorited} />
            <VisitedButton placeId={p.id} initialVisited={isVisited} />
          </div>
        </div>

        {p.comment && (
          <p className={`text-sm leading-relaxed ${p.is_smoking ? 'text-zinc-300' : 'text-stone-600'}`}>{p.comment}</p>
        )}

        <div className={`space-y-1.5 text-sm ${p.is_smoking ? 'text-zinc-300' : 'text-stone-600'}`}>
          <div className="flex items-start gap-2">
            <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${p.is_smoking ? 'text-zinc-500' : 'text-stone-400'}`} />
            <span>{p.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className={`w-4 h-4 shrink-0 ${p.is_smoking ? 'text-zinc-500' : 'text-stone-400'}`} />
            <span>{p.station_name}（{p.area_name}）</span>
          </div>
          {p.business_hours && (
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 shrink-0 ${p.is_smoking ? 'text-zinc-500' : 'text-stone-400'}`} />
              <span>{p.business_hours}</span>
            </div>
          )}
          {(p.budget_lunch || p.budget_dinner) && (
            <div className="flex items-center gap-2">
              <Wallet className={`w-4 h-4 shrink-0 ${p.is_smoking ? 'text-zinc-500' : 'text-stone-400'}`} />
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
              <span key={line} className={`text-xs border px-2 py-0.5 rounded-full ${
                p.is_smoking
                  ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  : 'bg-blue-50 text-blue-700 border-blue-100'
              }`}>
                {p.is_smoking ? '🚬' : '🚃'} {line}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 詳細情報（犬情報/喫煙情報） */}
      <div className={`rounded-2xl border p-4 space-y-3 ${
        p.is_smoking
          ? 'bg-stone-900 border-stone-800 text-zinc-100'
          : 'bg-white border-stone-100 text-stone-800'
      }`}>
        <h2 className="font-bold flex items-center gap-2">
          {p.is_smoking ? '🚬 喫煙席情報' : '🐾 犬連れ情報'}
        </h2>
        <div className="flex flex-wrap gap-2">
          {p.dog_features.map((f) => (
            <span key={f} className={`text-sm border rounded-full px-3 py-1 ${
              p.is_smoking
                ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {f}
            </span>
          ))}
        </div>
        {p.dog_rules && (
          <div className={`flex items-start gap-2 text-sm p-3 rounded-xl ${
            p.is_smoking ? 'bg-zinc-800/50 text-zinc-300' : 'bg-stone-50 text-stone-600'
          }`}>
            <Info className={`w-4 h-4 mt-0.5 shrink-0 ${p.is_smoking ? 'text-zinc-500' : 'text-stone-400'}`} />
            <div className="space-y-1">
              <p className="font-semibold text-xs text-stone-400">{p.is_smoking ? '喫煙ルール' : '同伴ルール'}</p>
              <p>{p.dog_rules}</p>
            </div>
          </div>
        )}
      </div>

      {/* 外部リンク */}
      <div className={`rounded-2xl border p-4 space-y-2 ${
        p.is_smoking
          ? 'bg-stone-900 border-stone-800 text-zinc-100'
          : 'bg-white border-stone-100 text-stone-800'
      }`}>
        <h2 className="font-bold">外部リンク</h2>
        <div className="space-y-2">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.address}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 text-sm font-medium hover:underline ${
              p.is_smoking ? 'text-blue-400' : 'text-blue-700'
            }`}
          >
            <Map className="w-4 h-4" /> Google マップで見る
          </a>
          {p.tabelog_url && (
            <a
              href={p.tabelog_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 text-sm hover:underline ${
                p.is_smoking ? 'text-red-400' : 'text-red-700'
              }`}
            >
              <ExternalLink className="w-4 h-4" /> ホットペッパー
            </a>
          )}
          {p.website_url && (
            <a
              href={p.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 text-sm hover:underline ${
                p.is_smoking ? 'text-amber-400' : 'text-amber-700'
              }`}
            >
              <ExternalLink className="w-4 h-4" /> 公式サイト
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
