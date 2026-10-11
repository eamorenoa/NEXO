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
  body: string;
  post_type: CommunityPostType;
  title?: string | null;
  category?: string | null;
  status?: CommunityPostStatus;
  author?: string;
  created_at?: string;
  updated_at?: string;
};

export type CreateCommunityPostInput = {
  body: string;
  post_type?: CommunityPostType;
  title?: string;
  category?: string;
};
