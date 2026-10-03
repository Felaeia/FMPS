import type { FormEvent } from "react";
import type { ToDo } from "./types/todo";
import { formatTodoCreatedAt } from "./util/utilPlaceholder";

interface TodoComponentProps {
  todos: ToDo[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  onCreate: (title: string) => Promise<boolean>;
}

export default function TodoComponent({
  todos,
  isLoading,
  isSaving,
  error,
  onCreate,
}: TodoComponentProps) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();

    if (title) {
      if (await onCreate(title)) form.reset();
    }
  }

  return (
    <section aria-labelledby="todo-title">
      <h2 id="todo-title">To-do list</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="todo-name">New task</label>
        <input id="todo-name" name="title" maxLength={100} required />
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Adding..." : "Add task"}
        </button>
      </form>

      {error && <p role="alert">{error}</p>}
      {isLoading ? (
        <p>Loading tasks...</p>
      ) : todos.length === 0 ? (
        <p>No tasks yet.</p>
      ) : (
        <ul>
          {todos.map((todo) => (
            <li key={todo.id}>
              <span>{todo.title}</span>
              <time dateTime={todo.createdAt}>
                {formatTodoCreatedAt(todo.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}