/**
 * Gemini API を使って東京都内の犬同伴可能な店舗データを生成し、Supabaseに投入するスクリプト
 * 実行: npm run seed
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const AREA_BATCHES = [
  // ── 山手線エリア ──
  { area: '渋谷',         station: '渋谷駅',      lines: ['山手線','東急東横線','東急田園都市線','京王井の頭線'] },
  { area: '新宿',         station: '新宿駅',       lines: ['山手線','中央線','小田急小田原線'] },
  { area: '原宿・表参道', station: '表参道駅',     lines: ['東京メトロ銀座線','東京メトロ日比谷線','山手線'] },
  { area: '恵比寿',       station: '恵比寿駅',     lines: ['山手線','東京メトロ日比谷線'] },
  { area: '目黒',         station: '目黒駅',       lines: ['山手線','東急目黒線','東京メトロ南北線'] },
  { area: '五反田',       station: '五反田駅',     lines: ['山手線','東急池上線'] },
  { area: '品川',         station: '品川駅',       lines: ['山手線','京浜急行線'] },
  { area: '池袋',         station: '池袋駅',       lines: ['山手線','西武池袋線','東京メトロ丸ノ内線'] },
  { area: '上野・谷根千', station: '上野駅',       lines: ['山手線','東京メトロ銀座線','東京メトロ日比谷線'] },
  { area: '浅草',         station: '浅草駅',       lines: ['東京メトロ銀座線','東武スカイツリーライン'] },
  { area: '銀座',         station: '銀座駅',       lines: ['東京メトロ銀座線','東京メトロ日比谷線','東京メトロ丸ノ内線'] },
  { area: '六本木',       station: '六本木駅',     lines: ['東京メトロ日比谷線','都営大江戸線'] },
  // ── 東急・田園都市線エリア ──
  { area: '自由が丘',     station: '自由が丘駅',   lines: ['東急東横線','東急大井町線'] },
  { area: '代官山・中目黒', station: '中目黒駅',   lines: ['東急東横線','東京メトロ日比谷線'] },
  { area: '二子玉川',     station: '二子玉川駅',   lines: ['東急田園都市線','東急大井町線'] },
  { area: '三軒茶屋',     station: '三軒茶屋駅',   lines: ['東急田園都市線'] },
  { area: '世田谷・経堂', station: '経堂駅',       lines: ['小田急小田原線'] },
  { area: '武蔵小杉',     station: '武蔵小杉駅',   lines: ['東急東横線','東急目黒線','JR南武線'] },
  // ── 中央線・井の頭線エリア ──
  { area: '吉祥寺',       station: '吉祥寺駅',     lines: ['中央線','京王井の頭線'] },
  { area: '下北沢',       station: '下北沢駅',     lines: ['小田急小田原線','京王井の頭線'] },
  { area: '高円寺',       station: '高円寺駅',     lines: ['中央線'] },
  { area: '中野',         station: '中野駅',       lines: ['中央線','東京メトロ東西線'] },
  { area: '西荻窪',       station: '西荻窪駅',     lines: ['中央線'] },
  { area: '三鷹',         station: '三鷹駅',       lines: ['中央線','京王井の頭線'] },
  { area: '国分寺',       station: '国分寺駅',     lines: ['中央線','西武国分寺線'] },
  { area: '立川',         station: '立川駅',       lines: ['中央線','多摩モノレール'] },
  // ── 小田急・京王エリア ──
  { area: '代々木上原',   station: '代々木上原駅', lines: ['小田急小田原線','東京メトロ千代田線'] },
  { area: '調布',         station: '調布駅',       lines: ['京王線'] },
  { area: '千歳烏山',     station: '千歳烏山駅',   lines: ['京王線'] },
  // ── 東部・城東エリア ──
  { area: '清澄白河',     station: '清澄白河駅',   lines: ['東京メトロ半蔵門線','都営大江戸線'] },
  { area: '門前仲町',     station: '門前仲町駅',   lines: ['東京メトロ東西線','都営大江戸線'] },
  { area: '蔵前',         station: '蔵前駅',       lines: ['都営浅草線','都営大江戸線'] },
  { area: '錦糸町',       station: '錦糸町駅',     lines: ['JR総武線','東京メトロ半蔵門線'] },
  { area: '北千住',       station: '北千住駅',     lines: ['JR常磐線','東武スカイツリーライン','東京メトロ日比谷線'] },
  { area: '麻布十番',     station: '麻布十番駅',   lines: ['東京メトロ南北線','都営大江戸線'] },
];

// Supabaseスキーマに存在するカラムのみ
const KNOWN_COLUMNS = new Set([
  'name','category','policy','latitude','longitude','address','area_name',
  'station_name','lines','budget_lunch','budget_dinner','business_hours',
  'dog_features','dog_rules','website_url','tabelog_url','image_url',
  'interior_images','comment',
]);

function buildPrompt(area: string, station: string, lines: string[]): string {
  return `
東京都内の犬同伴可能なカフェ・レストランを「${area}」エリアで6件、以下のJSON配列形式で生成してください。
実在する（または実在しそうな）店の情報をリアルに記述してください。

重要な制約:
- area_name は必ず "${area}" を使用
- station_name は必ず "${station}" を使用
- lines は必ず ${JSON.stringify(lines)} を使用
- image_url は必ず "" (空文字)
- interior_images は必ず [] (空配列)
- tabelog_url: 実在しそうな食べログURLを生成（例: https://tabelog.com/tokyo/A1302/A130201/13012345/）。わからなければnull
- website_url: null

フィールド一覧:
- name: string
- category: "cafe"|"italian"|"yakiniku"|"japanese"|"asian_ethnic"|"other"
- policy: "inside_ok"|"terrace_only"|"some_seats_ok"
- latitude: number (${area}周辺の正確な緯度)
- longitude: number (${area}周辺の正確な経度)
- address: string (東京都の実在する住所)
- area_name, station_name, lines (上記の値をそのまま使用)
- budget_lunch: string|null
- budget_dinner: string|null
- business_hours: string|null
- dog_features: string[] (3〜5個: "大型犬OK","ドッグメニューあり","水・おやつ提供","リードフックあり","マナーウェア貸出","テラス席あり","店内同伴OK" から選択)
- dog_rules: string|null
- website_url: null
- tabelog_url: string|null
- image_url: ""
- interior_images: []
- comment: string (おすすめポイント40〜60文字)

JSONのみ出力。コードブロックや説明文は不要。
`;
}

function assignImages(places: Record<string, unknown>[], areaIndex: number): Record<string, unknown>[] {
  return places.map((p, i) => {
    const seed = `pawscafe-${areaIndex}-${i}`;
    return {
      ...p,
      image_url: `https://picsum.photos/seed/${seed}/600/400`,
      interior_images: [
        `https://picsum.photos/seed/${seed}-a/600/400`,
        `https://picsum.photos/seed/${seed}-b/600/400`,
        `https://picsum.photos/seed/${seed}-c/600/400`,
      ],
    };
  });
}

async function generateForArea(batch: typeof AREA_BATCHES[0]): Promise<Record<string, unknown>[]> {
  const prompt = buildPrompt(batch.area, batch.station, batch.lines);
  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(jsonText) as Record<string, unknown>[];
  } catch {
    console.error(`  [${batch.area}] JSONパース失敗:`, jsonText.slice(0, 200));
    return [];
  }
}

async function main() {
  console.log('既存データを削除中...');
  const { error: delError } = await supabase.from('dog_friendly_places').delete().gt('id', 0);
  if (delError) { console.error('削除エラー:', delError); process.exit(1); }

  let totalInserted = 0;

  for (let i = 0; i < AREA_BATCHES.length; i++) {
    const batch = AREA_BATCHES[i];
    process.stdout.write(`[${String(i + 1).padStart(2)}/${AREA_BATCHES.length}] ${batch.area.padEnd(10)} 生成中... `);

    const places = await generateForArea(batch);
    if (!places.length) { console.log('スキップ'); continue; }

    const withImages = assignImages(places, i);
    const rows = withImages.map((p) => {
      const row: Record<string, unknown> = {
        geom: `SRID=4326;POINT(${p.longitude} ${p.latitude})`,
      };
      for (const key of KNOWN_COLUMNS) {
        if (key in p) row[key] = p[key];
      }
      return row;
    });

    const { data, error } = await supabase
      .from('dog_friendly_places')
      .insert(rows)
      .select('id, name');

    if (error) {
      console.log(`エラー: ${error.message}`);
    } else {
      console.log(`${data?.length ?? 0}件挿入`);
      totalInserted += data?.length ?? 0;
    }

    // Gemini APIレート制限対策（2秒待機）
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\n完了: 合計 ${totalInserted} 件挿入（${AREA_BATCHES.length}エリア）`);
}

main().catch(console.error);
