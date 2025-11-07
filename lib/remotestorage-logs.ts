/**
 * RemoteStorage Logs Module
 * 
 * A RemoteStorage.js data module for storing application logs.
 * This module provides a clean API for logging essential actions and events.
 * 
 * @example
 * ```typescript
 * import { Logs } from '@/lib/remotestorage-logs';
 * import RemoteStorage from 'remotestoragejs';
 * 
 * const rs = new RemoteStorage({ modules: [Logs] });
 * rs.access.claim('logs', 'rw');
 * 
 * const logs = rs.logs;
 * 
 * // Log an action
 * await logs.add({
 *   id: 'log-123',
 *   action: 'add_todo',
 *   timestamp: new Date(),
 *   metadata: { todoId: 'abc123', text: 'Buy groceries' }
 * });
 * 
 * // Get all logs
 * const allLogs = await logs.getAll();
 * 
 * // Get logs for a date range
 * const recentLogs = await logs.getByDateRange(startDate, endDate);
 * ```
 */

import type { RSModule } from 'remotestoragejs';

/**
 * Log entry interface
 */
export interface LogEntry {
  /** Unique identifier for the log entry */
  id: string;
  /** Type of action/event */
  action: string;
  /** Timestamp of when the action occurred */
  timestamp: Date;
  /** Optional metadata about the action */
  metadata?: Record<string, any>;
  /** Optional user ID or session ID */
  userId?: string;
}

/**
 * Log storage format
 */
interface LogStorageItem {
  /** Type of action/event */
  action: string;
  /** ISO date string for the timestamp */
  timestamp: string;
  /** Optional metadata about the action */
  metadata?: Record<string, any>;
  /** Optional user ID or session ID */
  userId?: string;
}

/**
 * Options for loading logs
 */
export interface LoadLogsOptions {
  /** Maximum age of cached data in milliseconds (default: 1 hour) */
  maxAge?: number;
  /** Filter by action type */
  action?: string;
  /** Start date for filtering */
  startDate?: Date;
  /** End date for filtering */
  endDate?: Date;
}

/**
 * RemoteStorage Logs Module
 * 
 * Provides a clean, documented API for managing logs using RemoteStorage.js
 */
