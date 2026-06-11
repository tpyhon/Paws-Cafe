import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const line = searchParams.get('line');
  const area = searchParams.get('area');
  const policy = searchParams.get('policy');

  const supabase = await createClient();

  // 現在地周辺検索（PostGIS RPC）
  if (lat && lng) {
    const { data, error } = await supabase.rpc('search_places_nearby', {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius_meters: 1200,
      policy_filter: policy || null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ places: data });
  }

  // 路線・エリア検索
  let query = supabase.from('dog_friendly_places').select('*');

  if (line) {
    query = query.contains('lines', [line]);
  }
  if (area) {
    query = query.eq('area_name', area);
  }
  if (policy) {
    query = query.eq('policy', policy);
  }

  query = query.order('name');

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ places: data });
}
