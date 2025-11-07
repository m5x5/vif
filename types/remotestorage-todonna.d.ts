/**
 * Type declarations for RemoteStorage Todonna module
 * 
 * These declarations allow TypeScript to properly type the `todonna` module
 * when accessed via RemoteStorage instance (e.g., `remoteStorage.todonna`)
 */

import type { TodoItem } from '@/types';
import type { LoadOptions, BatchOperationOptions, BatchResult } from '@/lib/remotestorage-todonna';

declare module 'remotestoragejs' {
  interface RemoteStorage {
    /**
     * Todonna module for managing todo items
     * 
     * @example
     * ```typescript
     * const rs = new RemoteStorage({ modules: [Todonna] });
     * rs.access.claim('todonna', 'rw');
     * 
     * // Add a todo
     * await rs.todonna.add({
     *   id: 'abc123',
     *   text: 'Buy groceries',
     *   completed: false,
     *   date: new Date()
     * });
     * 
     * // Get all todos
     * const todos = await rs.todonna.getAll();
     * ```
     */
    todonna: {
      /**
       * Add a new todo item to RemoteStorage
       */
      add: (todo: TodoItem) => Promise<void>;

      /**
       * Update an existing todo item
       */
      update: (
        id: string,
        updates: Partial<Omit<TodoItem, 'id'>>
      ) => Promise<void>;

      /**
       * Remove a todo item from RemoteStorage (hard delete)
       */
      remove: (id: string) => Promise<void>;

      /**
       * Get a specific todo item by ID
       */
      get: (id: string, maxAge?: number) => Promise<TodoItem | null>;

      /**
       * Get all todo items from RemoteStorage
       */
      getAll: (options?: LoadOptions) => Promise<TodoItem[]>;

      /**
       * Get todos for a specific date
       */
      getByDate: (date: Date, options?: LoadOptions) => Promise<TodoItem[]>;

      /**
       * Batch add multiple todos
       */
      batchAdd: (
        todos: TodoItem[],
        options?: BatchOperationOptions
      ) => Promise<BatchResult>;

      /**
       * Batch update multiple todos
       */
      batchUpdate: (
        updates: Array<{ id: string; updates: Partial<Omit<TodoItem, 'id'>> }>,
        options?: BatchOperationOptions
      ) => Promise<BatchResult>;

      /**
       * Batch remove multiple todos
       */
      batchRemove: (
        ids: string[],
        options?: BatchOperationOptions
      ) => Promise<BatchResult>;

      /**
       * Clear all todos for a specific date
       */
      clearByDate: (date: Date) => Promise<number>;

      /**
       * Clear completed todos for a specific date
       */
      clearCompletedByDate: (date: Date) => Promise<number>;

      /**
       * Clear incomplete todos for a specific date
       */
      clearIncompleteByDate: (date: Date) => Promise<number>;

      /**
       * Replace all todos with a new set
       */
      replaceAll: (todos: TodoItem[]) => Promise<BatchResult>;

      /**
       * Count todos matching specific criteria
       */
      count: (filter?: (todo: TodoItem) => boolean) => Promise<number>;
    };
  }
}