export const Logs: RSModule = {
  name: 'logs',
  builder: function (privateClient, publicClient) {
    // Declare the Log type schema
    privateClient.declareType('log-entry', {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'The type of action or event',
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          description: 'ISO 8601 date string for when the action occurred',
        },
        metadata: {
          type: 'object',
          description: 'Optional metadata about the action',
        },
        userId: {
          type: 'string',
          description: 'Optional user ID or session ID',
        },
      },
      required: ['action', 'timestamp'],
    });

    /**
     * Converts a LogEntry to storage format
     */
    function toLogStorageItem(log: LogEntry): LogStorageItem {
      const item: LogStorageItem = {
        action: log.action,
        timestamp: log.timestamp instanceof Date 
          ? log.timestamp.toISOString() 
          : log.timestamp,
      };

      if (log.metadata !== undefined) {
        item.metadata = log.metadata;
      }
      if (log.userId !== undefined) {
        item.userId = log.userId;
      }

      return item;
    }

    /**
     * Converts storage format to LogEntry
     */
    function fromLogStorageItem(id: string, item: LogStorageItem): LogEntry {
      return {
        id,
        action: item.action,
        timestamp: new Date(item.timestamp),
        metadata: item.metadata,
        userId: item.userId,
      };
    }

    /**
     * Gets the filename for a log ID
     */
    function getFilename(id: string): string {
      return `${id}.json`;
    }

    return {
      exports: {
        /**
         * Add a new log entry to RemoteStorage
         * 
         * @param log - The log entry to add
         * @returns Promise that resolves when the log is stored
         * 
         * @example
         * ```typescript
         * await logs.add({
         *   id: 'log-123',
         *   action: 'add_todo',
         *   timestamp: new Date(),
         *   metadata: { todoId: 'abc123', text: 'Buy groceries' }
         * });
         * ```
         */
        add: async function (log: LogEntry): Promise<void> {
          const filename = getFilename(log.id);
          const item = toLogStorageItem(log);
          await privateClient.storeObject('log-entry', filename, item);
        },

        /**
         * Get a specific log entry by ID
         * 
         * @param id - The ID of the log to retrieve
         * @param maxAge - Optional cache max age in milliseconds
         * @returns Promise that resolves to the log entry, or null if not found
         */
        get: async function (
          id: string,
          maxAge?: number
        ): Promise<LogEntry | null> {
          const filename = getFilename(id);
          const item = await privateClient.getObject(filename, maxAge);

          if (!item || typeof item !== 'object' || !('action' in item)) {
            return null;
          }

          return fromLogStorageItem(id, item as LogStorageItem);
        },

        /**
         * Get all log entries from RemoteStorage
         * 
         * @param options - Options for loading logs
         * @returns Promise that resolves to an array of log entries
         * 
         * @example
         * ```typescript
         * // Get all logs
         * const allLogs = await logs.getAll();
         * 
         * // Get logs for a specific action
         * const addLogs = await logs.getAll({ action: 'add_todo' });
         * 
         * // Get logs for a date range
         * const recentLogs = await logs.getAll({
         *   startDate: new Date('2025-01-01'),
         *   endDate: new Date('2025-01-31')
         * });
         * ```
         */
        getAll: async function (options?: LoadLogsOptions): Promise<LogEntry[]> {
          const maxAge = options?.maxAge ?? 1000 * 60 * 60; // 1 hour default
          const { action, startDate, endDate } = options || {};

          const listing = await privateClient.getListing('', maxAge);

          if (!listing || typeof listing !== 'object') {
            return [];
          }

          const filenames = Object.keys(listing);
          const logs: LogEntry[] = [];

          // Load all logs in parallel
          const results = await Promise.allSettled(
            filenames.map(async (filename) => {
              const item = await privateClient.getObject(filename, maxAge);

              if (
                item &&
                typeof item === 'object' &&
                'action' in item
              ) {
                const id = filename.replace('.json', '');
                return fromLogStorageItem(id, item as LogStorageItem);
              }
              return null;
            })
          );

          // Filter out failed loads and null results, then apply filters
          for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
              const log = result.value;
              
              // Filter by action
              if (action && log.action !== action) {
                continue;
              }
              
              // Filter by date range
              if (startDate && log.timestamp < startDate) {
                continue;
              }
              if (endDate && log.timestamp > endDate) {
                continue;
              }
              
              logs.push(log);
            }
          }

          // Sort by timestamp (newest first)
          return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        },

        /**
         * Get logs for a specific date range
         * 
         * @param startDate - Start date for filtering
         * @param endDate - End date for filtering
         * @param options - Additional options
         * @returns Promise that resolves to an array of log entries
         */
        getByDateRange: async function (
          startDate: Date,
          endDate: Date,
          options?: Omit<LoadLogsOptions, 'startDate' | 'endDate'>
        ): Promise<LogEntry[]> {
          return this.getAll({
            ...options,
            startDate,
            endDate,
          });
        },

        /**
         * Get logs for a specific action type
         * 
         * @param action - The action type to filter by
         * @param options - Additional options
         * @returns Promise that resolves to an array of log entries
         */
        getByAction: async function (
          action: string,
          options?: Omit<LoadLogsOptions, 'action'>
        ): Promise<LogEntry[]> {
          return this.getAll({
            ...options,
            action,
          });
        },

        /**
         * Remove a log entry from RemoteStorage
         * 
         * @param id - The ID of the log to remove
         * @returns Promise that resolves when the log is removed
         */
        remove: async function (id: string): Promise<void> {
          const filename = getFilename(id);
          await privateClient.remove(filename);
        },

        /**
         * Remove logs older than a specified date
         * 
         * @param beforeDate - Remove logs before this date
         * @returns Promise that resolves to the number of logs removed
         */
        removeOlderThan: async function (beforeDate: Date): Promise<number> {
          const allLogs = await this.getAll();
          const toRemove = allLogs
            .filter((log: LogEntry) => log.timestamp < beforeDate)
            .map((log: LogEntry) => log.id);

          let removed = 0;
          for (const id of toRemove) {
            try {
              await this.remove(id);
              removed++;
            } catch (error: any) {
              console.error(`Failed to remove log ${id}:`, error);
            }
          }

          return removed;
        },

        /**
         * Count logs matching specific criteria
         * 
         * @param options - Options for filtering logs
         * @returns Promise that resolves to the count
         */
        count: async function (options?: LoadLogsOptions): Promise<number> {
          const logs = await this.getAll(options);
          return logs.length;
        },
      },
    };
  },
};

