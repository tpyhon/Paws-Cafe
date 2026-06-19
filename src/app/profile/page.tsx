import { redirect } from 'next/navigation';
import { Heart, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ProfileEditor } from '@/components/ProfileEditor';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [
    { data: profile },
    { count: favCount },
    { count: visCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('user_favorites').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('user_visited').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  ]);

  return (
    <div className="space-y-4 pb-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700">
        <ArrowLeft className="w-4 h-4" /> 検索に戻る
      </Link>

      <div className="text-center py-4">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-3xl">
          🐾
        </div>
        <h1 className="mt-3 text-xl font-bold text-stone-800">
          {profile?.nickname ?? 'ゲスト'}
        </h1>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/favorites" className="bg-white rounded-2xl border border-stone-100 p-4 flex flex-col items-center gap-1 hover:border-amber-200 transition">
          <Heart className="w-6 h-6 text-rose-400" />
          <p className="text-2xl font-bold text-stone-800">{favCount ?? 0}</p>
          <p className="text-xs text-stone-500">お気に入り</p>
        </Link>
        <Link href="/visited" className="bg-white rounded-2xl border border-stone-100 p-4 flex flex-col items-center gap-1 hover:border-amber-200 transition">
          <CheckCircle className="w-6 h-6 text-emerald-400" />
          <p className="text-2xl font-bold text-stone-800">{visCount ?? 0}</p>
          <p className="text-xs text-stone-500">行ったお店</p>
        </Link>
      </div>

      <ProfileEditor
        userId={user.id}
        initialNickname={profile?.nickname ?? null}
        email={user.email ?? ''}
      />
    </div>
  );
}
