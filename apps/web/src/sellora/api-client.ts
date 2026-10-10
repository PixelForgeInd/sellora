const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace(/\/$/, "");

export function getSessionToken(): string {
  return sessionStorage.getItem("sellora_token") || "";
}

export async function api(
  path: string,
  init: RequestInit = {},
  auth = getSessionToken(),
): Promise<any> {
  const headers = new Headers(init.headers);

  if (auth) {
    headers.set("Authorization", `Bearer ${auth}`);
  }

  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(API_BASE_URL + path, { ...init, headers });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}
