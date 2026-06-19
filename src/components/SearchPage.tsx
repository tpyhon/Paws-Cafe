'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Train, Map, Loader2, Search, Navigation, Cigarette, CigaretteOff } from 'lucide-react';
import { Place, MAJOR_LINES, MAJOR_AREAS, DogPolicyType, POLICY_LABELS, SMOKING_POLICY_LABELS } from '@/lib/types';
import { PlaceCard } from './PlaceCard';

const MapPinSearch = dynamic(
  () => import('./MapPinSearch').then((m) => m.MapPinSearch),
  {
    ssr: false,
    loading: () => <div className="h-[260px] bg-stone-100 rounded-xl animate-pulse" />,
  }
);

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

  // 地図検索用
  const [mapMode, setMapMode] = useState(false);
  const [pinLat, setPinLat] = useState(35.6762);   // 東京デフォルト
  const [pinLng, setPinLng] = useState(139.6503);
  const [radius, setRadius] = useState(1200);

  const [isSmokingMode, setIsSmokingMode] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('isSmokingMode');
    if (saved === 'true') {
      setIsSmokingMode(true);
    }
  }, []);

  // Sync to localStorage and body styles
  useEffect(() => {
    localStorage.setItem('isSmokingMode', String(isSmokingMode));
    if (isSmokingMode) {
      document.body.classList.add('dark');
      document.body.style.backgroundColor = '#0c0a09'; // stone-950
    } else {
      document.body.classList.remove('dark');
      document.body.style.backgroundColor = '#faf9f7'; // normal cream bg
    }
    return () => {
      document.body.classList.remove('dark');
      document.body.style.backgroundColor = '';
    };
  }, [isSmokingMode]);

  const search = useCallback(async (params: URLSearchParams) => {
    setLoading(true);
    setError(null);
    try {
      params.set('is_smoking', String(isSmokingMode));
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
  }, [isSmokingMode]);

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
          radius: String(radius),
        });
        if (selectedPolicy) params.set('policy', selectedPolicy);
        search(params);
      },
      () => {
        setLoading(false);
        setError('位置情報の取得に失敗しました。ブラウザの設定を確認してください。');
      }
    );
  }, [search, selectedPolicy, radius]);

  const getGpsAndSetPin = useCallback(() => {
    if (!navigator.geolocation) {
      setError('このブラウザは位置情報に対応していません');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPinLat(coords.latitude);
        setPinLng(coords.longitude);
        setLoading(false);
      },
      () => {
        setLoading(false);
        setError('位置情報の取得に失敗しました。ブラウザの設定を確認してください。');
      }
    );
  }, []);

  const searchByPin = useCallback(() => {
    const params = new URLSearchParams({
      lat: String(pinLat),
      lng: String(pinLng),
      radius: String(radius),
    });
    if (selectedPolicy) params.set('policy', selectedPolicy);
    search(params);
  }, [search, pinLat, pinLng, radius, selectedPolicy]);

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
    { value: 'inside_ok', label: isSmokingMode ? SMOKING_POLICY_LABELS['inside_ok'] : POLICY_LABELS['inside_ok'] },
    { value: 'terrace_only', label: isSmokingMode ? SMOKING_POLICY_LABELS['terrace_only'] : POLICY_LABELS['terrace_only'] },
    { value: 'some_seats_ok', label: isSmokingMode ? SMOKING_POLICY_LABELS['some_seats_ok'] : POLICY_LABELS['some_seats_ok'] },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="text-center py-4 relative">
        {/* 隠しボタン: cigarette icon in top right corner */}
        <button
          onClick={() => {
            setIsSmokingMode(prev => {
              const next = !prev;
              setPlaces([]);
              setSearched(false);
              setError(null);
              return next;
            });
          }}
          className={`absolute top-2 right-2 p-1.5 rounded-lg opacity-20 hover:opacity-80 transition cursor-pointer ${
            isSmokingMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-stone-300 hover:text-stone-500'
          }`}
          title="隠しモード切替"
          aria-label="秘密のモード"
        >
          {isSmokingMode ? <CigaretteOff className="w-5 h-5" /> : <Cigarette className="w-5 h-5" />}
        </button>
        <h1 className={`text-2xl font-bold transition ${isSmokingMode ? 'text-zinc-100' : 'text-stone-800'}`}>
          {isSmokingMode ? '🚬 秘密の喫煙スポットを探そう' : '🐾 愛犬と行けるお店を探そう'}
        </h1>
        <p className={`text-sm mt-1 transition ${isSmokingMode ? 'text-zinc-400' : 'text-stone-500'}`}>
          {isSmokingMode ? '東京都内の喫煙可能なカフェ・レストラン（秘密の裏モード）' : '東京都内の犬同伴OKカフェ・レストラン'}
        </p>
      </div>

      {/* 検索カード */}
      <div className={`rounded-2xl shadow-sm border overflow-hidden transition ${
        isSmokingMode
          ? 'bg-stone-900 border-stone-800 text-zinc-100'
          : 'bg-white border-stone-100 text-stone-800'
      }`}>
        {/* タブ */}
        <div className={`flex border-b ${isSmokingMode ? 'border-stone-850' : 'border-stone-100'}`}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSearched(false); setPlaces([]); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition ${
                tab === t.id
                  ? isSmokingMode
                    ? 'text-zinc-100 border-b-2 border-zinc-400 bg-zinc-800/20'
                    : 'text-amber-700 border-b-2 border-amber-500 bg-amber-50/50'
                  : isSmokingMode
                    ? 'text-zinc-400 hover:text-zinc-200'
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
                    ? isSmokingMode
                      ? 'bg-zinc-700 text-zinc-100 border-zinc-650'
                      : 'bg-amber-500 text-white border-amber-500'
                    : isSmokingMode
                      ? 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                      : 'border-stone-200 text-stone-600 hover:border-amber-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* タブごとの入力 */}
          {tab === 'nearby' && (
            <div className="space-y-3">
              {/* 半径スライダー */}
              <div className="space-y-1">
                <div className={`flex items-center justify-between text-xs ${isSmokingMode ? 'text-zinc-400' : 'text-stone-500'}`}>
                  <span>検索範囲</span>
                  <span className={`font-medium ${isSmokingMode ? 'text-zinc-200' : 'text-amber-700'}`}>
                    {radius >= 1000 ? `${(radius / 1000).toFixed(1)}km` : `${radius}m`}
                  </span>
                </div>
                <input
                  type="range"
                  min={300}
                  max={3000}
                  step={100}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className={`w-full ${isSmokingMode ? 'accent-zinc-400' : 'accent-amber-500'}`}
                />
                <div className={`flex justify-between text-xs ${isSmokingMode ? 'text-zinc-500' : 'text-stone-400'}`}>
                  <span>300m</span>
                  <span>3km</span>
                </div>
              </div>

              {/* モード切替 */}
              <div className="flex gap-2">
                <button
                  onClick={() => setMapMode(false)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium border transition ${
                    !mapMode
                      ? isSmokingMode
                        ? 'bg-zinc-750 text-zinc-100 border-zinc-700'
                        : 'bg-amber-500 text-white border-amber-500'
                      : isSmokingMode
                        ? 'border-zinc-700 text-zinc-450 hover:border-zinc-600'
                        : 'border-stone-200 text-stone-600 hover:border-amber-300'
                  }`}
                >
                  <Navigation className="w-4 h-4" /> GPS
                </button>
                <button
                  onClick={() => setMapMode(true)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium border transition ${
                    mapMode
                      ? isSmokingMode
                        ? 'bg-zinc-750 text-zinc-100 border-zinc-700'
                        : 'bg-amber-500 text-white border-amber-500'
                      : isSmokingMode
                        ? 'border-zinc-700 text-zinc-450 hover:border-zinc-600'
                        : 'border-stone-200 text-stone-600 hover:border-amber-300'
                  }`}
                >
                  <MapPin className="w-4 h-4" /> 地図で指定
                </button>
              </div>

              {/* 地図モード */}
              {mapMode && (
                <div className="space-y-2">
                  <button
                    onClick={getGpsAndSetPin}
                    disabled={loading}
                    className={`w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border transition disabled:opacity-60 ${
                      isSmokingMode
                        ? 'text-zinc-400 hover:text-zinc-200 border-zinc-700 hover:border-zinc-550'
                        : 'text-stone-500 hover:text-amber-700 border-stone-200 hover:border-amber-300'
                    }`}
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                    現在地にピンを移動
                  </button>
                  <MapPinSearch
                    lat={pinLat}
                    lng={pinLng}
                    radius={radius}
                    onPinChange={(lat, lng) => { setPinLat(lat); setPinLng(lng); }}
                  />
                  <p className={`text-xs text-center ${isSmokingMode ? 'text-zinc-500' : 'text-stone-400'}`}>地図をクリック or ピンをドラッグして場所を指定</p>
                  <button
                    onClick={searchByPin}
                    disabled={loading}
                    className={`w-full flex items-center justify-center gap-2 disabled:opacity-60 font-semibold py-3 rounded-xl transition ${
                      isSmokingMode
                        ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100'
                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                    }`}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    {loading ? '検索中...' : 'この場所から検索'}
                  </button>
                </div>
              )}

              {/* GPS モード */}
              {!mapMode && (
                <button
                  onClick={searchNearby}
                  disabled={loading}
                  className={`w-full flex items-center justify-center gap-2 disabled:opacity-60 font-semibold py-3 rounded-xl transition ${
                    isSmokingMode
                      ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100'
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                  {loading ? '検索中...' : `現在地から${radius >= 1000 ? `${(radius / 1000).toFixed(1)}km` : `${radius}m`}以内を検索`}
                </button>
              )}
            </div>
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
                        ? isSmokingMode
                          ? 'bg-zinc-700 text-zinc-100 border-zinc-650'
                          : 'bg-amber-500 text-white border-amber-500'
                        : isSmokingMode
                          ? 'border-zinc-700 text-zinc-300 hover:border-zinc-550 bg-zinc-800/10'
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
                className={`w-full flex items-center justify-center gap-2 disabled:opacity-60 font-semibold py-3 rounded-xl transition ${
                  isSmokingMode
                    ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
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
                        ? isSmokingMode
                          ? 'bg-zinc-700 text-zinc-100 border-zinc-650'
                          : 'bg-amber-500 text-white border-amber-500'
                        : isSmokingMode
                          ? 'border-zinc-700 text-zinc-300 hover:border-zinc-550 bg-zinc-800/10'
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
                className={`w-full flex items-center justify-center gap-2 disabled:opacity-60 font-semibold py-3 rounded-xl transition ${
                  isSmokingMode
                    ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
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
        <div className={`text-sm px-4 py-3 rounded-xl border ${
          isSmokingMode
            ? 'bg-red-950/20 text-red-400 border-red-900/30'
            : 'bg-red-50 text-red-700 border-red-100'
        }`}>
          {error}
        </div>
      )}

      {/* 検索結果 */}
      {searched && !loading && (
        <div>
          <p className={`text-sm mb-3 ${isSmokingMode ? 'text-zinc-500' : 'text-stone-500'}`}>
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
