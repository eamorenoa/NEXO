export type CommunityPostType =
  | 'need'
  | 'offer'
  | 'donation'
  | 'sale'
  | 'promotion'
  | 'service'
  | 'job'
  | 'activity'
  | 'exchange';

export type CommunityPostStatus =
  | 'active'
  | 'paused'
  | 'closed'
  | 'removed';

export type CommunityPost = {
  id: number | string;
  user_id?: number | string;
  is_owner?: boolean;
  body: string;
  post_type: CommunityPostType;
  title?: string | null;
  category?: string | null;
  status?: CommunityPostStatus;
  author?: string;
  created_at?: string;
  updated_at?: string;
  address?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

export type CreateCommunityPostInput = {
  body: string;
  post_type?: CommunityPostType;
  title?: string;
  category?: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};
