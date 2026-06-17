import { apiRequest } from "../chat/shared/api/client";

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
  created_at: string;
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
  attachments: { id: string; file: string }[];
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
    auth: false,
  });
  return response.results;
}

export async function getOrder(slug: string) {
  return apiRequest<OrderDetail>(`/marketplace/orders/${slug}/`, {
    method: 'GET',
    auth: false,
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
}) {
  return apiRequest<OrderDetail>('/marketplace/orders/', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(data),
  });
}
