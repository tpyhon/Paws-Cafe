/**
 * Hot Pepper グルメサーチAPI を使って東京都内ペット可飲食店の実データを取得しSupabaseに投入
 * 中エリア（48区分）ごとに分割クエリを実行し、1,000件制限を突破して全件取得する
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
const HP_AREA_BASE = 'http://webservice.recruit.co.jp/hotpepper/middle_area/v1/';

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

function formatBudget(budgetName: string): string | null {
  if (!budgetName || budgetName === '未定・不明') return null;
  return budgetName;
}

interface HpShop {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  station_name: string;
  middle_area: { name: string };
  small_area: { name: string };
  genre: { name: string };
  sub_genre?: { name: string };
  budget?: { name: string };
  open?: string;
  catch?: string;
  access?: string;
  urls: { pc: string };
  photo: { pc: { l: string; m: string } };
}

interface MiddleArea {
  code: string;
  name: string;
}

// ── 中エリア一覧を取得 ──
async function fetchMiddleAreas(): Promise<MiddleArea[]> {
  const url = new URL(HP_AREA_BASE);
  url.searchParams.set('key', HP_KEY);
  url.searchParams.set('large_area', 'Z011');
  url.searchParams.set('format', 'json');
  const res = await fetch(url.toString());
  const data = await res.json();
  return data.results?.middle_area ?? [];
}

// ── 中エリア1つ分の全ペット可店舗を取得（ページング） ──
async function fetchForArea(areaCode: string): Promise<HpShop[]> {
  const shops: HpShop[] = [];
  const COUNT = 100;

  for (let start = 1; ; start += COUNT) {
    const url = new URL(HP_BASE);
    url.searchParams.set('key', HP_KEY);
    url.searchParams.set('format', 'json');
    url.searchParams.set('middle_area', areaCode);
    url.searchParams.set('pet', '1');
    url.searchParams.set('count', String(COUNT));
    url.searchParams.set('start', String(start));

    const res = await fetch(url.toString());
    const data = await res.json();
    const batch: HpShop[] = data.results?.shop ?? [];
    if (!batch.length) break;

    shops.push(...batch);

    const available = parseInt(data.results?.results_available ?? '0');
    if (shops.length >= available || start + COUNT > 1000) break;

    await new Promise((r) => setTimeout(r, 300));
  }

  return shops;
}

// ── Hot Pepper データ → DBスキーマへ変換 ──
function toDbRow(shop: HpShop) {
  const genreName = shop.genre?.name ?? '';
  const subGenreName = shop.sub_genre?.name ?? '';
  const access = shop.access ?? '';
  const lines = extractLines(access);
  const areaName = shop.small_area?.name ?? shop.middle_area?.name ?? '東京';
  const stationName = shop.station_name ? `${shop.station_name}駅` : areaName;

  return {
    name: shop.name,
    category: mapCategory(genreName, subGenreName),
    policy: 'some_seats_ok' as const,
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
    tabelog_url: shop.urls?.pc ?? null,
    image_url: shop.photo?.pc?.l ?? null,
    interior_images: shop.photo?.pc?.m ? [shop.photo.pc.m] : [],
    comment: shop.catch ? shop.catch.slice(0, 100) : null,
  };
}

async function main() {
  console.log('=== Hot Pepper API 全件取得（中エリア分割モード）===\n');

  // 中エリア一覧取得
  const areas = await fetchMiddleAreas();
  console.log(`中エリア数: ${areas.length}件\n`);

  // 全エリアから店舗取得（IDで重複排除）
  const shopMap = new Map<string, HpShop>();

  for (let i = 0; i < areas.length; i++) {
    const area = areas[i];
    process.stdout.write(`[${String(i + 1).padStart(2)}/${areas.length}] ${area.name.slice(0, 20).padEnd(22)} `);

    const shops = await fetchForArea(area.code);
    let newCount = 0;
    for (const s of shops) {
      if (!shopMap.has(s.id)) {
        shopMap.set(s.id, s);
        newCount++;
      }
    }
    console.log(`${shops.length}件取得 (+${newCount}件新規) | 累計: ${shopMap.size}件`);

    await new Promise((r) => setTimeout(r, 500));
  }

  const allShops = Array.from(shopMap.values());
  console.log(`\n重複排除後: ${allShops.length}件\n`);

  // 既存データ削除
  console.log('既存データを削除中...');
  await supabase.from('dog_friendly_places').delete().gt('id', 0);

  // 100件ずつバッチ挿入
  const rows = allShops.map(toDbRow);
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { data, error } = await supabase
      .from('dog_friendly_places')
      .insert(batch)
      .select('id');

    if (error) {
      errors++;
      console.error(`  バッチ${i}エラー:`, error.message.slice(0, 80));
    } else {
      inserted += data?.length ?? 0;
      process.stdout.write(`\r  挿入中: ${inserted} / ${rows.length}件`);
    }
  }

  console.log(`\n\n=== 完了: ${inserted}件挿入 / ${errors}バッチエラー ===`);

  // エリア別サマリ（上位15）
  const areaSummary: Record<string, number> = {};
  rows.forEach((r) => { areaSummary[r.area_name] = (areaSummary[r.area_name] ?? 0) + 1; });
  const top15 = Object.entries(areaSummary).sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.log('\nエリア別 上位15件:');
  top15.forEach(([area, count]) => console.log(`  ${area.padEnd(24)} ${count}件`));
}

main().catch(console.error);
