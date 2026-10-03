export interface Item {
  id: string;
  name: string;
  createdAt: string;
}

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7022";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, init);

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      responseText || `The API request failed (${response.status}).`,
    );
  }

  return response.json() as Promise<T>;
}

export function getItems(signal?: AbortSignal): Promise<Item[]> {
  return request<Item[]>("/api/items", { signal });
}

export function createItem(name: string): Promise<Item> {
  return request<Item>("/api/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}
