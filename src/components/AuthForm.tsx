'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Mail, Lock } from 'lucide-react';

function AuthFormBase({ mode }: { mode: 'login' | 'signup' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError('メールアドレスまたはパスワードが正しくありません');
      } else {
        router.push('/');
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/api/auth/callback` },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage('確認メールを送信しました。メールのリンクをクリックしてください。');
      }
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-sm space-y-6">
      <div className="text-center">
        <p className="text-3xl mb-1">🐾</p>
        <h1 className="text-xl font-bold text-stone-800">
          {mode === 'login' ? 'ログイン' : 'アカウント作成'}
        </h1>
      </div>

      {message && (
        <div className="bg-emerald-50 text-emerald-700 text-sm px-4 py-3 rounded-xl border border-emerald-100">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">メールアドレス</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full pl-10 pr-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">パスワード</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="6文字以上"
              className="w-full pl-10 pr-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === 'login' ? 'ログイン' : 'アカウント作成'}
        </button>
      </form>

      <p className="text-center text-sm text-stone-500">
        {mode === 'login' ? (
          <>アカウントをお持ちでない方は <Link href="/signup" className="text-amber-700 font-medium">新規登録</Link></>
        ) : (
          <>既にアカウントをお持ちの方は <Link href="/login" className="text-amber-700 font-medium">ログイン</Link></>
        )}
      </p>
    </div>
  );
}

export function LoginForm() {
  return <AuthFormBase mode="login" />;
}

export function SignupForm() {
  return <AuthFormBase mode="signup" />;
}
