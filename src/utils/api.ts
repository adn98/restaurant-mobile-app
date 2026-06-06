import { API_BASE, MOBILE_APP_API_KEY } from "@/constants/config";

export async function apiFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("x-api-key", MOBILE_APP_API_KEY);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}
