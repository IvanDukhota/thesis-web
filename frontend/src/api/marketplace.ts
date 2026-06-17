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

export type Seller = {
  id: number;
  email: string;
  full_name: string;
  nickname: string;
  avatar: string | null;
};

export type Buyer = {
  id: number;
  email: string;
  full_name: string;
  nickname: string;
  avatar: string | null;
};

export type OrderImage = {
  id: string;
  url: string;
  order_position: number;
  width: number | null;
  height: number | null;
};

export type OrderListItem = {
  id: string;
  slug: string;
  title: string;
  price: string;
  delivery_time: string;
  rating: string;
  reviews_count: number;
  orders_count: number;
  buyer: Buyer;
  category_name: string;
  tags: Tag[];
  thumbnail: string | null;
  is_favorited: boolean;
  created_at: string;
};

export type OrderDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: string;
  delivery_time: string;
  features: string[];
  requirements: string;
  status: string;
  rating: string;
  reviews_count: number;
  orders_count: number;
  views_count: number;
  buyer: Buyer;
  category: Category;
  tags: Tag[];
  images: OrderImage[];
  is_favorited: boolean;
  is_owner: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type OrderReview = {
  id: string;
  seller: Seller;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
};

export type OrderFilters = {
  search?: string;
  category?: string;
  tags?: string[];
  min_price?: number;
  max_price?: number;
  delivery_time?: string;
  min_rating?: number;
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

export async function getOrders(filters: OrderFilters = {}) {
  const params = new URLSearchParams();

  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.tags) filters.tags.forEach(tag => params.append('tags', tag));
  if (filters.min_price) params.set('min_price', String(filters.min_price));
  if (filters.max_price) params.set('max_price', String(filters.max_price));
  if (filters.delivery_time) params.set('delivery_time', filters.delivery_time);
  if (filters.min_rating) params.set('min_rating', String(filters.min_rating));
  if (filters.sort) params.set('sort', filters.sort);

  const query = params.toString();
  return apiRequest<OrderListItem[]>(`/marketplace/orders/${query ? `?${query}` : ''}`, {
    method: 'GET',
    auth: false,
  });
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
  delivery_time: string;
  features?: string[];
  requirements?: string;
  status: string;
  images?: File[];
}) {
  const formData = new FormData();

  formData.append('title', data.title);
  formData.append('description', data.description);
  formData.append('category', data.category);
  formData.append('price', String(data.price));
  formData.append('delivery_time', data.delivery_time);
  formData.append('status', data.status);

  if (data.tag_names) {
    formData.append('tag_names', JSON.stringify(data.tag_names));
  }

  if (data.features) {
    formData.append('features', JSON.stringify(data.features));
  }

  if (data.requirements) {
    formData.append('requirements', data.requirements);
  }

  if (data.images) {
    data.images.forEach(image => {
      formData.append('images', image);
    });
  }

  return apiRequest<OrderDetail>('/marketplace/orders/', {
    method: 'POST',
    auth: true,
    body: formData,
    isFormData: true,
  });
}

export async function favoriteOrder(slug: string) {
  return apiRequest(`/marketplace/orders/${slug}/favorite/`, {
    method: 'POST',
    auth: true,
  });
}

export async function unfavoriteOrder(slug: string) {
  return apiRequest(`/marketplace/orders/${slug}/unfavorite/`, {
    method: 'DELETE',
    auth: true,
  });
}

export async function getFavorites() {
  return apiRequest<OrderListItem[]>('/marketplace/favorites/', {
    method: 'GET',
    auth: true,
  });
}

export async function getOrderReviews(slug: string) {
  return apiRequest<OrderReview[]>(`/marketplace/orders/${slug}/reviews/`, {
    method: 'GET',
    auth: false,
  });
}

export async function createReview(slug: string, rating: number, comment: string) {
  return apiRequest<OrderReview>(`/marketplace/orders/${slug}/review/`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ rating, comment }),
  });
}
