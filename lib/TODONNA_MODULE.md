# RemoteStorage Todonna Module

A properly architected RemoteStorage.js data module for managing todo items using the Todonna format specification. This module provides a clean, documented API that handles all the complexity of storage, serialization, and synchronization.

## Architecture Philosophy

This module follows the same pattern as the AI wallet module, separating data concerns from UI concerns:

- **Data Module** (`remotestorage-todonna.ts`): Pure data operations with RemoteStorage
- **Store Layer** (`use-todo-store.ts`): State management with Zustand
- **Hook Layer** (`use-todo-actions.ts`): React integration
- **Component Layer**: UI components that consume the hooks

## Key Features

✅ **Clean API**: Simple, well-documented functions with TSDoc  
✅ **Type Safety**: Full TypeScript support with proper declarations  
✅ **Optimistic Updates**: Instant UI updates with automatic rollback on errors  
✅ **Batch Operations**: Efficient bulk operations with progress tracking  
✅ **Error Handling**: Automatic error recovery and rollback  
✅ **Todonna Compliant**: Follows the official Todonna format specification  

## Installation & Setup

### 1. Import and Register the Module

```typescript
import { useRemoteStorage } from '@/hooks/use-remote-storage';
import { Todonna } from '@/lib/remotestorage-todonna';
import { AI } from 'remotestorage-module-ai-wallet';

// The Todonna module is automatically included by default
const remoteStorage = useRemoteStorage({
  modules: [AI], // Add any additional modules
  accessClaims: { 
    'todonna': 'rw',    // Read/write access to todos
    'ai-wallet': 'rw'   // Read/write access to AI config
  }
});
```

### 2. Access the Module API

Once registered, the module is available on the RemoteStorage instance:

```typescript
const todonna = remoteStorage.todonna;
```

## API Reference

### Core CRUD Operations

#### `add(todo: TodoItem): Promise<void>`

Add a new todo item to RemoteStorage.

```typescript
await remoteStorage.todonna.add({
  id: 'todo-123',
  text: 'Buy groceries',
  completed: false,
  emoji: '🛒',
  date: new Date('2025-11-08'),
  time: '15:00'
});
```

#### `update(id: string, updates: Partial<TodoItem>): Promise<void>`

Update an existing todo item. Only the fields you provide will be updated.

```typescript
// Mark as completed
await remoteStorage.todonna.update('todo-123', { 
  completed: true 
});

// Update text and emoji
await remoteStorage.todonna.update('todo-123', {
  text: 'Buy organic groceries',
  emoji: '🥬'
});
```

#### `remove(id: string): Promise<void>`

Remove a todo item from RemoteStorage (hard delete).

```typescript
await remoteStorage.todonna.remove('todo-123');
```

**Note**: For soft deletes (marking as removed), use `update()` instead:

```typescript
await remoteStorage.todonna.update('todo-123', { removed: true });
```

#### `get(id: string, maxAge?: number): Promise<TodoItem | null>`

Get a specific todo item by ID.

```typescript
const todo = await remoteStorage.todonna.get('todo-123');
if (todo) {
  console.log(todo.text);
}

// With custom cache age (5 minutes)
const freshTodo = await remoteStorage.todonna.get('todo-123', 5 * 60 * 1000);
```

#### `getAll(options?: LoadOptions): Promise<TodoItem[]>`

Get all todo items from RemoteStorage.

```typescript
// Get all active todos (default)
const todos = await remoteStorage.todonna.getAll();

// Include soft-deleted todos
const allTodos = await remoteStorage.todonna.getAll({ 
  includeRemoved: true 
});

// Use fresher cache (5 minutes instead of 24 hours)
const recentTodos = await remoteStorage.todonna.getAll({ 
  maxAge: 5 * 60 * 1000 
});
```

### Date-Based Operations

#### `getByDate(date: Date, options?: LoadOptions): Promise<TodoItem[]>`

Get todos for a specific date.

```typescript
const today = new Date();
const todayTodos = await remoteStorage.todonna.getByDate(today);

// Tomorrow's todos
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowTodos = await remoteStorage.todonna.getByDate(tomorrow);
```

