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

// 全エリア・路線リスト（フロントエンドと一致させる）
const AREA_BATCHES = [
  { area: '渋谷', station: '渋谷駅', lines: ['山手線', '東急東横線', '東急田園都市線', '京王井の頭線'] },
  { area: '新宿', station: '新宿駅', lines: ['山手線', '中央線', '小田急小田原線'] },
  { area: '原宿・表参道', station: '表参道駅', lines: ['東京メトロ銀座線', '東京メトロ日比谷線', '山手線'] },
  { area: '自由が丘', station: '自由が丘駅', lines: ['東急東横線', '東急大井町線'] },
  { area: '吉祥寺', station: '吉祥寺駅', lines: ['中央線', '京王井の頭線'] },
  { area: '代官山・中目黒', station: '中目黒駅', lines: ['東急東横線', '東京メトロ日比谷線'] },
  { area: '恵比寿', station: '恵比寿駅', lines: ['山手線', '東京メトロ日比谷線'] },
  { area: '下北沢', station: '下北沢駅', lines: ['小田急小田原線', '京王井の頭線'] },
  { area: '二子玉川', station: '二子玉川駅', lines: ['東急田園都市線', '東急大井町線'] },
  { area: '三軒茶屋', station: '三軒茶屋駅', lines: ['東急田園都市線'] },
];

function buildPrompt(area: string, station: string, lines: string[]): string {
  return `
東京都内の犬同伴可能なカフェ・レストランを「${area}」エリアで7件、以下のJSON配列形式で生成してください。
リアルな店名・住所・予算を記述してください。

重要: image_url と interior_images は必ず空文字列または空配列にしてください（画像URLは後で設定します）。

フィールド:
- name: string (店名、英語または日本語)
- category: "cafe"|"italian"|"yakiniku"|"japanese"|"asian_ethnic"|"other"
- policy: "inside_ok"|"terrace_only"|"some_seats_ok"
- latitude: number (${area}周辺の実際の緯度)
- longitude: number (${area}周辺の実際の経度)
- address: string (東京都の住所)
- area_name: "${area}"  ← 必ずこの文字列を使用
- station_name: "${station}" ← 必ずこの文字列を使用
- lines: ${JSON.stringify(lines)} ← 必ずこの配列を使用
- budget_lunch: string|null (例: "¥1,000〜¥1,500")
- budget_dinner: string|null
- business_hours: string|null (例: "11:00〜21:00（火定休）")
- dog_features: string[] (例: ["大型犬OK", "ドッグメニューあり", "水・おやつ提供", "リードフックあり", "マナーウェア貸出"])から3〜5個選択
- dog_rules: string|null
- website_url: null
- tabelog_url: null
- image_url: ""
- interior_images: []
- comment: string (おすすめポイント40〜60文字)

JSONのみを出力し、コードブロックや説明文は一切含めないでください。
`;
}

function assignImages(places: Record<string, unknown>[]): Record<string, unknown>[] {
  return places.map((p, i) => {
    const seed = encodeURIComponent(`pawscafe-${p.area_name}-${i}`);
    return {
      ...p,
      image_url: `https://picsum.photos/seed/${seed}/600/400`,
      interior_images: [
        `https://picsum.photos/seed/${seed}-1/600/400`,
        `https://picsum.photos/seed/${seed}-2/600/400`,
        `https://picsum.photos/seed/${seed}-3/600/400`,
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
  // 既存データを全削除してクリーンな状態から開始
  console.log('既存データを削除中...');
  const { error: delError } = await supabase.from('dog_friendly_places').delete().gt('id', 0);
  if (delError) {
    console.error('削除エラー:', delError);
    process.exit(1);
  }

  let totalInserted = 0;

  for (const batch of AREA_BATCHES) {
    process.stdout.write(`[${batch.area}] 生成中... `);

    const places = await generateForArea(batch);
    if (!places.length) {
      console.log('スキップ');
      continue;
    }

    const withImages = assignImages(places);
    // Supabaseスキーマに存在するカラムのみに絞る（Geminiが余分なフィールドを生成した場合の対策）
    const KNOWN_COLUMNS = new Set([
      'name','category','policy','latitude','longitude','address','area_name',
      'station_name','lines','budget_lunch','budget_dinner','business_hours',
      'dog_features','dog_rules','website_url','tabelog_url','image_url',
      'interior_images','comment','geom',
    ]);
    const rows = withImages.map((p) => {
      const row: Record<string, unknown> = { geom: `SRID=4326;POINT(${p.longitude} ${p.latitude})` };
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
      console.log(`挿入エラー: ${error.message}`);
    } else {
      console.log(`${data?.length ?? 0}件挿入`);
      totalInserted += data?.length ?? 0;
      data?.forEach((d: { id: number; name: string }) => console.log(`    [${d.id}] ${d.name}`));
    }

    // Gemini API レート制限対策
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\n完了: 合計 ${totalInserted} 件挿入`);
}

main().catch(console.error);
