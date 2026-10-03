import type { CreateToDoInput, ToDo } from "../types/todo";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7022";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, init);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `The API request failed (${response.status}).`);
  }

  return response.json() as Promise<T>;
}

export function getTodos(signal?: AbortSignal): Promise<ToDo[]> {
  return request<ToDo[]>("/api/todos", { signal });
}

export function createTodo(input: CreateToDoInput): Promise<ToDo> {
  return request<ToDo>("/api/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
