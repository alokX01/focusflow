/**
 * Centralized API client with error handling, retries, and type safety
 */

export class ApiError extends Error {
  constructor(message: string, public status: number, public data?: any) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestConfig extends RequestInit {
  retry?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Make an API request with automatic retry and error handling
 */
export async function apiRequest<T = any>(
  url: string,
  config: RequestConfig = {}
): Promise<T> {
  const {
    retry = 3,
    retryDelay = 1000,
    timeout = 30000,
    ...fetchConfig
  } = config;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retry; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchConfig,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...fetchConfig.headers,
        },
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.error || errorData.message || "Request failed",
          response.status,
          errorData
        );
      }

      // Parse JSON response
      const data = await response.json();
      return data as T;
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500
      ) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      if (attempt < retry - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * Math.pow(2, attempt))
        );
      }
    }
  }

  throw lastError || new Error("Request failed after retries");
}

/**
 * API client with common methods
 */
export const api = {
  get: <T = any>(url: string, config?: RequestConfig) =>
    apiRequest<T>(url, { ...config, method: "GET" }),

  post: <T = any>(url: string, data?: any, config?: RequestConfig) =>
    apiRequest<T>(url, {
      ...config,
      method: "POST",
      body: JSON.stringify(data),
    }),

  put: <T = any>(url: string, data?: any, config?: RequestConfig) =>
    apiRequest<T>(url, {
      ...config,
      method: "PUT",
      body: JSON.stringify(data),
    }),

  patch: <T = any>(url: string, data?: any, config?: RequestConfig) =>
    apiRequest<T>(url, {
      ...config,
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: <T = any>(url: string, config?: RequestConfig) =>
    apiRequest<T>(url, { ...config, method: "DELETE" }),
};

/**
 * Type-safe API endpoints
 */
export const endpoints = {
  // Auth
  auth: {
    register: (data: { name: string; email: string; password: string }) =>
      api.post("/api/auth/register", data),
    signIn: (data: { email: string; password: string }) =>
      api.post("/api/auth/signin", data),
  },

  // Sessions
  sessions: {
    list: (params?: Record<string, any>) =>
      api.get(`/api/sessions?${new URLSearchParams(params).toString()}`),
    create: (data: any) => api.post("/api/sessions", data),
    get: (id: string) => api.get(`/api/sessions/${id}`),
    update: (id: string, data: any) => api.patch(`/api/sessions/${id}`, data),
    delete: (id: string) => api.delete(`/api/sessions/${id}`),
    addDistraction: (id: string, data: any) =>
      api.post(`/api/sessions/${id}/distractions`, data),
  },

  // Analytics
  analytics: {
    get: (period: string = "week") =>
      api.get(`/api/analytics?period=${period}`),
    daily: (date?: string) =>
      api.get(`/api/analytics/daily${date ? `?date=${date}` : ""}`),
  },

  // User
  user: {
    me: () => api.get("/api/users/me"),
    stats: () => api.get("/api/users/me/stats"),
    update: (data: any) => api.put("/api/users/me", data),
  },

  // Settings
  settings: {
    get: () => api.get("/api/settings"),
    update: (data: any) => api.put("/api/settings", data),
    reset: () => api.delete("/api/settings"),
  },

  // Achievements
  achievements: {
    list: () => api.get("/api/achievements"),
  },

  // Export
  export: {
    sessions: (period: string = "month") =>
      fetch(`/api/export?period=${period}`).then((res) => res.blob()),
  },
};
