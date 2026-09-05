export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorResponse;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status = 500, code = "INTERNAL_ERROR", details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Shared apiClient wrapper with credentials: "include", JSON parsing, and typed error responses.
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.error || response.statusText || "Request failed";
    const errorCode = data?.error?.code || `HTTP_${response.status}`;
    const errorDetails = data?.error?.details || data?.details;

    // Trigger global 401 handling if unauthorized in browser environment
    if (response.status === 401 && typeof window !== "undefined") {
      const isAuthPath = window.location.pathname.startsWith("/login") || window.location.pathname.startsWith("/portal");
      if (!isAuthPath) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
      }
    }

    throw new ApiError(errorMsg, response.status, errorCode, errorDetails);
  }

  // Support both enveloped { success: true, data: ... } and direct JSON responses
  if (data && typeof data === "object" && "success" in data && "data" in data) {
    return data.data as T;
  }

  return data as T;
}
