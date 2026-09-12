export type NeedCategory = 'help' | 'share' | 'job' | 'report' | 'donation' | 'accessibility';
export type Need = {
  id: number | string;
  description: string;
  category: NeedCategory;
  status: string;
  ai_category?: string;
  ai_confidence?: number;
  author?: string;
  created_at?: string;
};
