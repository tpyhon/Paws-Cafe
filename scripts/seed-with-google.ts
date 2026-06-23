/**
 * Google Places API (New) を使用して、Hotpepperデータにない追加の「ペット可」「喫煙可」店舗を収集・追記するスクリプト
 * 実行: npm run seed:google
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GEMINI_API_KEY;
const PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchText';

const TARGET_AREAS = [
  '渋谷', '新宿', '恵比寿', '目黒', '池袋', '銀座', '六本木', '自由が丘', '中目黒', '代官山', '吉祥寺', '下北沢', '三軒茶屋', '二子玉川'
];

const KEYWORDS = [
  { text: 'ペット同伴可 カフェ', isSmoking: false },
  { text: '犬同伴 レストラン', isSmoking: false },
  { text: '喫煙 カフェ', isSmoking: true },
  { text: '喫煙可能 居酒屋', isSmoking: true }
];

const CHAIN_KEYWORDS = [
  'スターバックス', 'STARBUCKS', 'ドトール', 'DOUTOR', 'タリーズ', 'TULLY', 'サンマルク', 'プロント', 'PRONTO',
  'コメダ', '上島珈琲', 'ルノアール', 'ブルーボトル', 'BLUE BOTTLE', '猿田彦', 'マクドナルド', 'McDonald',
  'モスバーガー', 'MOS BURGER', 'ケンタッキー', 'KFC', 'ロッテリア', 'LOTTERIA', 'サブウェイ', 'SUBWAY',
  'ファーストキッチン', 'ウェンディーズ', 'ガスト', 'ジョナサン', 'サイゼリヤ', 'サイゼリア', 'デニーズ',
  'ロイヤルホスト', 'バーミヤン', 'ココス', 'COCO\'S', '大戸屋', 'やよい軒', '吉野家', 'すき家', '松屋',
  'なか卯', 'CoCo壱番屋', 'スープストック', 'Soup Stock', 'ミスタードーナツ', 'クリスピー・クリーム',
  'エクセルシオール', 'EXCELSIOR', 'ベローチェ', 'VELOCE', 'カフェ・ド・クリエ', 'ディーン＆デルーカ',
  'DEAN & DELUCA', 'セガフレード', 'Segafredo', 'メゾンカイザー', 'アパホテル', '叙々苑', 'トラジ',
  '牛角', '温野菜', 'しゃぶ葉', '木曽路', '梅の花', 'アウトバック', 'ババ・ガンプ', 'ハードロックカフェ',
  'レッドロブスター', '和民', '鳥貴族', '土間土間', '天狗', '庄や', '八剣伝', 'つぼ八', '白木屋',
  '魚民', '笑笑', 'はなまるうどん', '丸亀製麺', '富士そば', '小諸そば', 'ゆで太郎',
  '天下一品', '一蘭', '一風堂', '日高屋', '餃子の王将', '大阪王将', 'リンガーハット', 'ミヤマ珈琲',
  '倉式珈琲', '星乃珈琲', '高木珈琲', 'コメダ珈琲'
];

interface GooglePlace {
  id: string;
  displayName: { text: string };
  formattedAddress: string;
  location: { latitude: number; longitude: number };
  editorialSummary?: { text: string };
  primaryType?: string;
  allowsDogs?: boolean;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  websiteUri?: string;
}

// 簡易的な距離計算（メートル）
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // 地球の半径
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 店名のクレンジング（重複排除のため）
function cleanName(name: string): string {
  return name.replace(/[\s　\-\(\)（）]/g, '').toLowerCase();
}

function mapCategory(primaryType?: string): string {
  if (!primaryType) return 'other';
  const type = primaryType.toLowerCase();
  if (type.includes('cafe') || type.includes('coffee') || type.includes('bakery') || type.includes('dessert')) return 'cafe';
  if (type.includes('italian') || type.includes('french') || type.includes('pizza') || type.includes('pasta')) return 'italian';
  if (type.includes('barbecue') || type.includes('steak') || type.includes('grill') || type.includes('yakiniku')) return 'yakiniku';
  if (type.includes('japanese') || type.includes('sushi') || type.includes('ramen') || type.includes('noodle') || type.includes('soba')) return 'japanese';
  if (type.includes('chinese') || type.includes('korean') || type.includes('asian') || type.includes('thai') || type.includes('indian')) return 'asian_ethnic';
  return 'other';
}

// Google プレイス検索の実行
async function searchGooglePlaces(query: string): Promise<GooglePlace[]> {
  if (!API_KEY) {
    throw new Error('API key is missing. Set GOOGLE_PLACES_API_KEY or GEMINI_API_KEY in .env.local');
  }

  const response = await fetch(PLACES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.editorialSummary,places.primaryType,places.allowsDogs,places.regularOpeningHours,places.websiteUri'
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: 'ja',
      maxResultCount: 20
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Places API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.places ?? [];
}

async function main() {
  console.log('=== Google Places API を利用したデータ拡充 ===\n');

  // 1. 既存の店舗データを全取得（重複判定用）
  console.log('DBから既存データを取得中...');
  const dbPlaces: any[] = [];
  const limit = 1000;
  let offset = 0;

  while (true) {
    const { data: batch, error: fetchErr } = await supabase
      .from('dog_friendly_places')
      .select('name, latitude, longitude')
      .range(offset, offset + limit - 1);

    if (fetchErr) {
      console.error('既存データの取得に失敗しました:', fetchErr.message);
      process.exit(1);
    }

    if (!batch || batch.length === 0) break;
    dbPlaces.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }

  console.log(`既存店舗数: ${dbPlaces.length}件\n`);

  // 2. Google Places からデータ取得
  const newPlacesToInsert: any[] = [];
  const fetchedIds = new Set<string>();

  // 安全対策: クエリ総数を制限
  const maxQueries = 30;
  let queryCount = 0;

  for (const area of TARGET_AREAS) {
    for (const kw of KEYWORDS) {
      if (queryCount >= maxQueries) break;
      queryCount++;

      const queryText = `東京 ${area} ${kw.text}`;
      console.log(`[${queryCount}/${maxQueries}] 検索中: "${queryText}"`);

      try {
        const places = await searchGooglePlaces(queryText);
        console.log(`  -> ${places.length}件の店舗が見つかりました`);

        for (const place of places) {
          if (fetchedIds.has(place.id)) continue;
          fetchedIds.add(place.id);

          const name = place.displayName.text;
          const lat = place.location.latitude;
          const lng = place.location.longitude;

          // 3. 重複判定 (DB内の既存データとの距離＆名前比較)
          const isDuplicate = dbPlaces.some((existing) => {
            const distance = getDistance(lat, lng, existing.latitude, existing.longitude);
            if (distance < 30) {
              const cleanedNew = cleanName(name);
              const cleanedExist = cleanName(existing.name);
              if (cleanedNew.includes(cleanedExist) || cleanedExist.includes(cleanedNew)) {
                return true; // 位置が近く店名も似ているなら重複と判定
              }
            }
            return false;
          });

          if (isDuplicate) {
            // console.log(`  [重複スキップ] ${name}`);
            continue;
          }

          // 同一セッション内の新規取得分とも重複しないか確認
          const isDuplicateInBatch = newPlacesToInsert.some((batchPlace) => {
            const distance = getDistance(lat, lng, batchPlace.latitude, batchPlace.longitude);
            return distance < 30 && cleanName(name) === cleanName(batchPlace.name);
          });

          if (isDuplicateInBatch) continue;

          // 4. データマッピング
          const hours = place.regularOpeningHours?.weekdayDescriptions
            ? place.regularOpeningHours.weekdayDescriptions.join('\n')
            : null;

          const address = place.formattedAddress.replace(/^日本、/, '');
          
          // 駅名の簡易抽出（住所の「駅」周辺から推測するか、デフォルト値）
          let stationName = `${area}駅`;
          const stationMatch = address.match(/([^\s,，、]+駅)/);
          if (stationMatch && stationMatch[1]) {
            stationName = stationMatch[1];
          }

          let policy: 'inside_ok' | 'terrace_only' | 'some_seats_ok' = 'some_seats_ok';
          const summary = place.editorialSummary?.text || '';
          if (summary.includes('テラス') || summary.includes('屋外')) {
            policy = 'terrace_only';
          } else if (place.allowsDogs === true || summary.includes('店内') || summary.includes('室内')) {
            policy = 'inside_ok';
          }

          const features = kw.isSmoking ? ['喫煙可'] : ['ペット可'];
          features.push('Googleプレイス');

          // チェーン店判定
          const isChain = CHAIN_KEYWORDS.some(chainKw => name.toLowerCase().includes(chainKw.toLowerCase()));
          if (isChain) {
            features.push('チェーン店');
          }

          newPlacesToInsert.push({
            name,
            category: mapCategory(place.primaryType),
            policy,
            is_smoking: kw.isSmoking,
            latitude: lat,
            longitude: lng,
            geom: `SRID=4326;POINT(${lng} ${lat})`,
            address,
            area_name: area,
            station_name: stationName,
            lines: [], // Googleからは路線配列を容易に取れないため空配列
            budget_lunch: null,
            budget_dinner: null,
            business_hours: hours ? hours.slice(0, 100) : null,
            dog_features: features,
            dog_rules: summary ? summary.slice(0, 100) : null,
            website_url: place.websiteUri || null,
            tabelog_url: null,
            image_url: null, // 画像はPlaces APIからだとURL取得が複雑なため一旦null
            interior_images: [],
            comment: summary || `${name} (Googleプレイス情報)`
          });
        }
      } catch (e) {
        console.error(`  エラーが発生しました:`, e instanceof Error ? e.message : e);
      }

      // APIレート制限回避のため待機 (500ms)
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`\n重複排除後、新たに追記する店舗数: ${newPlacesToInsert.length}件`);

  if (newPlacesToInsert.length === 0) {
    console.log('追記する新規店舗はありませんでした。');
    return;
  }

  // 5. 新規店舗のインサート
  console.log('新規店舗をデータベースに挿入中...');
  let insertedCount = 0;

  for (let i = 0; i < newPlacesToInsert.length; i += 50) {
    const batch = newPlacesToInsert.slice(i, i + 50);
    const { data, error } = await supabase
      .from('dog_friendly_places')
      .insert(batch)
      .select('id');

    if (error) {
      console.error(`  挿入エラー (バッチ ${i}):`, error.message);
    } else {
      insertedCount += data?.length ?? 0;
      process.stdout.write(`\r  挿入中: ${insertedCount} / ${newPlacesToInsert.length}件`);
    }
  }

  console.log(`\n\n=== 完了: Googleプレイスから新たに ${insertedCount} 件を追記しました ===`);
}

main().catch(console.error);
