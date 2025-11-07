/**
 * Type declarations for RemoteStorage Logs module
 * 
 * These declarations allow TypeScript to properly type the `logs` module
 * when accessed via RemoteStorage instance (e.g., `remoteStorage.logs`)
 */

import type { LogEntry, LoadLogsOptions } from '@/lib/remotestorage-logs';

declare module 'remotestoragejs' {
  interface RemoteStorage {
    /**
     * Logs module for storing application logs
     * 
     * @example
     * ```typescript
     * const rs = new RemoteStorage({ modules: [Logs] });
     * rs.access.claim('logs', 'rw');
     * 
     * // Add a log entry
     * await rs.logs.add({
     *   id: 'log-123',
     *   action: 'add_todo',
     *   timestamp: new Date(),
     *   metadata: { todoId: 'abc123' }
     * });
     * 
     * // Get all logs
     * const logs = await rs.logs.getAll();
     * ```
     */
    logs: {
      /**
       * Add a new log entry to RemoteStorage
       */
      add: (log: LogEntry) => Promise<void>;

      /**
       * Get a specific log entry by ID
       */
      get: (id: string, maxAge?: number) => Promise<LogEntry | null>;

      /**
       * Get all log entries from RemoteStorage
       */
      getAll: (options?: LoadLogsOptions) => Promise<LogEntry[]>;

      /**
       * Get logs for a specific date range
       */
      getByDateRange: (
        startDate: Date,
        endDate: Date,
        options?: Omit<LoadLogsOptions, 'startDate' | 'endDate'>
      ) => Promise<LogEntry[]>;

      /**
       * Get logs for a specific action type
       */
      getByAction: (
        action: string,
        options?: Omit<LoadLogsOptions, 'action'>
      ) => Promise<LogEntry[]>;

      /**
       * Remove a log entry from RemoteStorage
       */
      remove: (id: string) => Promise<void>;

      /**
       * Remove logs older than a specified date
       */
      removeOlderThan: (beforeDate: Date) => Promise<number>;

      /**
       * Count logs matching specific criteria
       */
      count: (options?: LoadLogsOptions) => Promise<number>;
    };
  }
}

