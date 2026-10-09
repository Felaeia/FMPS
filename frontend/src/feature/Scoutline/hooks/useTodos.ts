import { useCallback, useEffect, useState } from "react";
import { createTodo, getTodos } from "../services/todoService";
import type { ToDo } from "../types/todo";

export function useTodos() {
  const [todos, setTodos] = useState<ToDo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getTodos(controller.signal)
      .then(setTodos)
      .catch((requestError: Error) => {
        if (requestError.name !== "AbortError") {
          setError(requestError.message);
        }
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, []);

  const addTodo = useCallback(async (title: string): Promise<boolean> => {
    setIsSaving(true);
    setError(null);

    try {
      const todo = await createTodo({ title });
      setTodos((currentTodos) => [todo, ...currentTodos]);
      return true;
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "The task could not be created.";
      setError(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { todos, isLoading, isSaving, error, addTodo };
}
