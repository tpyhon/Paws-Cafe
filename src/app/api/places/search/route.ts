import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const line = searchParams.get('line');
  const area = searchParams.get('area');
  const policy = searchParams.get('policy');
  const isSmoking = searchParams.get('is_smoking') === 'true';
  const radiusParam = searchParams.get('radius');
  const radius = radiusParam ? Math.min(Math.max(parseFloat(radiusParam), 300), 5000) : 1200;

  const supabase = await createClient();

  // 現在地周辺検索（PostGIS RPC）
  if (lat && lng) {
    const { data, error } = await supabase.rpc('search_places_nearby', {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius_meters: radius,
      policy_filter: policy || null,
      is_smoking_filter: isSmoking,
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
    // 「代官山・中目黒」→ area_name ILIKE '%代官山%' OR area_name ILIKE '%中目黒%'
    const parts = area.split('・').filter(Boolean);
    if (parts.length > 1) {
      query = query.or(parts.map((p) => `area_name.ilike.%${p}%`).join(','));
    } else {
      query = query.ilike('area_name', `%${area}%`);
    }
  }
  if (policy) {
    query = query.eq('policy', policy);
  }

  query = query.eq('is_smoking', isSmoking);
  query = query.order('name');

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ places: data });
}
