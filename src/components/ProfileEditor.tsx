'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Pencil, Check, X } from 'lucide-react';

interface Props {
  userId: string;
  initialNickname: string | null;
  email: string;
}

export function ProfileEditor({ userId, initialNickname, email }: Props) {
  const [nickname, setNickname] = useState(initialNickname ?? '');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(nickname);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const save = async () => {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from('profiles')
      .update({ nickname: draft.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) {
      setError('保存に失敗しました');
    } else {
      setNickname(draft.trim());
      setEditing(false);
    }
    setSaving(false);
  };

  const signOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* アカウント情報 */}
      <div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-4">
        <h2 className="font-bold text-stone-800">アカウント情報</h2>

        <div className="space-y-1">
          <p className="text-xs text-stone-400 font-medium">メールアドレス</p>
          <p className="text-sm text-stone-700">{email}</p>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-stone-400 font-medium">ニックネーム</p>
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={30}
                placeholder="ニックネームを入力"
                className="flex-1 border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                onClick={save}
                disabled={saving}
                className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                onClick={() => { setEditing(false); setDraft(nickname); }}
                className="p-1.5 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-sm text-stone-700">{nickname || <span className="text-stone-400">未設定</span>}</p>
              <button
                onClick={() => { setEditing(true); setDraft(nickname); }}
                className="p-1 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-amber-50"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>

      {/* サインアウト */}
      <button
        onClick={signOut}
        disabled={signingOut}
        className="w-full flex items-center justify-center gap-2 border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-60 font-medium py-3 rounded-xl transition text-sm"
      >
        {signingOut && <Loader2 className="w-4 h-4 animate-spin" />}
        ログアウト
      </button>
    </div>
  );
}
