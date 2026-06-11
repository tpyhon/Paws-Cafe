/**
 * Hot Pepper グルメサーチAPI を使って東京都内ペット可飲食店の実データを取得しSupabaseに投入
 * 実行: npm run seed:real
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const HP_KEY = process.env.HOTPEPPER_API_KEY!;
const HP_BASE = 'http://webservice.recruit.co.jp/hotpepper/gourmet/v1/';

// ── カテゴリマッピング ──
function mapCategory(genreName: string, subGenreName: string): string {
  const g = genreName + subGenreName;
  if (g.includes('カフェ') || g.includes('スイーツ') || g.includes('喫茶')) return 'cafe';
  if (g.includes('イタリアン') || g.includes('フレンチ') || g.includes('ピザ') || g.includes('パスタ')) return 'italian';
  if (g.includes('焼肉') || g.includes('ホルモン') || g.includes('BBQ')) return 'yakiniku';
  if (g.includes('和食') || g.includes('日本料理') || g.includes('寿司') || g.includes('そば') || g.includes('うどん') || g.includes('天ぷら') || g.includes('鍋')) return 'japanese';
  if (g.includes('中華') || g.includes('韓国') || g.includes('アジア') || g.includes('エスニック') || g.includes('タイ') || g.includes('ベトナム')) return 'asian_ethnic';
  return 'other';
}

// ── アクセス文字列から路線名を抽出 ──
const LINE_PATTERNS = [
  '山手線', '中央線', '総武線', '京浜東北線', '常磐線', '南武線', '横須賀線',
  '東急東横線', '東急大井町線', '東急目黒線', '東急田園都市線', '東急池上線', '東急多摩川線',
  '京王線', '京王井の頭線', '京王相模原線',
  '小田急小田原線', '小田急江ノ島線', '小田急多摩線',
  '西武池袋線', '西武新宿線', '西武国分寺線',
  '東武スカイツリーライン', '東武東上線',
  '京急線', '京急空港線',
  '東京メトロ銀座線', '東京メトロ丸ノ内線', '東京メトロ日比谷線',
  '東京メトロ東西線', '東京メトロ千代田線', '東京メトロ有楽町線',
  '東京メトロ半蔵門線', '東京メトロ南北線', '東京メトロ副都心線',
  '都営浅草線', '都営三田線', '都営新宿線', '都営大江戸線',
  '多摩モノレール', 'りんかい線', 'ゆりかもめ',
];

function extractLines(access: string): string[] {
  return LINE_PATTERNS.filter((line) => access.includes(line));
}

// ── 予算文字列の整形 ──
function formatBudget(budgetName: string): string | null {
  if (!budgetName || budgetName === '未定・不明') return null;
  return budgetName.replace('円', '円～').replace('～～', '～');
}

// ── Hot Pepper API ページング取得 ──
interface HpShop {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  station_name: string;
  middle_area: { name: string };
  small_area: { name: string };
  genre: { name: string; code: string };
  sub_genre?: { name: string };
  budget?: { name: string };
  open?: string;
  catch?: string;
  access?: string;
  urls: { pc: string };
  photo: { pc: { l: string; m: string } };
}

async function fetchAllPetFriendly(): Promise<HpShop[]> {
  const all: HpShop[] = [];
  const COUNT = 100;

  // 1回目：総件数の確認
  const firstUrl = new URL(HP_BASE);
  firstUrl.searchParams.set('key', HP_KEY);
  firstUrl.searchParams.set('format', 'json');
  firstUrl.searchParams.set('large_area', 'Z011');
  firstUrl.searchParams.set('pet', '1');
  firstUrl.searchParams.set('count', '1');
  firstUrl.searchParams.set('start', '1');

  const firstRes = await fetch(firstUrl.toString());
  const firstData = await firstRes.json();
  const totalAvailable = parseInt(firstData.results?.results_available ?? '0');
  console.log(`取得可能: ${totalAvailable}件`);

  // ページング（Hot Pepper API は start + count <= 1001 の制限あり）
  const maxFetchable = Math.min(totalAvailable, 1000);

  for (let start = 1; start <= maxFetchable; start += COUNT) {
    const url = new URL(HP_BASE);
    url.searchParams.set('key', HP_KEY);
    url.searchParams.set('format', 'json');
    url.searchParams.set('large_area', 'Z011');
    url.searchParams.set('pet', '1');
    url.searchParams.set('count', String(COUNT));
    url.searchParams.set('start', String(start));

    const res = await fetch(url.toString());
    const data = await res.json();
    const shops: HpShop[] = data.results?.shop ?? [];
    if (!shops.length) break;

    all.push(...shops);
    process.stdout.write(`\r  取得中: ${all.length} / ${maxFetchable}件`);

    await new Promise((r) => setTimeout(r, 300)); // レート制限対策
  }

  console.log(`\n  取得完了: ${all.length}件`);
  return all;
}

// ── Hot Pepper データ → DBスキーマへ変換 ──
function toDbRow(shop: HpShop) {
  const genreName = shop.genre?.name ?? '';
  const subGenreName = shop.sub_genre?.name ?? '';
  const access = shop.access ?? '';
  const lines = extractLines(access);
  const areaName = shop.small_area?.name ?? shop.middle_area?.name ?? '東京';
  const stationName = shop.station_name ? `${shop.station_name}駅` : areaName;

  // Hot Pepper の photo URL を image_url + interior_images に分配
  const photoL = shop.photo?.pc?.l ?? '';
  const photoM = shop.photo?.pc?.m ?? '';

  return {
    name: shop.name,
    category: mapCategory(genreName, subGenreName),
    policy: 'some_seats_ok' as const,  // Hot Pepperでは詳細不明 → 「一部席OK」をデフォルトに
    latitude: shop.lat,
    longitude: shop.lng,
    geom: `SRID=4326;POINT(${shop.lng} ${shop.lat})`,
    address: shop.address,
    area_name: areaName,
    station_name: stationName,
    lines,
    budget_lunch: formatBudget(shop.budget?.name ?? ''),
    budget_dinner: formatBudget(shop.budget?.name ?? ''),
    business_hours: shop.open ?? null,
    dog_features: ['ペット可'],
    dog_rules: null,
    website_url: null,
    tabelog_url: shop.urls?.pc ?? null,   // Hot Pepper URLを格納
    image_url: photoL || null,
    interior_images: photoM ? [photoM] : [],
    comment: shop.catch ? shop.catch.slice(0, 100) : null,
  };
}

async function main() {
  console.log('=== Hot Pepper API で実店舗データ取得開始 ===\n');

  const shops = await fetchAllPetFriendly();
  if (!shops.length) { console.error('データ取得失敗'); process.exit(1); }

  console.log('\n既存データを削除中...');
  await supabase.from('dog_friendly_places').delete().gt('id', 0);

  // 100件ずつバッチ挿入
  const rows = shops.map(toDbRow);
  let inserted = 0;

  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { data, error } = await supabase
      .from('dog_friendly_places')
      .insert(batch)
      .select('id');

    if (error) {
      console.error(`  バッチ${i}〜 挿入エラー:`, error.message);
    } else {
      inserted += data?.length ?? 0;
      process.stdout.write(`\r  挿入中: ${inserted} / ${rows.length}件`);
    }
  }

  console.log(`\n\n=== 完了: ${inserted}件の実店舗データを挿入しました ===`);

  // エリア別サマリ
  const areaSummary: Record<string, number> = {};
  rows.forEach((r) => {
    areaSummary[r.area_name] = (areaSummary[r.area_name] ?? 0) + 1;
  });
  const top10 = Object.entries(areaSummary).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log('\nエリア別 上位10件:');
  top10.forEach(([area, count]) => console.log(`  ${area.padEnd(20)} ${count}件`));
}

main().catch(console.error);
