'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type RemoteStorage from 'remotestoragejs';
import { TodoItem } from '@/types';
import { serializeTodo } from '@/lib/utils/todo';

interface TodonnaItem {
  todo_item_text: string;
  completed?: boolean;
  emoji?: string;
  date?: string;
  time?: string;
  [key: string]: any;
}

export function useTodonna(remoteStorage: RemoteStorage | null) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start with true for initial load
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Track if we're currently saving to prevent reload loops
  const isSavingRef = useRef(false);
  const loadingRef = useRef(false);

  // Load todos from RemoteStorage
  const loadTodos = useCallback(async () => {
    console.timeEnd('Time to todos');
    console.time('loadTodos');
    if (!remoteStorage || loadingRef.current) return;

    loadingRef.current = true;

    // Only show loading indicator for initial load or external reloads
    if (!isInitializedRef.current) {
      setIsLoading(true);
    }

    try {
      const client = remoteStorage.scope("/todonna/");
      remoteStorage.caching.enable("/todonna/");
      const listing = await client.getListing("", 1000 * 60 * 60 * 24);

      if (typeof listing !== "object" || !listing) {
        setTodos([]);
        isInitializedRef.current = true;
        setIsLoading(false);
        return;
      }

      const filenames = Object.keys(listing as object);

      // Fetch all files in parallel for better performance
      const loadPromises = filenames.map(async (filename) => {
        try {
          debugger;
          const itemValue = await client.getObject(filename, 1000 * 60 * 60 * 24);

          if (
            typeof itemValue === "object" &&
            itemValue !== null &&
            'todo_item_text' in itemValue
          ) {
            const todonnaItem = itemValue as TodonnaItem;
            const id = filename.replace('.json', '');

            return serializeTodo({
              id,
              text: todonnaItem.todo_item_text,
              completed: todonnaItem.completed || false,
              emoji: todonnaItem.emoji,
              date: todonnaItem.date ? new Date(todonnaItem.date) : new Date(),
              time: todonnaItem.time,
              removed: false
            });
          }
        } catch (error) {
          console.error(`Failed to load todo ${filename}:`, error);
        }
        return null;
      });

      const results = await Promise.all(loadPromises);
      const loadedTodos = results.filter((todo): todo is TodoItem => todo !== null);

      console.timeEnd('loadTodos');
      console.log(`Loaded ${loadedTodos.length} todos from RemoteStorage`);
      setTodos(loadedTodos);
      isInitializedRef.current = true;
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to load todos:", error);
      setTodos([]);
      isInitializedRef.current = true;
      setIsLoading(false);
    } finally {
      loadingRef.current = false;
    }
  }, [remoteStorage]);

  // Initial load and change listeners
  useEffect(() => {
    if (!remoteStorage) return;

    // Listen for changes to todonna items (only from other sources, not our own saves)
    const changeHandler = () => {
      // Don't reload if we're currently saving (prevents loops)
      if (isInitializedRef.current && !isSavingRef.current && !loadingRef.current) {
        console.log("RemoteStorage changed externally, reloading...");
        loadTodos();
      }
    };

    remoteStorage.onChange('/todonna/', changeHandler);

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

  // Add a new todo
  const addTodo = useCallback(async (todo: TodoItem) => {
    if (!remoteStorage) return;

    isSavingRef.current = true;
    try {
      // Optimistically update local state first (instant UI)
      setTodos(prev => [...prev, serializeTodo(todo)]);

      const client = remoteStorage.scope("/todonna/");
      const filename = `${todo.id}.json`;

      const todonnaItem: TodonnaItem = {
        todo_item_text: todo.text,
        completed: todo.completed,
        emoji: todo.emoji,
        date: todo.date instanceof Date ? todo.date.toISOString() : todo.date,
        time: todo.time,
      };

      const jsonString = JSON.stringify(todonnaItem);
      await client.storeFile("application/json", filename, jsonString);

      console.log(`Added todo: ${todo.text}`);
    } catch (error) {
      console.error("Failed to add todo:", error);
      // Rollback on error
      setTodos(prev => prev.filter(t => t.id !== todo.id));
    } finally {
      // Wait a bit before allowing reloads
      setTimeout(() => {
        isSavingRef.current = false;
      }, 100);
    }
  }, [remoteStorage]);

  // Update an existing todo
  const updateTodo = useCallback(async (todo: TodoItem) => {
    if (!remoteStorage) return;

    isSavingRef.current = true;
    const previousTodos = todos;

    try {
      // Optimistically update local state first (instant UI)
      setTodos(prev => prev.map(t => t.id === todo.id ? serializeTodo(todo) : t));

      const client = remoteStorage.scope("/todonna/");
      const filename = `${todo.id}.json`;

      const todonnaItem: TodonnaItem = {
        todo_item_text: todo.text,
        completed: todo.completed,
        emoji: todo.emoji,
        date: todo.date instanceof Date ? todo.date.toISOString() : todo.date,
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
  }, [remoteStorage, todos]);

  // Delete a todo
  const deleteTodo = useCallback(async (id: string) => {
    if (!remoteStorage) return;

    isSavingRef.current = true;
    const previousTodos = todos;

    try {
      // Optimistically update local state first (instant UI)
      setTodos(prev => prev.filter(t => t.id !== id));

      const client = remoteStorage.scope("/todonna/");
      const filename = `${id}.json`;

      await client.remove(filename);

      console.log(`Deleted todo: ${id}`);
    } catch (error) {
      console.error("Failed to delete todo:", error);
      // Rollback on error
      setTodos(previousTodos);
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
      }, 100);
    }
  }, [remoteStorage, todos]);

  // Bulk update todos
  const setAllTodos = useCallback(async (newTodos: TodoItem[]) => {
    if (!remoteStorage) return;

    isSavingRef.current = true;
    const previousTodos = todos;

    try {
      // Optimistically update local state first (instant UI)
      setTodos(newTodos.filter(t => !t.removed).map(serializeTodo));

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
          date: todo.date instanceof Date ? todo.date.toISOString() : todo.date,
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
  }, [remoteStorage, todos]);

  return {
    todos,
    isLoading,
    addTodo,
    updateTodo,
    deleteTodo,
    setAllTodos
  };
}