#### `clearByDate(date: Date): Promise<number>`

Clear all todos for a specific date.

```typescript
const today = new Date();
const cleared = await remoteStorage.todonna.clearByDate(today);
console.log(`Cleared ${cleared} todos`);
```

#### `clearCompletedByDate(date: Date): Promise<number>`

Clear only completed todos for a specific date.

```typescript
const today = new Date();
const cleared = await remoteStorage.todonna.clearCompletedByDate(today);
console.log(`Cleared ${cleared} completed todos`);
```

#### `clearIncompleteByDate(date: Date): Promise<number>`

Clear only incomplete todos for a specific date.

```typescript
const today = new Date();
const cleared = await remoteStorage.todonna.clearIncompleteByDate(today);
console.log(`Cleared ${cleared} incomplete todos`);
```

### Batch Operations

All batch operations return a `BatchResult` with success/failure counts and detailed errors.

#### `batchAdd(todos: TodoItem[], options?: BatchOperationOptions): Promise<BatchResult>`

Add multiple todos at once.

```typescript
const result = await remoteStorage.todonna.batchAdd([
  { id: '1', text: 'Task 1', completed: false, date: new Date() },
  { id: '2', text: 'Task 2', completed: false, date: new Date() },
  { id: '3', text: 'Task 3', completed: false, date: new Date() }
], {
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  }
});

console.log(`Added ${result.succeeded} todos, ${result.failed} failed`);
if (result.errors.length > 0) {
  console.error('Errors:', result.errors);
}
```

#### `batchUpdate(updates: Array<{id, updates}>, options?: BatchOperationOptions): Promise<BatchResult>`

Update multiple todos at once.

```typescript
const result = await remoteStorage.todonna.batchUpdate([
  { id: '1', updates: { completed: true } },
  { id: '2', updates: { completed: true } },
  { id: '3', updates: { text: 'Updated text' } }
], {
  stopOnError: false, // Continue even if one fails
  onProgress: (completed, total) => {
    console.log(`Updated ${completed}/${total}`);
  }
});
```

#### `batchRemove(ids: string[], options?: BatchOperationOptions): Promise<BatchResult>`

Remove multiple todos at once.

```typescript
const result = await remoteStorage.todonna.batchRemove(['1', '2', '3']);
console.log(`Removed ${result.succeeded} todos`);
```

#### `replaceAll(todos: TodoItem[]): Promise<BatchResult>`

Replace all todos with a new set. This is useful for bulk sync operations.

**⚠️ Warning**: This is a destructive operation that removes all existing todos not in the new set.

```typescript
const newTodos = [
  { id: '1', text: 'New Task 1', completed: false, date: new Date() },
  { id: '2', text: 'New Task 2', completed: false, date: new Date() }
];

const result = await remoteStorage.todonna.replaceAll(newTodos);
console.log(`Synced ${result.succeeded} todos`);
```

**How it works:**
1. Compares existing todos with the new set
2. Adds todos that don't exist
3. Updates todos that exist but changed
4. Removes todos that are no longer in the set
5. Executes all operations in parallel for efficiency

### Utility Operations

#### `count(filter?: (todo: TodoItem) => boolean): Promise<number>`

Count todos matching specific criteria.

```typescript
// Count all todos
const total = await remoteStorage.todonna.count();

// Count completed todos
const completed = await remoteStorage.todonna.count(t => t.completed);

// Count todos for today
const today = new Date().toDateString();
const todayCount = await remoteStorage.todonna.count(t => 
  new Date(t.date).toDateString() === today
);

// Count todos with a specific emoji
const groceryCount = await remoteStorage.todonna.count(t => 
  t.emoji === '🛒'
);
```

## Type Definitions

### TodoItem

```typescript
interface TodoItem {
  /** Unique identifier for the todo */
  id: string;
  
  /** The todo text/description */
  text: string;
  
  /** Whether the todo is completed */
  completed: boolean;
  
  /** Optional emoji icon for the todo */
  emoji?: string;
  
  /** Target date for the todo */
  date: Date | string;
  
  /** Optional time in HH:mm format (24-hour) */
  time?: string;
  
  /** Soft delete flag - if true, the todo is marked as removed */
  removed?: boolean;
}
```

