export type PlaceCategory = 'cafe' | 'italian' | 'yakiniku' | 'japanese' | 'asian_ethnic' | 'other';
export type DogPolicyType = 'inside_ok' | 'terrace_only' | 'some_seats_ok';

export interface Place {
  id: number;
  name: string;
  category: PlaceCategory;
  policy: DogPolicyType;
  latitude: number;
  longitude: number;
  address: string;
  area_name: string;
  station_name: string;
  lines: string[];
  budget_lunch: string | null;
  budget_dinner: string | null;
  business_hours: string | null;
  dog_features: string[];
  dog_rules: string | null;
  website_url: string | null;
  tabelog_url: string | null;
  image_url: string | null;
  interior_images: string[];
  comment: string | null;
  created_at: string;
  distance_meters?: number;
}

export interface Profile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  updated_at: string;
}

export interface UserFavorite {
  id: number;
  user_id: string;
  place_id: number;
  created_at: string;
}

export interface UserVisited {
  id: number;
  user_id: string;
  place_id: number;
  visited_at: string;
  comment: string | null;
}

export const POLICY_LABELS: Record<DogPolicyType, string> = {
  inside_ok: '店内OK',
  terrace_only: 'テラスのみ',
  some_seats_ok: '一部席OK',
};

export const POLICY_EMOJI: Record<DogPolicyType, string> = {
  inside_ok: '🐕',
  terrace_only: '☀️',
  some_seats_ok: '🪑',
};

export const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  cafe: 'カフェ',
  italian: 'イタリアン',
  yakiniku: '焼肉',
  japanese: '和食',
  asian_ethnic: 'アジア料理',
  other: 'その他',
};

export const MAJOR_LINES = [
  '山手線',
  '中央線',
  '東急東横線',
  '東急大井町線',
  '東急目黒線',
  '東急田園都市線',
  '京王井の頭線',
  '小田急小田原線',
  '西武池袋線',
  '東京メトロ銀座線',
  '東京メトロ丸ノ内線',
  '東京メトロ日比谷線',
];

export const MAJOR_AREAS = [
  '渋谷',
  '新宿',
  '原宿・表参道',
  '自由が丘',
  '吉祥寺',
  '代官山・中目黒',
  '恵比寿',
  '下北沢',
  '二子玉川',
  '三軒茶屋',
];
