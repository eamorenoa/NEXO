export type MapPlace = {
  id: string | number;
  name: string;
  type: 'help' | 'service' | 'job' | 'report' | 'donation';
  latitude: number;
  longitude: number;
  description?: string;
};