### LoadOptions

```typescript
interface LoadOptions {
  /** Maximum age of cached data in milliseconds (default: 24 hours) */
  maxAge?: number;
  
  /** Whether to include soft-deleted (removed) todos (default: false) */
  includeRemoved?: boolean;
}
```

### BatchOperationOptions

```typescript
interface BatchOperationOptions {
  /** Whether to stop on first error (default: false) */
  stopOnError?: boolean;
  
  /** Callback for progress updates */
  onProgress?: (completed: number, total: number) => void;
}
```

### BatchResult

```typescript
interface BatchResult {
  /** Number of successful operations */
  succeeded: number;
  
  /** Number of failed operations */
  failed: number;
  
  /** Array of errors that occurred */
  errors: Array<{ id: string; error: Error }>;
}
```

## Integration Examples

### Using with Zustand Store

```typescript
import { create } from 'zustand';
import type RemoteStorage from 'remotestoragejs';
import type { TodoItem } from '@/lib/remotestorage-todonna';

interface TodoStore {
  remoteStorage: RemoteStorage | null;
  todos: TodoItem[];
  
  setRemoteStorage: (rs: RemoteStorage) => void;
  loadTodos: () => Promise<void>;
  addTodo: (todo: TodoItem) => Promise<void>;
  updateTodo: (id: string, updates: Partial<TodoItem>) => Promise<void>;
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  remoteStorage: null,
  todos: [],
  
  setRemoteStorage: (rs) => {
    set({ remoteStorage: rs });
    get().loadTodos();
  },
  
  loadTodos: async () => {
    const { remoteStorage } = get();
    if (!remoteStorage) return;
    
    const todos = await remoteStorage.todonna.getAll();
    set({ todos });
  },
  
  addTodo: async (todo) => {
    const { remoteStorage, todos } = get();
    if (!remoteStorage) return;
    
    // Optimistic update
    set({ todos: [...todos, todo] });
    
    try {
      await remoteStorage.todonna.add(todo);
    } catch (error) {
      // Rollback on error
      set({ todos: todos.filter(t => t.id !== todo.id) });
      throw error;
    }
  },
  
  updateTodo: async (id, updates) => {
    const { remoteStorage, todos } = get();
    if (!remoteStorage) return;
    
    const previous = [...todos];
    
    // Optimistic update
    set({ 
      todos: todos.map(t => t.id === id ? { ...t, ...updates } : t) 
    });
    
    try {
      await remoteStorage.todonna.update(id, updates);
    } catch (error) {
      // Rollback on error
      set({ todos: previous });
      throw error;
    }
  }
}));
```

### Using in React Components

```typescript
import { useEffect } from 'react';
import { useRemoteStorage } from '@/hooks/use-remote-storage';
import { useTodoStore } from '@/stores/use-todo-store';

export function TodoComponent() {
  const remoteStorage = useRemoteStorage();
  const setRemoteStorage = useTodoStore(state => state.setRemoteStorage);
  const todos = useTodoStore(state => state.todos);
  const addTodo = useTodoStore(state => state.addTodo);
  
  useEffect(() => {
    if (remoteStorage) {
      setRemoteStorage(remoteStorage);
    }
  }, [remoteStorage, setRemoteStorage]);
  
  const handleAddTodo = async () => {
    await addTodo({
      id: Math.random().toString(36).substring(7),
      text: 'New todo',
      completed: false,
      date: new Date()
    });
  };
  
  return (
    <div>
      <button onClick={handleAddTodo}>Add Todo</button>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Error Handling

The module provides automatic error handling with rollback:

```typescript
const { remoteStorage } = get();
const previousTodos = [...todos];

try {
  // Optimistic update (instant UI)
  set({ todos: updatedTodos });
  
  // Persist to RemoteStorage
  await remoteStorage.todonna.update(id, updates);
} catch (error) {
  // Automatic rollback on error
  set({ todos: previousTodos });
  console.error('Failed to update:', error);
  
  // Optionally show user feedback
  toast.error('Failed to update todo');
}
```

## Performance Considerations

### Caching

The module uses RemoteStorage's built-in caching:

- **Default cache age**: 24 hours
- **Custom cache age**: Pass `maxAge` option in milliseconds
- **Cache scope**: `/todonna/` directory

```typescript
// Use cached data (fast)
const todos = await remoteStorage.todonna.getAll();

