import { apiRequest } from "../shared/api/client";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  parent: string | null;
  order: number;
  is_active: boolean;
  subcategories: Category[];
};

export type Tag = {
  id: string;
  name: string;
  slug: string;
  usage_count: number;
};

export type Buyer = {
  id: number;
  email: string;
  full_name: string;
  nickname: string;
  avatar: string | null;
};

export type OrderListItem = {
  id: string;
  slug: string;
  title: string;
  price: string;
  estimated_days: number;
  status: string;
  applications_count: number;
  views_count: number;
  buyer: Buyer;
  category_name: string;
  tags: Tag[];
  images_count: number;
  videos_count: number;
  files_count: number;
  created_at: string;
  similarity_percentage: number | null;
};

export type OrderDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: string;
  estimated_days: number;
  status: string;
  applications_count: number;
  views_count: number;
  buyer: Buyer;
  category: Category;
  tags: Tag[];
  attachments: { id: string; url: string; file_type: string; filename: string; uploaded_at: string }[];
  is_owner: boolean;
  has_applied: boolean;
  created_at: string;
  updated_at: string;
};

export type OrderFilters = {
  search?: string;
  category?: string;
  tags?: string[];
  min_price?: number;
  max_price?: number;
  sort?: string;
};

export async function getCategories() {
  return apiRequest<Category[]>('/marketplace/categories/', {
    method: 'GET',
    auth: false,
  });
}

export async function getTags(limit = 20) {
  return apiRequest<Tag[]>(`/marketplace/tags/?limit=${limit}`, {
    method: 'GET',
    auth: false,
  });
}

export async function getOrders(filters: OrderFilters = {}): Promise<OrderListItem[]> {
  const params = new URLSearchParams();

  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.tags) filters.tags.forEach(tag => params.append('tags', tag));
  if (filters.min_price) params.set('min_price', String(filters.min_price));
  if (filters.max_price) params.set('max_price', String(filters.max_price));
  params.set('sort', filters.sort ?? '-created_at');

  const query = params.toString();
  const response = await apiRequest<{ results: OrderListItem[] }>(`/marketplace/orders/?${query}`, {
    method: 'GET',
    auth: true,
  });
  return response.results;
}

export async function getOrder(slug: string) {
  return apiRequest<OrderDetail>(`/marketplace/orders/${slug}/`, {
    method: 'GET',
    auth: true,
  });
}

export async function createOrder(data: {
  title: string;
  description: string;
  category: string;
  tag_names?: string[];
  price: number;
  estimated_days: number;
  status: string;
  attachments?: File[];
}) {
  if (data.attachments && data.attachments.length > 0) {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('category', data.category);
    formData.append('price', String(data.price));
    formData.append('estimated_days', String(data.estimated_days));
    formData.append('status', data.status);

    if (data.tag_names) {
      data.tag_names.forEach(tag => formData.append('tag_names', tag));
    }

    data.attachments.forEach(file => formData.append('attachments', file));

    return apiRequest<OrderDetail>('/marketplace/orders/', {
      method: 'POST',
      auth: true,
      body: formData,
      isFormData: true,
    });
  }

  return apiRequest<OrderDetail>('/marketplace/orders/', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(data),
  });
}

export async function updateOrder(slug: string, data: {
  title: string;
  description: string;
  category: string;
  tag_names?: string[];
  price: number;
  estimated_days: number;
  status: string;
  keep_attachment_ids?: string[];
  attachments?: File[];
}): Promise<OrderDetail> {
  const formData = new FormData();
  formData.append('title', data.title);
  formData.append('description', data.description);
  formData.append('category', data.category);
  formData.append('price', String(data.price));
  formData.append('estimated_days', String(data.estimated_days));
  formData.append('status', data.status);
  if (data.tag_names) data.tag_names.forEach(t => formData.append('tag_names', t));
  if (data.keep_attachment_ids) data.keep_attachment_ids.forEach(id => formData.append('keep_attachment_ids', id));
  if (data.attachments) data.attachments.forEach(f => formData.append('attachments', f));

  return apiRequest<OrderDetail>(`/marketplace/orders/${slug}/`, {
    method: 'PATCH',
    auth: true,
    body: formData,
    isFormData: true,
  });
}

export async function deleteOrder(slug: string): Promise<void> {
  return apiRequest<void>(`/marketplace/orders/${slug}/`, {
    method: 'DELETE',
    auth: true,
  });
}

export async function getMyOrders(): Promise<OrderListItem[]> {
  const response = await apiRequest<{ results: OrderListItem[] }>('/marketplace/orders/my_orders/', {
    method: 'GET',
    auth: true,
  });
  return response.results;
}

export async function aiSearch(
  query: string,
  filters: Pick<OrderFilters, 'category' | 'tags' | 'min_price' | 'max_price'> = {},
): Promise<OrderListItem[]> {
  const params = new URLSearchParams();
  params.set('q', query);
  if (filters.category) params.set('category', filters.category);
  if (filters.tags) filters.tags.forEach(tag => params.append('tags', tag));
  if (filters.min_price) params.set('min_price', String(filters.min_price));
  if (filters.max_price) params.set('max_price', String(filters.max_price));

  const response = await apiRequest<{ results: OrderListItem[] }>(
    `/marketplace/orders/ai_search/?${params.toString()}`,
    { method: 'GET', auth: false },
  );
  return response.results;
}

export type OrderApplication = {
  id: string;
  order: string;
  order_title: string;
  order_slug: string;
  applicant: Buyer;
  team: string | null;
  message: string;
  proposed_price: string | null;
  proposed_days: number | null;
  status: string;
  created_at: string;
};

export type ApplicantStats = {
  projects_count: number;
  recent_projects: { id: string; name: string; type: string }[];
  tasks: { total: number; finished: number; in_progress: number };
};

export type PublicTeamStats = {
  team_name: string;
  team_description: string;
  members_count: number;
  projects_count: number;
  recent_projects: { id: string; name: string }[];
  tasks: { total: number; finished: number; in_progress: number };
  members: { username: string; tasks_completed: number }[];
};

export async function getReceivedApplications(): Promise<OrderApplication[]> {
  const response = await apiRequest<{ results: OrderApplication[] }>('/marketplace/applications/received/', {
    method: 'GET',
    auth: true,
  });
  return response.results;
}

export async function getSentApplications(): Promise<OrderApplication[]> {
  const response = await apiRequest<{ results: OrderApplication[] }>('/marketplace/applications/sent/', {
    method: 'GET',
    auth: true,
  });
  return response.results;
}

export async function getApplicantStats(userId: number): Promise<ApplicantStats> {
  return apiRequest<ApplicantStats>(`/stats/user/${userId}/`, { method: 'GET', auth: true });
}

export async function getPublicTeamStats(teamId: string): Promise<PublicTeamStats> {
  return apiRequest<PublicTeamStats>(`/stats/public-team/${teamId}/`, { method: 'GET', auth: true });
}

export async function createApplication(data: {
  order: string;
  message?: string;
  proposed_price?: number;
  proposed_days?: number;
  team?: string;
}): Promise<OrderApplication> {
  return apiRequest<OrderApplication>('/marketplace/applications/', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(data),
  });
}

export async function acceptApplication(id: string): Promise<OrderApplication> {
  return apiRequest<OrderApplication>(`/marketplace/applications/${id}/accept/`, {
    method: 'POST',
    auth: true,
  });
}

export async function rejectApplication(id: string): Promise<OrderApplication> {
  return apiRequest<OrderApplication>(`/marketplace/applications/${id}/reject/`, {
    method: 'POST',
    auth: true,
  });
}
