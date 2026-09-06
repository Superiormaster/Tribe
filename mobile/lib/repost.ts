import { apiRequest } from '@/utils/api';

export const repostNormal = (postId: number) => {
  return apiRequest(`api/posts/${postId}/repost/`, {
    method: 'POST',
    data: {
      type: 'normal'
    }
  });
};

export const repostQuote = (postId: number, text: string) => {
  return apiRequest(`api/posts/${postId}/repost/`, {
    method: 'POST',
    data: {
      type: 'quote',
      quote_text: text
    }
  });
};