// Force fresh data
const freshTodos = await remoteStorage.todonna.getAll({ maxAge: 0 });
```

### Batch Operations

Use batch operations for multiple updates to improve performance:

```typescript
// ❌ Slow: Multiple individual operations
for (const id of ids) {
  await remoteStorage.todonna.remove(id);
}

// ✅ Fast: Single batch operation
await remoteStorage.todonna.batchRemove(ids);
```

### Optimistic Updates

The module supports optimistic updates for instant UI feedback:

1. Update local state immediately
2. Persist to RemoteStorage in background
3. Rollback on error

This provides the best user experience with no perceived latency.

## Todonna Format Specification

The module stores todos in the Todonna format:

```json
{
  "todo_item_text": "Buy groceries",
  "completed": false,
  "emoji": "🛒",
  "date": "2025-11-08T00:00:00.000Z",
  "time": "15:00"
}
```

Files are stored as: `/todonna/{id}.json`

### Differences from Internal Format

| Internal (TodoItem) | Todonna Format | Notes |
|---------------------|----------------|-------|
| `text` | `todo_item_text` | Todonna spec field name |
| `date: Date` | `date: string` | Serialized to ISO 8601 |
| `removed?: boolean` | N/A | Internal soft-delete flag |

The module handles all conversions automatically.

## Migration Guide

### From Direct RemoteStorage Calls

**Before:**

```typescript
const client = remoteStorage.scope('/todonna/');
const filename = `${todo.id}.json`;
const item = {
  todo_item_text: todo.text,
  completed: todo.completed,
  emoji: todo.emoji,
  date: todo.date.toISOString(),
  time: todo.time
};
await client.storeFile('application/json', filename, JSON.stringify(item));
```

**After:**

```typescript
await remoteStorage.todonna.add(todo);
```

### From Manual Listing and Loading

**Before:**

```typescript
const client = remoteStorage.scope('/todonna/');
const listing = await client.getListing('');
const filenames = Object.keys(listing);
const todos = await Promise.all(
  filenames.map(async (filename) => {
    const item = await client.getObject(filename);
    return {
      id: filename.replace('.json', ''),
      text: item.todo_item_text,
      completed: item.completed,
      // ... more mapping
    };
  })
);
```

**After:**

```typescript
const todos = await remoteStorage.todonna.getAll();
```

## Best Practices

1. **Always use optimistic updates** for instant UI feedback
2. **Handle errors gracefully** with rollback and user notifications
3. **Use batch operations** for multiple updates
4. **Leverage caching** for better performance
5. **Soft delete when possible** to allow undo functionality
6. **Use the type system** to catch errors at compile time
7. **Document custom extensions** if you add new fields to TodoItem

## Troubleshooting

### Module not found

Make sure the module is properly registered:

```typescript
import { Todonna } from '@/lib/remotestorage-todonna';

const rs = new RemoteStorage({ modules: [Todonna] });
rs.access.claim('todonna', 'rw');
```

### TypeScript errors on `rs.todonna`

Import the type declarations:

```typescript
import '@/types/remotestorage-todonna';
```

### Changes not syncing

1. Check that access is claimed: `rs.access.claim('todonna', 'rw')`
2. Verify RemoteStorage is connected
3. Check browser console for errors
4. Ensure caching is enabled: `rs.caching.enable('/todonna/')`

### Slow performance

1. Use batch operations for multiple updates
2. Adjust cache age if data doesn't change frequently
3. Enable caching: `rs.caching.enable('/todonna/')`
4. Use optimistic updates for instant UI feedback

## License

MIT License - Copyright (c) 2025

## Contributing

When adding new features to the module:

1. Add TSDoc comments to all public functions
2. Update type declarations in `types/remotestorage-todonna.d.ts`
3. Add examples to this documentation
4. Write tests for new functionality
5. Update the CHANGELOG

