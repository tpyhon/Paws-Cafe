import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Heart, Footprints, LogIn, LogOut, User } from 'lucide-react';

export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-stone-100">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-amber-700 text-lg">
          🐾 Paws&amp;Café
        </Link>
        <nav className="flex items-center gap-1">
          {user ? (
            <>
              <Link href="/favorites" className="p-2 text-stone-600 hover:text-rose-500 transition" aria-label="お気に入り">
                <Heart className="w-5 h-5" />
              </Link>
              <Link href="/visited" className="p-2 text-stone-600 hover:text-amber-500 transition" aria-label="あしあと">
                <Footprints className="w-5 h-5" />
              </Link>
              <Link href="/profile" className="p-2 text-stone-600 hover:text-stone-800 transition" aria-label="プロフィール">
                <User className="w-5 h-5" />
              </Link>
              <form action="/api/auth/signout" method="post">
                <button type="submit" className="p-2 text-stone-600 hover:text-stone-800 transition" aria-label="ログアウト">
                  <LogOut className="w-5 h-5" />
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800 transition px-3 py-1.5 border border-amber-300 rounded-full">
              <LogIn className="w-4 h-4" />
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
