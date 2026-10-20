export type MapItemSource = 'place' | 'need' | 'community';

export type MapPlace = {
  id: string | number;
  source: MapItemSource;
  title: string;
  category: string;
  latitude: number;
  longitude: number;
  description?: string;
  address?: string | null;
  status?: string | null;
  author?: string | null;
  is_owner?: boolean;
};