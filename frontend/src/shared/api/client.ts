import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "../lib/token";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

type RequestOptions = RequestInit & {
  auth?: boolean;
  isFormData?: boolean;
};

type RefreshResponse = {
  access: string;
};

export async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();

  if (!refresh) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    clearTokens();
    return null;
  }

  const data: RefreshResponse = await response.json();
  setTokens(data.access, refresh);
  return data.access;
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { auth = false, isFormData = false, headers, ...rest } = options;

  let token = getAccessToken();

  const makeRequest = async (accessToken?: string | null) => {
    const requestHeaders: Record<string, string> = {};

    if (!isFormData) {
      requestHeaders["Content-Type"] = "application/json";
    }

    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        requestHeaders[key] = value;
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        requestHeaders[key] = value;
      });
    } else if (headers && typeof headers === "object") {
      Object.assign(requestHeaders, headers as Record<string, string>);
    }

    if (auth && accessToken) {
      requestHeaders.Authorization = `Bearer ${accessToken}`;
    }

    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...rest,
      headers: requestHeaders,
    });
  };

  let response = await makeRequest(token);

  if (response.status === 401 && auth) {
    token = await refreshAccessToken();

    if (token) {
      response = await makeRequest(token);
    }
  }

  if (!response.ok) {
    let errorMessage = "An error occurred.";

    try {
      const errorData = await response.json();
      errorMessage = JSON.stringify(errorData);
    } catch {
      errorMessage = response.statusText || errorMessage;
    }

    throw new Error(errorMessage);
  }

  const contentType = response.headers.get("Content-Type");

  if (contentType && contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  return {} as T;
}
