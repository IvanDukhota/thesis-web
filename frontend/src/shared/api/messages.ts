import { apiRequest } from './client';

export const deleteMessage = async (messageId: string): Promise<void> => {
  await apiRequest(`/messages/${messageId}/`, {
    method: 'DELETE',
    auth: true,
  });
};

export const editMessage = async (messageId: string, text: string): Promise<any> => {
  return await apiRequest(`/messages/${messageId}/edit/`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ text }),
  });
};
