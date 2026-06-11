import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Place } from '@/lib/types';
import { PlaceCard } from '@/components/PlaceCard';

export default async function VisitedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/visited');

  const { data } = await supabase
    .from('user_visited')
    .select('place_id, comment, visited_at, place:dog_friendly_places(*)')
    .eq('user_id', user.id)
    .order('visited_at', { ascending: false });

  type VisitedRow = { place_id: number; comment: string | null; visited_at: string; place: Place };
  const rows = (data ?? []) as unknown as VisitedRow[];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-stone-800">👣 あしあと</h1>
      {rows.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-4xl mb-2">🐾</p>
          <p>まだ訪問記録がありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map(({ place, visited_at, comment }) => (
            <div key={place.id} className="space-y-2">
              <PlaceCard place={place} isVisited />
              <div className="px-1 text-xs text-stone-400">
                {new Date(visited_at).toLocaleDateString('ja-JP')} 訪問
                {comment && <span className="ml-2 text-stone-600">{comment}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
