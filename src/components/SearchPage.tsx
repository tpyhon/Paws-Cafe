'use client';

import { useState, useCallback } from 'react';
import { MapPin, Train, Map, Loader2, Search } from 'lucide-react';
import { Place, MAJOR_LINES, MAJOR_AREAS, DogPolicyType, POLICY_LABELS } from '@/lib/types';
import { PlaceCard } from './PlaceCard';

type Tab = 'nearby' | 'line' | 'area';

export function SearchPage() {
  const [tab, setTab] = useState<Tab>('nearby');
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const [selectedLine, setSelectedLine] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<DogPolicyType | ''>('');

  const search = useCallback(async (params: URLSearchParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/places/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlaces(data.places ?? []);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '検索に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  const searchNearby = useCallback(() => {
    if (!navigator.geolocation) {
      setError('このブラウザは位置情報に対応していません');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const params = new URLSearchParams({
          lat: String(coords.latitude),
          lng: String(coords.longitude),
        });
        if (selectedPolicy) params.set('policy', selectedPolicy);
        search(params);
      },
      () => {
        setLoading(false);
        setError('位置情報の取得に失敗しました。ブラウザの設定を確認してください。');
      }
    );
  }, [search, selectedPolicy]);

  const searchByLine = useCallback(() => {
    if (!selectedLine) return;
    const params = new URLSearchParams({ line: selectedLine });
    if (selectedPolicy) params.set('policy', selectedPolicy);
    search(params);
  }, [search, selectedLine, selectedPolicy]);

  const searchByArea = useCallback(() => {
    if (!selectedArea) return;
    const params = new URLSearchParams({ area: selectedArea });
    if (selectedPolicy) params.set('policy', selectedPolicy);
    search(params);
  }, [search, selectedArea, selectedPolicy]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'nearby', label: '現在地から', icon: <MapPin className="w-4 h-4" /> },
    { id: 'line', label: '路線から', icon: <Train className="w-4 h-4" /> },
    { id: 'area', label: 'エリアから', icon: <Map className="w-4 h-4" /> },
  ];

  const policyOptions: { value: DogPolicyType | ''; label: string }[] = [
    { value: '', label: 'すべて' },
    { value: 'inside_ok', label: POLICY_LABELS['inside_ok'] },
    { value: 'terrace_only', label: POLICY_LABELS['terrace_only'] },
    { value: 'some_seats_ok', label: POLICY_LABELS['some_seats_ok'] },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-stone-800">
          🐾 愛犬と行けるお店を探そう
        </h1>
        <p className="text-sm text-stone-500 mt-1">東京都内の犬同伴OKカフェ・レストラン</p>
      </div>

      {/* 検索カード */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        {/* タブ */}
        <div className="flex border-b border-stone-100">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSearched(false); setPlaces([]); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition ${
                tab === t.id
                  ? 'text-amber-700 border-b-2 border-amber-500 bg-amber-50/50'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4">
          {/* ポリシーフィルター（共通） */}
          <div className="flex gap-2 flex-wrap">
            {policyOptions.map((p) => (
              <button
                key={p.value}
                onClick={() => setSelectedPolicy(p.value as DogPolicyType | '')}
                className={`text-xs px-3 py-1 rounded-full border transition ${
                  selectedPolicy === p.value
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'border-stone-200 text-stone-600 hover:border-amber-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* タブごとの入力 */}
          {tab === 'nearby' && (
            <button
              onClick={searchNearby}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
              {loading ? '検索中...' : '現在地から1.2km以内を検索'}
            </button>
          )}

          {tab === 'line' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {MAJOR_LINES.map((line) => (
                  <button
                    key={line}
                    onClick={() => setSelectedLine(line)}
                    className={`text-sm py-2 px-3 rounded-xl border text-left transition ${
                      selectedLine === line
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'border-stone-200 text-stone-700 hover:border-amber-300'
                    }`}
                  >
                    {line}
                  </button>
                ))}
              </div>
              <button
                onClick={searchByLine}
                disabled={!selectedLine || loading}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {loading ? '検索中...' : selectedLine ? `${selectedLine}沿線を検索` : '路線を選択してください'}
              </button>
            </div>
          )}

          {tab === 'area' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {MAJOR_AREAS.map((area) => (
                  <button
                    key={area}
                    onClick={() => setSelectedArea(area)}
                    className={`text-sm py-2 px-3 rounded-xl border text-left transition ${
                      selectedArea === area
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'border-stone-200 text-stone-700 hover:border-amber-300'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
              <button
                onClick={searchByArea}
                disabled={!selectedArea || loading}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {loading ? '検索中...' : selectedArea ? `${selectedArea}を検索` : 'エリアを選択してください'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* エラー */}
      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      {/* 検索結果 */}
      {searched && !loading && (
        <div>
          <p className="text-sm text-stone-500 mb-3">
            {places.length > 0 ? `${places.length}件見つかりました` : '条件に合うお店が見つかりませんでした'}
          </p>
          <div className="space-y-4">
            {places.map((place) => (
              <PlaceCard key={place.id} place={place} distanceMeters={place.distance_meters} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
