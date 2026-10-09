// src/mockApi.ts

export interface Item {
  id: string;
  name: string;
  createdAt: string;
}

// Simulate an in-memory database
let mockItems: Item[] = [
  {
    id: "1",
    name: "First mock item",
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    id: "2",
    name: "Second mock item",
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
  }
];

// Helper to simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getItems(signal?: AbortSignal): Promise<Item[]> {
  // Simulate a 600ms network delay
  await delay(600);

  // Respect the AbortController from your component
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  // Return a shallow copy to prevent direct mutation of the mock DB
  return [...mockItems];
}

export async function createItem(name: string): Promise<Item> {
  // Simulate a 400ms network delay
  await delay(400);

  const newItem: Item = {
    id: crypto.randomUUID(), // Generates a unique ID
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };

  // Add to the "database"
  mockItems = [newItem, ...mockItems];

  return newItem;
}