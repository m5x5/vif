import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import type RemoteStorage from "remotestoragejs";
import { determineAction } from "@/app/actions";
import { TodoItem, SortOption } from "@/types";
import { serializeTodo } from "@/lib/utils/todo";

interface TodonnaItem {
  todo_item_text: string;
  completed?: boolean;
  emoji?: string;
  date?: string;
  time?: string;
  [key: string]: any;
}

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
  // Todonna state
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isLoadingTodonna, setIsLoadingTodonna] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const isSavingRef = useRef(false);
  const loadingRef = useRef(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editEmoji, setEditEmoji] = useState("");

  // Helper: Check if todo is on selected date
  const isOnSelectedDate = (todo: TodoItem) => {
    return format(todo.date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
  };

  // Helper: Reset edit state
  const resetEditState = () => {
    setEditingTodoId(null);
    setEditText("");
    setEditEmoji("");
  };

  // Helper: Find and update a todo
  const findAndUpdateTodo = (id: string, updates: Partial<TodoItem>) => {
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      updateTodo({ ...todo, ...updates });
    }
  };

  // Helper: Clear todos based on type
  const clearTodosByType = (listToClear: "all" | "completed" | "incomplete") => {
    let remaining: TodoItem[];

    switch (listToClear) {
      case "all":
        remaining = todos.filter((todo) => !isOnSelectedDate(todo));
        break;
      case "completed":
        remaining = todos.filter((todo) => !(todo.completed && isOnSelectedDate(todo)));
        break;
      case "incomplete":
        remaining = todos.filter((todo) => !(!todo.completed && isOnSelectedDate(todo)));
        break;
    }

    return remaining;
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

  const handleDeleteTodo = (id?: string) => {
    if (!id) return;
    findAndUpdateTodo(id, { removed: true });
  };

  // Helper: Update a todo by ID with a transformer function
  const updateTodoById = (
    todos: TodoItem[],
    todoId: string,
    transformer: (todo: TodoItem) => TodoItem
  ): TodoItem[] => {
    return todos.map((todo) =>
      todo.id === todoId ? transformer(todo) : todo
    );
  };

  // ========== Todonna Storage Operations ==========

  // Load todos from RemoteStorage
  const loadTodos = useCallback(async () => {
    console.time("loadTodos");
    if (!remoteStorage || loadingRef.current) return;

    loadingRef.current = true;

    // Only show loading indicator for initial load or external reloads
    if (!isInitializedRef.current) {
      setIsLoadingTodonna(true);
    }

    try {
      const client = remoteStorage.scope("/todonna/");
      remoteStorage.caching.enable("/todonna/");
      const listing = await client.getListing("", 1000 * 60 * 60 * 24);

      if (typeof listing !== "object" || !listing) {
        setTodos([]);
        isInitializedRef.current = true;
        setIsLoadingTodonna(false);
        return;
      }

      const filenames = Object.keys(listing as object);

      // Fetch all files in parallel for better performance
      const loadPromises = filenames.map(async (filename) => {
        try {
          const itemValue = await client.getObject(filename, 1000 * 60 * 60 * 24);

          if (
            typeof itemValue === "object" &&
            itemValue !== null &&
            "todo_item_text" in itemValue
          ) {
            const todonnaItem = itemValue as TodonnaItem;
            const id = filename.replace(".json", "");

            return serializeTodo({
              id,
              text: todonnaItem.todo_item_text,
              completed: todonnaItem.completed || false,
              emoji: todonnaItem.emoji,
              date: todonnaItem.date ? new Date(todonnaItem.date) : new Date(),
              time: todonnaItem.time,
              removed: false,
            });
          }
        } catch (error) {
          console.error(`Failed to load todo ${filename}:`, error);
        }
        return null;
      });

      const results = await Promise.all(loadPromises);
      const loadedTodos = results.filter(
        (todo): todo is TodoItem => todo !== null
      );

      console.timeEnd("loadTodos");
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
  }, [remoteStorage]);

  // Add a new todo
  const addTodo = useCallback(
    async (todo: TodoItem) => {
      if (!remoteStorage) return;

      isSavingRef.current = true;
      try {
        // Optimistically update local state first (instant UI)
        setTodos((prev) => [...prev, serializeTodo(todo)]);

        const client = remoteStorage.scope("/todonna/");
        const filename = `${todo.id}.json`;

        const todonnaItem: TodonnaItem = {
          todo_item_text: todo.text,
          completed: todo.completed,
          emoji: todo.emoji,
          date:
            todo.date instanceof Date ? todo.date.toISOString() : todo.date,
          time: todo.time,
        };

        const jsonString = JSON.stringify(todonnaItem);
        await client.storeFile("application/json", filename, jsonString);

        console.log(`Added todo: ${todo.text}`);
      } catch (error) {
        console.error("Failed to add todo:", error);
        // Rollback on error
        setTodos((prev) => prev.filter((t) => t.id !== todo.id));
      } finally {
        // Wait a bit before allowing reloads
        setTimeout(() => {
          isSavingRef.current = false;
        }, 100);
      }
    },
    [remoteStorage]
  );

  // Update an existing todo
  const updateTodo = useCallback(
    async (todo: TodoItem) => {
      if (!remoteStorage) return;

      isSavingRef.current = true;
      const previousTodos = todos;

      try {
        // Optimistically update local state first (instant UI)
        setTodos((prev) =>
          prev.map((t) => (t.id === todo.id ? serializeTodo(todo) : t))
        );

        const client = remoteStorage.scope("/todonna/");
        const filename = `${todo.id}.json`;

        const todonnaItem: TodonnaItem = {
          todo_item_text: todo.text,
          completed: todo.completed,
          emoji: todo.emoji,
          date:
            todo.date instanceof Date ? todo.date.toISOString() : todo.date,
          time: todo.time,
        };

        const jsonString = JSON.stringify(todonnaItem);
        await client.storeFile("application/json", filename, jsonString);

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

  // Bulk update todos
  const setAllTodos = useCallback(
    async (newTodos: TodoItem[]) => {
      if (!remoteStorage) return;

      isSavingRef.current = true;
      const previousTodos = todos;

      try {
        // Optimistically update local state first (instant UI)
        setTodos(newTodos.filter((t) => !t.removed).map(serializeTodo));

        const client = remoteStorage.scope("/todonna/");

        // Get existing items
        const listing = await client.getListing("");
        const existingKeys = new Set(
          typeof listing === "object" && listing
            ? Object.keys(listing as object)
            : []
        );

        const activeIds = new Set<string>();

        // Prepare all save/update operations
        const savePromises: Promise<any | string>[] = [];

        // Save or update all todos in parallel
        for (const todo of newTodos) {
          if (todo.removed) continue;

          const filename = `${todo.id}.json`;
          activeIds.add(filename);

          const todonnaItem: TodonnaItem = {
            todo_item_text: todo.text,
            completed: todo.completed,
            emoji: todo.emoji,
            date:
              todo.date instanceof Date ? todo.date.toISOString() : todo.date,
            time: todo.time,
          };

          const jsonString = JSON.stringify(todonnaItem);
          savePromises.push(
            client.storeFile("application/json", filename, jsonString)
          );
        }

        // Delete removed todos in parallel
        const deletePromises: Promise<any>[] = [];
        for (const existingKey of existingKeys) {
          if (!activeIds.has(existingKey)) {
            deletePromises.push(client.remove(existingKey));
          }
        }

        // Execute all operations in parallel
        await Promise.all([...savePromises, ...deletePromises]);

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // ========== Action Handlers ==========

  const handleAction = async (text: string, emoji: string) => {
    if (!text.trim()) return;

    setIsLoading(true);

    let newTodos = [...todos];

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log("API Key:", apiKey);

      // Filter todos for the selected date
      const filteredTodos = todos.filter((todo) =>
        isOnSelectedDate(todo) && !todo.removed
      );

      const actions = (
        await determineAction(
          text,
          emoji || "",
          filteredTodos,
          "vif-openai", // Use OpenAI by default
          timezone,
          apiKey
        )
      ).actions;
      actions.forEach((action) => {
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
            handleDeleteTodo(action.todoId);
            break;

          case "mark":
            if (action.todoId) {
              newTodos = updateTodoById(newTodos, action.todoId, (todo) => {
                const completed =
                  action.status === "complete"
                    ? true
                    : action.status === "incomplete"
                    ? false
                    : !todo.completed;
                return { ...todo, completed };
              });
            }
            break;

          case "sort":
            if (action.sortBy) {
              setSortBy(action.sortBy);
            }
            break;

          case "edit":
            if (!action.todoId || !action.text) return;

            handleEditTodo({
              id: action.todoId,
              text: action.text,
              completed: action.status === "complete" ? true : false,
              emoji: action.emoji,
              date: action.targetDate ? new Date(action.targetDate) : selectedDate,
              time: action.time,
            });
            break;

          case "clear":
            if (action.listToClear) {
              newTodos = clearTodosByType(action.listToClear);
            }
            break;
        }
      });

      await setAllTodos(newTodos);
    } catch (error) {
      console.error("AI Action failed:", error);
      await addTodo(createTodo(text, emoji));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTodo = (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      updateTodo({ ...todo, completed: !todo.completed });
    }
  };

  const startEditing = (id: string, text: string, emoji?: string) => {
    setEditingTodoId(id);
    setEditText(text);
    setEditEmoji(emoji || "");
  };

  const cancelEditing = resetEditState;

  const handleEditTodo = (updatedTodo: TodoItem) => {
    if (updatedTodo.text.trim()) {
      console.log("Editing todo:", updatedTodo);

      const todo = todos.find((t) => t.id === updatedTodo.id);
      if (todo) {
        const updated = serializeTodo({
          ...todo,
          text: updatedTodo.text,
          emoji: updatedTodo.emoji,
          time: updatedTodo.time,
        });
        console.log("Updated todo:", updated);
        updateTodo(updated);
      }
    }
    resetEditState();
  };

  const clearAllTodos = () => {
    setAllTodos(clearTodosByType("all"));
  };

  const clearCompletedTodos = () => {
    setAllTodos(clearTodosByType("completed"));
  };

  const clearIncompleteTodos = () => {
    setAllTodos(clearTodosByType("incomplete"));
  };

  return {
    // Todonna data
    todos,
    isLoadingTodonna,
    // UI state
    isLoading,
    sortBy,
    setSortBy,
    editingTodoId,
    editText,
    editEmoji,
    setEditText,
    setEditEmoji,
    // Actions
    handleAction,
    toggleTodo,
    startEditing,
    cancelEditing,
    handleEditTodo,
    clearAllTodos,
    clearCompletedTodos,
    clearIncompleteTodos,
    handleDeleteTodo,
  };
}
