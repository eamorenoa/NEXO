import { api } from './api';

export const CommunityService = {
  list: api.community,
  create: api.createPost,
  update: api.updatePost,
  remove: api.deletePost,
};
