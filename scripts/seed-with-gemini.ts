/**
 * Gemini API を使って東京都内の犬同伴可能な店舗データを生成し、Supabaseに投入するスクリプト
 * 実行: npx tsx scripts/seed-with-gemini.ts
 */
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // シードにはservice_role keyが必要
);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const PROMPT = `
東京都内の犬同伴可能なカフェ・レストランを20件、以下のJSON配列形式で生成してください。
実在する（または実在しそうな）お店の情報をリアルに記述してください。

フィールド:
- name: string (店名)
- category: "cafe"|"italian"|"yakiniku"|"japanese"|"asian_ethnic"|"other"
- policy: "inside_ok"|"terrace_only"|"some_seats_ok"
- latitude: number (東京都内の緯度)
- longitude: number (東京都内の経度)
- address: string (住所)
- area_name: string (例: "自由が丘", "渋谷", "代官山・中目黒" など)
- station_name: string (最寄り駅名、例: "自由が丘駅")
- lines: string[] (乗り入れ路線の配列、例: ["東急東横線", "東急大井町線"])
- budget_lunch: string|null (例: "¥1,000〜¥1,500")
- budget_dinner: string|null
- business_hours: string|null (例: "11:00〜21:00（火定休）")
- dog_features: string[] (例: ["大型犬OK", "ドッグメニューあり", "水・おやつ提供"])
- dog_rules: string|null (例: "マナーウェア着用でご来店ください")
- website_url: string|null
- tabelog_url: string|null
- image_url: string|null (unsplash等の実在する犬カフェ風画像URL)
- interior_images: string[] (店内画像URL、2〜4件)
- comment: string (おすすめポイント、50文字程度)

エリアは渋谷・代官山・中目黒・自由が丘・吉祥寺・表参道・二子玉川・三軒茶屋など人気エリアに分散させてください。
JSONのみを出力し、コードブロックや説明文は含めないでください。
`;

async function main() {
  console.log('Gemini APIでデータ生成中...');

  const result = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{ role: 'user', parts: [{ text: PROMPT }] }],
  });

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let places: unknown[];
  try {
    places = JSON.parse(jsonText);
  } catch {
    console.error('JSONパースに失敗しました:', text.slice(0, 500));
    process.exit(1);
  }

  // geometry列を追加
  const rows = (places as Record<string, unknown>[]).map((p) => ({
    ...p,
    geom: `SRID=4326;POINT(${p.longitude} ${p.latitude})`,
  }));

  console.log(`${rows.length}件のデータをSupabaseに挿入中...`);

  const { data, error } = await supabase
    .from('dog_friendly_places')
    .insert(rows)
    .select('id, name');

  if (error) {
    console.error('挿入エラー:', error);
    process.exit(1);
  }

  console.log('挿入完了:');
  data?.forEach((d: { id: number; name: string }) => console.log(`  [${d.id}] ${d.name}`));
}

main().catch(console.error);
