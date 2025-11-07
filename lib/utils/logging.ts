/**
 * Logging utilities for Vif application
 * 
 * Provides helper functions for logging essential actions to RemoteStorage
 */

import type RemoteStorage from 'remotestoragejs';
import type { LogEntry } from '@/lib/remotestorage-logs';

/**
 * Generate a unique log ID
 */
function generateLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Log an action to RemoteStorage
 * 
 * @param remoteStorage - RemoteStorage instance
 * @param action - Action type (e.g., 'add_todo', 'delete_todo', 'toggle_todo')
 * @param metadata - Optional metadata about the action
 * @returns Promise that resolves when the log is stored
 */
export async function logAction(
  remoteStorage: RemoteStorage | null,
  action: string,
  metadata?: Record<string, any>
): Promise<void> {
  if (!remoteStorage) {
    // Silently fail if RemoteStorage is not available
    return;
  }

  try {
    const logEntry: LogEntry = {
      id: generateLogId(),
      action,
      timestamp: new Date(),
      metadata,
    };

    await remoteStorage.logs.add(logEntry);
  } catch (error) {
    // Log errors to console but don't throw
    // Logging failures shouldn't break the application
    console.error('Failed to log action:', error);
  }
}

/**
 * Log a todo-related action
 * 
 * @param remoteStorage - RemoteStorage instance
 * @param action - Action type
 * @param todoId - ID of the todo item
 * @param additionalMetadata - Additional metadata
 */
export async function logTodoAction(
  remoteStorage: RemoteStorage | null,
  action: string,
  todoId: string,
  additionalMetadata?: Record<string, any>
): Promise<void> {
  return logAction(remoteStorage, action, {
    todoId,
    ...additionalMetadata,
  });
}

/**
 * Predefined action types for consistency
 */
export const LogActions = {
  // Todo actions
  ADD_TODO: 'add_todo',
  UPDATE_TODO: 'update_todo',
  DELETE_TODO: 'delete_todo',
  UNARCHIVE_TODO: 'unarchive_todo',
  TOGGLE_TODO: 'toggle_todo',
  CLEAR_ALL_TODOS: 'clear_all_todos',
  CLEAR_COMPLETED_TODOS: 'clear_completed_todos',
  CLEAR_INCOMPLETE_TODOS: 'clear_incomplete_todos',
  
  // AI actions
  AI_ACTION: 'ai_action',
  AI_ACTION_FAILED: 'ai_action_failed',
  
  // View actions
  CHANGE_VIEW: 'change_view',
  CHANGE_DATE: 'change_date',
  CHANGE_SORT: 'change_sort',
  
  // Sync actions
  SYNC_TODOS: 'sync_todos',
  SYNC_FAILED: 'sync_failed',
} as const;

