import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import type RemoteStorage from "remotestoragejs";
import { determineAction } from "@/app/actions";
import { TodoItem, SortOption } from "@/types";
import { serializeTodo } from "@/lib/utils/todo";
import { useUIStore } from "@/stores/use-ui-store";

export interface UseTodoActionsProps {
  remoteStorage: RemoteStorage | null;
  selectedDate: Date;
  apiKey: string;
}

export function useTodoActions({
  remoteStorage,
  selectedDate,
  apiKey,
}: UseTodoActionsProps) {
  // State
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  
  // Refs for managing async operations
  const isInitializedRef = useRef(false);
  const isSavingRef = useRef(false);
  const loadingRef = useRef(false);

  // UI state from Zustand store
  const isLoading = useUIStore((state) => state.isLoading);
  const isLoadingTodonna = useUIStore((state) => state.isLoadingTodonna);
  const setIsLoading = useUIStore((state) => state.setIsLoading);
  const setIsLoadingTodonna = useUIStore((state) => state.setIsLoadingTodonna);
  const startEditingStore = useUIStore((state) => state.startEditing);
  const cancelEditingStore = useUIStore((state) => state.cancelEditing);

  // Helper: Check if todo is on selected date
  const isOnSelectedDate = (todo: TodoItem) => {
    return format(todo.date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
  };

  // Helper: Generate unique ID
  const generateTodoId = () => Math.random().toString(36).substring(7);

  // Helper: Create a new todo
  const createTodo = (
    text: string,
    emoji: string,
    date: Date = selectedDate,
    time?: string
  ): TodoItem => {
    return serializeTodo({
      id: generateTodoId(),
      text,
      completed: false,
      emoji,
      date,
      time,
    });
  };

  // ========== Todonna Module Operations ==========

  /**
   * Load all todos from RemoteStorage using the Todonna module
   */
  const loadTodos = useCallback(async () => {
    if (!remoteStorage || loadingRef.current) return;

    loadingRef.current = true;

    // Only show loading indicator for initial load
    if (!isInitializedRef.current) {
      setIsLoadingTodonna(true);
    }

    try {
      // Use Todonna module API - much simpler!
      const loadedTodos = await remoteStorage.todonna.getAll();

      console.log(`Loaded ${loadedTodos.length} todos from RemoteStorage`);
      setTodos(loadedTodos);
      isInitializedRef.current = true;
      setIsLoadingTodonna(false);
    } catch (error) {
      console.error("Failed to load todos:", error);
      setTodos([]);
      isInitializedRef.current = true;
      setIsLoadingTodonna(false);
    } finally {
      loadingRef.current = false;
    }
  }, [remoteStorage, setIsLoadingTodonna]);

  /**
   * Add a new todo using the Todonna module
   */
  const addTodo = useCallback(
    async (todo: TodoItem) => {
      if (!remoteStorage) return;

      isSavingRef.current = true;
      try {
        // Optimistically update local state
        setTodos((prev) => [...prev, serializeTodo(todo)]);

        // Use Todonna module API
        await remoteStorage.todonna.add(todo);

        console.log(`Added todo: ${todo.text}`);
      } catch (error) {
        console.error("Failed to add todo:", error);
        // Rollback on error
        setTodos((prev) => prev.filter((t) => t.id !== todo.id));
      } finally {
        setTimeout(() => {
          isSavingRef.current = false;
        }, 100);
      }
    },
    [remoteStorage]
  );

  /**
   * Update an existing todo using the Todonna module
   */
  const updateTodo = useCallback(
    async (todo: TodoItem) => {
      if (!remoteStorage) return;

      isSavingRef.current = true;
      const previousTodos = todos;

      try {
        // Optimistically update local state
        setTodos((prev) =>
          prev.map((t) => (t.id === todo.id ? serializeTodo(todo) : t))
        );

        // Use Todonna module API
        await remoteStorage.todonna.update(todo.id, {
          text: todo.text,
          completed: todo.completed,
          emoji: todo.emoji,
          date: todo.date,
          time: todo.time,
          removed: todo.removed,
        });

        console.log(`Updated todo: ${todo.text}`);
      } catch (error) {
        console.error("Failed to update todo:", error);
        // Rollback on error
        setTodos(previousTodos);
      } finally {
        setTimeout(() => {
          isSavingRef.current = false;
        }, 100);
      }
    },
    [remoteStorage, todos]
  );

  /**
   * Delete a todo (soft delete by marking as removed)
   */
  const handleDeleteTodo = useCallback(
    (id?: string) => {
      if (!id) return;
      const todo = todos.find((t) => t.id === id);
      if (todo) {
        updateTodo({ ...todo, removed: true });
      }
    },
    [todos, updateTodo]
  );

  /**
   * Toggle todo completion status
   */
  const toggleTodo = useCallback(
    (id: string) => {
      const todo = todos.find((t) => t.id === id);
      if (todo) {
        updateTodo({ ...todo, completed: !todo.completed });
      }
    },
    [todos, updateTodo]
  );

  /**
   * Bulk update all todos using the Todonna module
   */
  const setAllTodos = useCallback(
    async (newTodos: TodoItem[]) => {
      if (!remoteStorage) return;

      isSavingRef.current = true;
      const previousTodos = todos;

      try {
        // Optimistically update local state
        setTodos(newTodos.filter((t) => !t.removed).map(serializeTodo));

        // Use Todonna module's replaceAll for efficient bulk operations
        await remoteStorage.todonna.replaceAll(
          newTodos.filter((t) => !t.removed)
        );

        console.log(`Bulk updated ${newTodos.length} todos`);
      } catch (error) {
        console.error("Failed to bulk update todos:", error);
        // Rollback on error
        setTodos(previousTodos);
      } finally {
        setTimeout(() => {
          isSavingRef.current = false;
        }, 100);
      }
    },
    [remoteStorage, todos]
  );

  /**
   * Clear all todos for the selected date using Todonna module
   */
  const clearAllTodos = useCallback(async () => {
    if (!remoteStorage) return;

    isSavingRef.current = true;

    try {
      await remoteStorage.todonna.clearByDate(selectedDate);
      // Reload to sync state
      await loadTodos();
    } catch (error) {
      console.error("Failed to clear todos:", error);
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
      }, 100);
    }
  }, [remoteStorage, selectedDate, loadTodos]);

  /**
   * Clear completed todos for the selected date using Todonna module
   */
  const clearCompletedTodos = useCallback(async () => {
    if (!remoteStorage) return;

    isSavingRef.current = true;

    try {
      await remoteStorage.todonna.clearCompletedByDate(selectedDate);
      // Reload to sync state
      await loadTodos();
    } catch (error) {
      console.error("Failed to clear completed todos:", error);
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
      }, 100);
    }
  }, [remoteStorage, selectedDate, loadTodos]);

  /**
   * Clear incomplete todos for the selected date using Todonna module
   */
  const clearIncompleteTodos = useCallback(async () => {
    if (!remoteStorage) return;

    isSavingRef.current = true;

    try {
      await remoteStorage.todonna.clearIncompleteByDate(selectedDate);
      // Reload to sync state
      await loadTodos();
    } catch (error) {
      console.error("Failed to clear incomplete todos:", error);
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
      }, 100);
    }
  }, [remoteStorage, selectedDate, loadTodos]);

  // ========== UI Action Handlers ==========

  /**
   * Handle natural language input and execute AI-determined actions
   */
  const handleAction = async (text: string, emoji: string) => {
    if (!text.trim()) return;

    setIsLoading(true);

    let newTodos = [...todos];

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Filter todos for the selected date
      const filteredTodos = todos.filter(
        (todo) => isOnSelectedDate(todo) && !todo.removed
      );

      const actions = (
        await determineAction(
          text,
          emoji || "",
          filteredTodos,
          "vif-openai",
          timezone,
          apiKey
        )
      ).actions;

      for (const action of actions) {
        switch (action.action) {
          case "add":
            const todoDate = action.targetDate
              ? new Date(action.targetDate)
              : selectedDate;
            newTodos.push(
              createTodo(
                action.text || text,
                action.emoji || emoji,
                todoDate,
                action.time
              )
            );
            break;

          case "delete":
            if (action.todoId) {
              handleDeleteTodo(action.todoId);
            }
            break;

          case "mark":
            if (action.todoId) {
              newTodos = newTodos.map((todo) =>
                todo.id === action.todoId
                  ? {
                      ...todo,
                      completed:
                        action.status === "complete"
                          ? true
                          : action.status === "incomplete"
                          ? false
                          : !todo.completed,
                    }
                  : todo
              );
            }
            break;

          case "sort":
            if (action.sortBy) {
              setSortBy(action.sortBy);
            }
            break;

          case "edit":
            if (action.todoId && action.text) {
              const todo = todos.find((t) => t.id === action.todoId);
              if (todo) {
                const updated = serializeTodo({
                  ...todo,
                  text: action.text,
                  emoji: action.emoji || todo.emoji,
                  date: action.targetDate ? new Date(action.targetDate) : todo.date,
                  time: action.time || todo.time,
                  completed: action.status === "complete",
                });
                await updateTodo(updated);
              }
            }
            break;

          case "clear":
            if (action.listToClear === "all") {
              await clearAllTodos();
            } else if (action.listToClear === "completed") {
              await clearCompletedTodos();
            } else if (action.listToClear === "incomplete") {
              await clearIncompleteTodos();
            }
            break;
        }
      }

      await setAllTodos(newTodos);
    } catch (error) {
      console.error("AI Action failed:", error);
      await addTodo(createTodo(text, emoji));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Start editing a todo
   */
  const startEditing = (id: string, text: string, emoji?: string) => {
    const todo = todos.find((t) => t.id === id);
    startEditingStore(id, text, emoji || "", todo?.time || "");
  };

  /**
   * Handle editing a todo
   */
  const handleEditTodo = (updatedTodo: TodoItem) => {
    if (updatedTodo.text.trim()) {
      const todo = todos.find((t) => t.id === updatedTodo.id);
      if (todo) {
        const updated = serializeTodo({
          ...todo,
          text: updatedTodo.text,
          emoji: updatedTodo.emoji,
          time: updatedTodo.time,
        });
        updateTodo(updated);
      }
    }
    cancelEditingStore();
  };

  // ========== Effects ==========

  // Initial load and change listeners
  useEffect(() => {
    if (!remoteStorage) return;

    // Listen for changes to todonna items (only from other sources, not our own saves)
    const changeHandler = () => {
      // Don't reload if we're currently saving (prevents loops)
      if (
        isInitializedRef.current &&
        !isSavingRef.current &&
        !loadingRef.current
      ) {
        console.log("RemoteStorage changed externally, reloading...");
        loadTodos();
      }
    };

    remoteStorage.onChange("/todonna/", changeHandler);

    // Initial load
    loadTodos();

    // Cleanup
    return () => {
      // Note: RemoteStorage doesn't provide a way to remove onChange listeners
    };
  }, [remoteStorage, loadTodos]);

  return {
    // Data
    todos,
    isLoadingTodonna,
    // UI state
    isLoading,
    sortBy,
    setSortBy,
    // Actions
    handleAction,
    toggleTodo,
    startEditing,
    cancelEditing: cancelEditingStore,
    handleEditTodo,
    clearAllTodos,
    clearCompletedTodos,
    clearIncompleteTodos,
    handleDeleteTodo,
  };
}
