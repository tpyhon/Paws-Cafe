/**
 * DB上の全店舗に対してポリシーをヒューリスティック検出して更新する
 * テラス/屋外キーワード → terrace_only
 * 店内/全席キーワード   → inside_ok
 * その他              → some_seats_ok (変更なし)
 * 実行: npm run update:policy
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TERRACE_KEYWORDS = [
  'テラス', 'テラス席', 'オープンテラス', 'テラス利用', 'テラスのみ',
  'ガーデン席', '屋外席', '野外席', 'テラスエリア', 'ガーデンエリア',
  '外席', 'テラス利用可', 'テラスで', 'テラスにて',
];

const INSIDE_KEYWORDS = [
  '店内OK', '店内可', '全席ペット可', '店内全席', '店内でも',
  '全てのお席', 'すべての席でペット', '室内OK', '室内可',
];

function detectPolicy(name: string, comment: string | null, dogFeatures: string[], dogRules: string | null): string | null {
  const text = [name, comment, dogFeatures.join(' '), dogRules].filter(Boolean).join(' ');

  for (const kw of INSIDE_KEYWORDS) {
    if (text.includes(kw)) return 'inside_ok';
  }
  for (const kw of TERRACE_KEYWORDS) {
    if (text.includes(kw)) return 'terrace_only';
  }
  return null;
}

async function main() {
  console.log('=== ポリシー自動検出・更新 ===\n');

  const { data: places, error } = await supabase
    .from('dog_friendly_places')
    .select('id, name, comment, dog_features, dog_rules, policy');

  if (error) {
    console.error('取得エラー:', error.message);
    process.exit(1);
  }

  const counts = { inside_ok: 0, terrace_only: 0, unchanged: 0 };
  const updates: { id: number; policy: string }[] = [];

  for (const place of places ?? []) {
    const detected = detectPolicy(place.name, place.comment, place.dog_features ?? [], place.dog_rules);
    if (detected && detected !== place.policy) {
      updates.push({ id: place.id, policy: detected });
    }
  }

  console.log(`検出結果: ${updates.length}件を更新予定\n`);

  // 50件ずつバッチ更新
  for (let i = 0; i < updates.length; i += 50) {
    const batch = updates.slice(i, i + 50);
    for (const { id, policy } of batch) {
      const { error } = await supabase
        .from('dog_friendly_places')
        .update({ policy })
        .eq('id', id);
      if (error) console.error(`  ID ${id} 更新エラー:`, error.message);
    }
    process.stdout.write(`\r  更新中: ${Math.min(i + 50, updates.length)} / ${updates.length}件`);
  }

  // 集計
  for (const { policy } of updates) {
    if (policy === 'inside_ok') counts.inside_ok++;
    else if (policy === 'terrace_only') counts.terrace_only++;
  }
  counts.unchanged = (places?.length ?? 0) - updates.length;

  console.log(`\n\n=== 完了 ===`);
  console.log(`  inside_ok    : ${counts.inside_ok}件`);
  console.log(`  terrace_only : ${counts.terrace_only}件`);
  console.log(`  変更なし      : ${counts.unchanged}件`);
}

main().catch(console.error);
