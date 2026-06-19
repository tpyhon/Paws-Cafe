'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Mail, Lock } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function AuthFormBase({ mode }: { mode: 'login' | 'signup' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/api/auth/callback` },
    });
  };

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

      {/* Google OAuth */}
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-2 border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-60 text-stone-700 font-medium py-3 rounded-xl transition text-sm"
      >
        {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
        Googleで{mode === 'login' ? 'ログイン' : '登録'}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-stone-100" />
        <span className="text-xs text-stone-400">または</span>
        <div className="flex-1 h-px bg-stone-100" />
      </div>

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
