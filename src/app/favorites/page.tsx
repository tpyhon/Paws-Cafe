import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Place } from '@/lib/types';
import { PlaceCard } from '@/components/PlaceCard';

export default async function FavoritesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/favorites');

  const { data } = await supabase
    .from('user_favorites')
    .select('place_id, place:dog_friendly_places(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const places = (data ?? []).map((d) => (d as unknown as { place: Place }).place).filter(Boolean);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-stone-800">❤️ お気に入り</h1>
      {places.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-4xl mb-2">💔</p>
          <p>まだお気に入りがありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {places.map((place) => (
            <PlaceCard key={place.id} place={place} isFavorited />
          ))}
        </div>
      )}
    </div>
  );
}
