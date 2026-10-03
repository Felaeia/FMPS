import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createItem, getItems } from "./api";
import type { Item } from "./api";
import "./App.css";

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    getItems(controller.signal)
      .then(setItems)
      .catch((requestError: Error) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const item = await createItem(name);
      setItems((currentItems) => [item, ...currentItems]);
      setName("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The item could not be created.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="page">
      <section className="panel" aria-labelledby="page-title">
        <p className="eyebrow">React + ASP.NET Core</p>
        <h1 id="page-title">CQRS starter</h1>
        <p className="intro">
          A small working example: the UI sends a command to create an item and
          a query to read items from the API.
        </p>

        <form className="item-form" onSubmit={handleSubmit}>
          <label htmlFor="item-name">New item</label>
          <div className="form-row">
            <input
              id="item-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              placeholder="Enter an item name"
              required
            />
            <button type="submit" disabled={isSaving}>
              {isSaving ? "Adding..." : "Add item"}
            </button>
          </div>
        </form>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <section className="items" aria-labelledby="items-title">
          <h2 id="items-title">Items</h2>
          {isLoading ? (
            <p className="muted">Loading items...</p>
          ) : items.length === 0 ? (
            <p className="muted">No items yet. Add one to try the CQRS flow.</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <span>{item.name}</span>
                  <time dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleString()}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}
