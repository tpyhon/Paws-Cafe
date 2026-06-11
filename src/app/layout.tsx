import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'Paws & Café — 愛犬と行けるカフェ・レストラン検索',
  description: '犬同伴OKの東京都内カフェ・レストランを現在地・路線・エリアで検索できます。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#faf9f7]">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
