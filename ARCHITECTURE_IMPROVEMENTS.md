# Vif Architecture Improvement Proposals

**Document Version**: 1.0
**Created**: October 21, 2025
**Status**: Draft Proposals

This document outlines architectural improvements for the Vif todo application based on analysis of the current codebase. Improvements are categorized by impact and implementation complexity.

---

## Table of Contents

1. [State Management Modernization](#1-state-management-modernization)
2. [AI Action Processing Reliability](#2-ai-action-processing-reliability)
3. [Date/Time Handling Complexity](#3-datetime-handling-complexity)
4. [Type Safety Gaps](#4-type-safety-gaps)
5. [Testing Infrastructure](#5-testing-infrastructure)
6. [RemoteStorage Integration](#6-remotestorage-integration)
7. [Performance Optimizations](#7-performance-optimizations)
8. [Architecture Separation](#8-architecture-separation)
9. [Error Handling & Observability](#9-error-handling--observability)
10. [Security Enhancements](#10-security-enhancements)
11. [Voice Command Reliability](#11-voice-command-reliability)
12. [Data Model Versioning](#12-data-model-versioning)
13. [Quick Wins](#quick-wins)
14. [Implementation Roadmap](#implementation-roadmap)

---

## 1. State Management Modernization

### Current Issues
- Using `localStorage` directly with custom hooks is fragile
- No handling of race conditions or sync conflicts
- State updates can be inconsistent across components
- No centralized state management strategy

### Proposed Solutions

#### Option A: Zustand (Recommended)
```typescript
// lib/state/todo-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface TodoState {
  todos: TodoItem[];
  selectedDate: Date;
  sortBy: SortOption;

  // Actions
  addTodo: (todo: TodoItem) => void;
  deleteTodo: (id: string) => void;
  updateTodo: (id: string, updates: Partial<TodoItem>) => void;
  markComplete: (id: string, complete: boolean) => void;

  // Optimistic updates with rollback
  optimisticUpdate: (id: string, updates: Partial<TodoItem>) => Promise<void>;
}

export const useTodoStore = create<TodoState>()(
  persist(
    (set, get) => ({
      todos: [],
      selectedDate: new Date(),
      sortBy: 'newest',

      addTodo: (todo) => set((state) => ({
        todos: [...state.todos, todo]
      })),

      deleteTodo: (id) => set((state) => ({
        todos: state.todos.filter(t => t.id !== id)
      })),

      updateTodo: (id, updates) => set((state) => ({
        todos: state.todos.map(t =>
          t.id === id ? { ...t, ...updates } : t
        )
      })),

      markComplete: (id, completed) => set((state) => ({
        todos: state.todos.map(t =>
          t.id === id ? { ...t, completed } : t
        )
      })),

      optimisticUpdate: async (id, updates) => {
        const previousTodos = get().todos;

        // Optimistic update
        get().updateTodo(id, updates);

        try {
          // Sync to remote if needed
          await syncToRemote(get().todos);
        } catch (error) {
          // Rollback on failure
          set({ todos: previousTodos });
          throw error;
        }
      }
    }),
    {
      name: 'vif-todo-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        todos: state.todos,
        sortBy: state.sortBy
      }),
    }
  )
);
```

#### Option B: Jotai (For fine-grained reactivity)
```typescript
// lib/state/atoms.ts
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const todosAtom = atomWithStorage<TodoItem[]>('vif-todos', []);
export const selectedDateAtom = atom<Date>(new Date());
export const sortByAtom = atomWithStorage<SortOption>('vif-sort', 'newest');

// Derived atoms
export const filteredTodosAtom = atom((get) => {
  const todos = get(todosAtom);
  const date = get(selectedDateAtom);
  return filterTodosByDate(todos, date);
});

export const progressAtom = atom((get) => {
  const todos = get(filteredTodosAtom);
  return calculateProgress(todos);
});
```

### Implementation Benefits
- Centralized state management
- Built-in persistence
- DevTools support
- Optimistic updates with rollback
- Better TypeScript inference
- Easier testing (can mock store)

### Migration Strategy
1. Install Zustand: `npm install zustand`
2. Create store in `lib/state/todo-store.ts`
3. Migrate one component at a time
4. Remove custom `useLocalStorage` hook
5. Add unit tests for store actions

### Estimated Effort
- **Complexity**: Medium
- **Time**: 2-3 days
- **Risk**: Low (can run in parallel with existing system)

---

## 2. AI Action Processing Reliability

### Current Issues
- Single-shot AI parsing with no retry logic
- No fallback for common patterns
- No validation beyond Zod schema
- All failures result in user error messages
- No caching of similar queries

### Proposed Solutions

#### Retry Logic with Exponential Backoff
```typescript
// lib/services/ai-service.ts
import { retry } from '@vercel/ai-sdk';

export async function determineActionWithRetry(
  text: string,
  context: ActionContext,
  options: RetryOptions = {}
): Promise<DetermineActionResponse> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await determineAction(text, context);
    } catch (error) {
      lastError = error as Error;

      // Don't retry on validation errors
      if (error instanceof ValidationError) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const delay = Math.min(
          initialDelay * Math.pow(2, attempt),
          maxDelay
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Fallback to pattern matching
  console.warn('AI parsing failed, falling back to regex patterns');
  return fallbackParser(text, context);
}
```

#### Fallback Pattern Matching
```typescript
// lib/services/fallback-parser.ts
export function fallbackParser(
  text: string,
  context: ActionContext
): DetermineActionResponse {
  const patterns = [
    // Add todo patterns
    {
      regex: /^add|create|new\s+(.+)/i,
      handler: (match: RegExpMatchArray) => ({
        actions: [{
          action: 'add' as const,
          text: match[1],
          emoji: '📝',
          targetDate: context.selectedDate,
        }]
      })
    },

    // Complete todo patterns
    {
      regex: /^done|complete|finished?\s+(.+)/i,
      handler: (match: RegExpMatchArray) => {
        const todoId = findTodoByText(match[1], context.todos);
        return todoId ? {
          actions: [{
            action: 'mark' as const,
            todoId,
            status: 'complete' as const,
          }]
        } : null;
      }
    },

    // Delete patterns
    {
      regex: /^delete|remove\s+(.+)/i,
      handler: (match: RegExpMatchArray) => {
        const todoId = findTodoByText(match[1], context.todos);
        return todoId ? {
          actions: [{
            action: 'delete' as const,
            todoId,
          }]
        } : null;
      }
    },

    // Clear patterns
    {
      regex: /^clear\s+(all|completed|incomplete)/i,
      handler: (match: RegExpMatchArray) => ({
        actions: [{
          action: 'clear' as const,
          listToClear: match[1] as 'all' | 'completed' | 'incomplete',
        }]
      })
    }
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match) {
      const result = pattern.handler(match);
      if (result) return result;
    }
  }

  // Default: treat as new todo
  return {
    actions: [{
      action: 'add',
      text: text,
      emoji: '📝',
      targetDate: context.selectedDate,
    }]
  };
}
```

#### Query Caching
```typescript
// lib/services/ai-cache.ts
interface CacheEntry {
  query: string;
  response: DetermineActionResponse;
  timestamp: number;
  context: string; // Serialized context for cache key
}

class AICache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxAge = 5 * 60 * 1000; // 5 minutes
  private maxSize = 100;

  getCacheKey(text: string, context: ActionContext): string {
    // Create deterministic key from text and relevant context
    const contextKey = JSON.stringify({
      todoCount: context.todos.length,
      selectedDate: context.selectedDate,
    });
    return `${text.toLowerCase().trim()}:${contextKey}`;
  }

  get(text: string, context: ActionContext): DetermineActionResponse | null {
    const key = this.getCacheKey(text, context);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry.response;
  }

  set(text: string, context: ActionContext, response: DetermineActionResponse): void {
    const key = this.getCacheKey(text, context);

    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      query: text,
      response,
      timestamp: Date.now(),
      context: JSON.stringify(context),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const aiCache = new AICache();
```

#### Confidence Scoring
```typescript
// Extend AI prompt to include confidence score
const actionSchema = z.object({
  actions: z.array(actionItemSchema),
  confidence: z.number().min(0).max(1).describe(
    'Confidence score (0-1) for the parsed actions'
  ),
  reasoning: z.string().optional().describe(
    'Brief explanation of the interpretation'
  ),
});

// In component, show confirmation for low confidence
if (response.confidence < 0.7) {
  // Show preview dialog
  const confirmed = await showActionPreview(response.actions, response.reasoning);
  if (!confirmed) return;
}
```

### Implementation Benefits
- Improved reliability during AI service outages
- Faster response for common patterns
- Better user experience with confirmations
- Reduced API costs through caching
- Graceful degradation

### Estimated Effort
- **Complexity**: Medium
- **Time**: 3-4 days
- **Risk**: Low

---

## 3. Date/Time Handling Complexity

### Current Issues
- Timezone logic scattered across multiple files
- Using `date-fns` which lacks timezone support
- No explicit timezone storage per todo
- Edge cases with daylight saving time
- No recurring task support

### Proposed Solutions

#### Centralized Date Service
```typescript
// lib/services/date-service.ts
import { DateTime, Interval } from 'luxon';

export class DateService {
  private timezone: string;

  constructor(timezone?: string) {
    this.timezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  /**
   * Get current date in user's timezone
   */
  now(): DateTime {
    return DateTime.now().setZone(this.timezone);
  }

  /**
   * Parse natural language date relative to a reference date
   */
  parseNaturalDate(input: string, referenceDate?: DateTime): DateTime | null {
    const ref = referenceDate || this.now();

    const patterns: Record<string, () => DateTime> = {
      'today': () => ref.startOf('day'),
      'tomorrow': () => ref.plus({ days: 1 }).startOf('day'),
      'yesterday': () => ref.minus({ days: 1 }).startOf('day'),
      'next week': () => ref.plus({ weeks: 1 }).startOf('week'),
      'next month': () => ref.plus({ months: 1 }).startOf('month'),
    };

    // Check exact matches
    const lower = input.toLowerCase().trim();
    if (patterns[lower]) {
      return patterns[lower]();
    }

    // Relative days: "in 3 days", "3 days from now"
    const relativeDays = input.match(/(?:in\s+)?(\d+)\s+days?(?:\s+from\s+now)?/i);
    if (relativeDays) {
      return ref.plus({ days: parseInt(relativeDays[1]) }).startOf('day');
    }

    // Weekdays: "next monday", "friday"
    const weekdayMatch = input.match(/(?:next\s+)?(\w+day)/i);
    if (weekdayMatch) {
      return this.nextWeekday(weekdayMatch[1], ref);
    }

    // ISO dates
    const isoMatch = input.match(/^\d{4}-\d{2}-\d{2}$/);
    if (isoMatch) {
      return DateTime.fromISO(input, { zone: this.timezone });
    }

    return null;
  }

  /**
   * Parse time in various formats
   */
  parseTime(input: string): { hour: number; minute: number } | null {
    // 24-hour: "14:30", "09:00"
    const time24 = input.match(/^(\d{1,2}):(\d{2})$/);
    if (time24) {
      return {
        hour: parseInt(time24[1]),
        minute: parseInt(time24[2]),
      };
    }

    // 12-hour: "3pm", "9:30am", "2:15 PM"
    const time12 = input.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
    if (time12) {
      let hour = parseInt(time12[1]);
      const minute = time12[2] ? parseInt(time12[2]) : 0;
      const meridiem = time12[3].toLowerCase();

      if (meridiem === 'pm' && hour !== 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;

      return { hour, minute };
    }

    return null;
  }

  /**
   * Format date for display
   */
  formatDate(date: DateTime, format: 'short' | 'medium' | 'long' = 'medium'): string {
    const today = this.now().startOf('day');
    const tomorrow = today.plus({ days: 1 });

    if (date.hasSame(today, 'day')) {
      return 'Today';
    } else if (date.hasSame(tomorrow, 'day')) {
      return 'Tomorrow';
    }

    switch (format) {
      case 'short':
        return date.toFormat('MMM d');
      case 'medium':
        return date.toFormat('ccc, MMM d');
      case 'long':
        return date.toFormat('cccc, MMMM d, yyyy');
    }
  }

  /**
   * Get next occurrence of a weekday
   */
  private nextWeekday(weekday: string, ref: DateTime): DateTime {
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const targetDay = weekdays.indexOf(weekday.toLowerCase()) + 1; // Luxon uses 1-7

    if (targetDay === 0) return ref; // Invalid weekday

    let result = ref.startOf('day');
    while (result.weekday !== targetDay) {
      result = result.plus({ days: 1 });
    }

    // If the weekday is today, use next week
    if (result.hasSame(ref, 'day')) {
      result = result.plus({ weeks: 1 });
    }

    return result;
  }

  /**
   * Calculate recurring dates using RRule
   */
  generateRecurrence(
    start: DateTime,
    rule: string,
    count: number = 10
  ): DateTime[] {
    // Integration with rrule library
    // Implementation depends on requirements
    return [];
  }
}

// Singleton instance
export const dateService = new DateService();
```

#### Update TodoItem Type
```typescript
// types/index.ts
interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  emoji?: string;

  // Enhanced date/time fields
  date: string;              // ISO date string
  time?: string;             // HH:mm in 24-hour format
  timezone: string;          // IANA timezone

  // Recurring task support
  recurrence?: {
    rule: string;            // RRule string
    parentId?: string;       // Link to parent recurring task
  };

  removed?: boolean;
  createdAt: string;         // ISO timestamp
  updatedAt: string;         // ISO timestamp
}
```

### Implementation Benefits
- Consistent timezone handling
- Support for travelers across timezones
- Accurate DST transitions
- Foundation for recurring tasks
- Better date parsing accuracy

### Estimated Effort
- **Complexity**: High
- **Time**: 5-7 days
- **Risk**: Medium (requires data migration)

---

## 4. Type Safety Gaps

### Current Issues
- `removed?: boolean` creates soft-deleted items that clutter state
- Action processing uses large switch statements
- No runtime validation beyond AI responses
- Implicit state transitions

### Proposed Solutions

#### Separate Active and Archived Collections
```typescript
// types/index.ts
export interface ActiveTodo {
  id: string;
  text: string;
  completed: boolean;
  emoji?: string;
  date: string;
  time?: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArchivedTodo extends ActiveTodo {
  archivedAt: string;
  archiveReason: 'deleted' | 'completed' | 'manual';
}

export interface TodoState {
  active: ActiveTodo[];
  archived: ArchivedTodo[];
}
```

#### Discriminated Unions for Actions
```typescript
// types/actions.ts
export type TodoAction =
  | { type: 'add'; payload: AddTodoPayload }
  | { type: 'delete'; payload: { id: string } }
  | { type: 'mark'; payload: { id: string; completed: boolean } }
  | { type: 'edit'; payload: { id: string; updates: Partial<ActiveTodo> } }
  | { type: 'sort'; payload: { sortBy: SortOption } }
  | { type: 'clear'; payload: { filter: ClearFilter } }
  | { type: 'archive'; payload: { id: string; reason: ArchiveReason } }
  | { type: 'restore'; payload: { id: string } };

export interface AddTodoPayload {
  text: string;
  emoji?: string;
  date: string;
  time?: string;
  timezone: string;
}

export type ClearFilter = 'all' | 'completed' | 'incomplete';
export type ArchiveReason = 'deleted' | 'completed' | 'manual';
```

#### Extracted Action Handlers
```typescript
// lib/actions/todo-actions.ts
export class TodoActionHandler {
  constructor(private store: TodoStore) {}

  add(payload: AddTodoPayload): void {
    const todo: ActiveTodo = {
      id: nanoid(),
      text: payload.text,
      completed: false,
      emoji: payload.emoji,
      date: payload.date,
      time: payload.time,
      timezone: payload.timezone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.store.setState((state) => ({
      active: [...state.active, todo],
    }));
  }

  delete(id: string): void {
    const todo = this.store.getState().active.find(t => t.id === id);
    if (!todo) return;

    const archived: ArchivedTodo = {
      ...todo,
      archivedAt: new Date().toISOString(),
      archiveReason: 'deleted',
    };

    this.store.setState((state) => ({
      active: state.active.filter(t => t.id !== id),
      archived: [...state.archived, archived],
    }));
  }

  mark(id: string, completed: boolean): void {
    this.store.setState((state) => ({
      active: state.active.map(todo =>
        todo.id === id
          ? { ...todo, completed, updatedAt: new Date().toISOString() }
          : todo
      ),
    }));

    // Auto-archive completed tasks after 30 days
    if (completed) {
      setTimeout(() => this.autoArchiveOldCompletedTasks(), 0);
    }
  }

  edit(id: string, updates: Partial<ActiveTodo>): void {
    this.store.setState((state) => ({
      active: state.active.map(todo =>
        todo.id === id
          ? { ...todo, ...updates, updatedAt: new Date().toISOString() }
          : todo
      ),
    }));
  }

  archive(id: string, reason: ArchiveReason): void {
    const todo = this.store.getState().active.find(t => t.id === id);
    if (!todo) return;

    const archived: ArchivedTodo = {
      ...todo,
      archivedAt: new Date().toISOString(),
      archiveReason: reason,
    };

    this.store.setState((state) => ({
      active: state.active.filter(t => t.id !== id),
      archived: [...state.archived, archived],
    }));
  }

  restore(id: string): void {
    const archived = this.store.getState().archived.find(t => t.id === id);
    if (!archived) return;

    const { archivedAt, archiveReason, ...todo } = archived;

    this.store.setState((state) => ({
      active: [...state.active, todo],
      archived: state.archived.filter(t => t.id !== id),
    }));
  }

  clear(filter: ClearFilter): void {
    const { active } = this.store.getState();

    const toArchive = active.filter(todo => {
      switch (filter) {
        case 'all': return true;
        case 'completed': return todo.completed;
        case 'incomplete': return !todo.completed;
      }
    }).map(todo => ({
      ...todo,
      archivedAt: new Date().toISOString(),
      archiveReason: 'deleted' as const,
    }));

    this.store.setState((state) => ({
      active: state.active.filter(todo => !toArchive.find(t => t.id === todo.id)),
      archived: [...state.archived, ...toArchive],
    }));
  }

  private autoArchiveOldCompletedTasks(): void {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const { active } = this.store.getState();

    const toArchive = active
      .filter(todo =>
        todo.completed &&
        new Date(todo.updatedAt).getTime() < thirtyDaysAgo
      )
      .map(todo => ({
        ...todo,
        archivedAt: new Date().toISOString(),
        archiveReason: 'completed' as const,
      }));

    if (toArchive.length === 0) return;

    this.store.setState((state) => ({
      active: state.active.filter(todo => !toArchive.find(t => t.id === todo.id)),
      archived: [...state.archived, ...toArchive],
    }));
  }
}
```

#### Runtime Validation
```typescript
// lib/validators/todo-validator.ts
import { z } from 'zod';

export const activeTodoSchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(500),
  completed: z.boolean(),
  emoji: z.string().emoji().optional(),
  date: z.string().datetime(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timezone: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const archivedTodoSchema = activeTodoSchema.extend({
  archivedAt: z.string().datetime(),
  archiveReason: z.enum(['deleted', 'completed', 'manual']),
});

export function validateTodo(data: unknown): ActiveTodo {
  return activeTodoSchema.parse(data);
}

export function validateTodoArray(data: unknown): ActiveTodo[] {
  return z.array(activeTodoSchema).parse(data);
}
```

### Implementation Benefits
- Cleaner state management (no soft deletes)
- Archive view for deleted items
- Type-safe action handlers
- Easier testing (pure functions)
- Auto-archiving of old completed tasks
- Restore functionality

### Estimated Effort
- **Complexity**: Medium-High
- **Time**: 4-5 days
- **Risk**: Medium (requires data migration)

---

## 5. Testing Infrastructure

### Current Issues
- No tests exist
- Hard to test due to tight coupling
- No CI/CD pipeline
- Manual testing only

### Proposed Solutions

#### Test Structure
```
tests/
├── unit/
│   ├── lib/
│   │   ├── utils/
│   │   │   ├── todo.test.ts
│   │   │   └── date.test.ts
│   │   ├── services/
│   │   │   ├── ai-service.test.ts
│   │   │   ├── date-service.test.ts
│   │   │   └── storage-service.test.ts
│   │   └── actions/
│   │       └── todo-actions.test.ts
│   └── hooks/
│       ├── use-local-storage.test.ts
│       └── use-speech-recognition.test.ts
│
├── integration/
│   ├── ai-action-flow.test.ts
│   ├── remote-storage-sync.test.ts
│   └── voice-command.test.ts
│
└── e2e/
    ├── critical-flows.spec.ts
    ├── pwa-install.spec.ts
    └── offline-mode.spec.ts
```

#### Unit Test Examples
```typescript
// tests/unit/lib/utils/todo.test.ts
import { describe, it, expect } from 'vitest';
import { serializeTodo, filterTodosByDate, calculateProgress } from '@/lib/utils/todo';

describe('serializeTodo', () => {
  it('should convert ISO strings to Date objects', () => {
    const input = {
      id: '1',
      text: 'Test',
      completed: false,
      date: '2025-10-21T00:00:00.000Z',
      createdAt: '2025-10-21T10:00:00.000Z',
      updatedAt: '2025-10-21T10:00:00.000Z',
    };

    const result = serializeTodo(input);

    expect(result.date).toBeInstanceOf(Date);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });
});

describe('filterTodosByDate', () => {
  const todos = [
    {
      id: '1',
      text: 'Task 1',
      completed: false,
      date: new Date('2025-10-21'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      text: 'Task 2',
      completed: false,
      date: new Date('2025-10-22'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it('should filter todos by date', () => {
    const result = filterTodosByDate(todos, new Date('2025-10-21'));

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});

describe('calculateProgress', () => {
  it('should calculate completion percentage', () => {
    const todos = [
      { id: '1', completed: true },
      { id: '2', completed: false },
      { id: '3', completed: true },
    ];

    const result = calculateProgress(todos);

    expect(result).toBe(67); // 2/3 = 66.67 -> 67
  });

  it('should return 0 for empty array', () => {
    expect(calculateProgress([])).toBe(0);
  });
});
```

#### Integration Test Example
```typescript
// tests/integration/ai-action-flow.test.ts
import { describe, it, expect, vi } from 'vitest';
import { determineAction } from '@/app/actions';
import { TodoActionHandler } from '@/lib/actions/todo-actions';

vi.mock('@ai-sdk/openai', () => ({
  generateObject: vi.fn().mockResolvedValue({
    object: {
      actions: [{
        action: 'add',
        text: 'Buy groceries',
        emoji: '🛒',
        targetDate: '2025-10-21',
      }]
    }
  })
}));

describe('AI Action Flow', () => {
  it('should parse natural language and execute actions', async () => {
    const mockStore = createMockStore();
    const handler = new TodoActionHandler(mockStore);

    const response = await determineAction(
      'buy groceries tomorrow',
      '📝',
      [],
      'vif-openai',
      'America/Los_Angeles'
    );

    expect(response.actions).toHaveLength(1);
    expect(response.actions[0].action).toBe('add');
    expect(response.actions[0].text).toBe('Buy groceries');

    // Execute action
    handler.add(response.actions[0]);

    const state = mockStore.getState();
    expect(state.active).toHaveLength(1);
    expect(state.active[0].text).toBe('Buy groceries');
  });
});
```

#### E2E Test Example (Playwright)
```typescript
// tests/e2e/critical-flows.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Critical User Flows', () => {
  test('should add todo via natural language', async ({ page }) => {
    await page.goto('/');

    // Enter todo
    await page.fill('[data-testid="todo-input"]', 'buy milk tomorrow');
    await page.click('[data-testid="submit-button"]');

    // Wait for AI processing
    await page.waitForSelector('[data-testid="todo-item"]');

    // Verify todo was added
    const todoText = await page.textContent('[data-testid="todo-item-text"]');
    expect(todoText).toContain('buy milk');
  });

  test('should complete todo by voice command', async ({ page, context }) => {
    // Grant microphone permission
    await context.grantPermissions(['microphone']);

    await page.goto('/');

    // Add a todo first
    await page.fill('[data-testid="todo-input"]', 'test task');
    await page.click('[data-testid="submit-button"]');
    await page.waitForSelector('[data-testid="todo-item"]');

    // Start voice recording
    await page.click('[data-testid="mic-button"]');

    // Simulate voice input (this would require actual audio in real tests)
    // For testing, we can mock the transcription result

    // Verify todo was marked complete
    await expect(page.locator('[data-testid="todo-item"]')).toHaveClass(/completed/);
  });

  test('should persist todos across page refresh', async ({ page }) => {
    await page.goto('/');

    // Add todo
    await page.fill('[data-testid="todo-input"]', 'persistent task');
    await page.click('[data-testid="submit-button"]');
    await page.waitForSelector('[data-testid="todo-item"]');

    // Refresh page
    await page.reload();

    // Verify todo still exists
    const todoText = await page.textContent('[data-testid="todo-item-text"]');
    expect(todoText).toContain('persistent task');
  });
});
```

#### CI/CD Pipeline (GitHub Actions)
```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run type-check

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
```

#### Package.json Scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch",
    "type-check": "tsc --noEmit"
  }
}
```

### Implementation Benefits
- Confidence in refactoring
- Catch regressions early
- Documentation through tests
- Faster development (TDD)
- CI/CD integration

### Estimated Effort
- **Complexity**: High
- **Time**: 7-10 days (initial setup + core tests)
- **Risk**: Low

---

## 6. RemoteStorage Integration

### Current Issues
- Singleton pattern with implicit initialization
- No connection state management UI
- No conflict resolution strategy
- Unclear sync status
- No background sync

### Proposed Solutions

#### React Context for RemoteStorage
```typescript
// lib/contexts/remote-storage-context.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import RemoteStorage from 'remotestoragejs';

interface RemoteStorageContextValue {
  client: RemoteStorage | null;
  isConnected: boolean;
  isConnecting: boolean;
  userAddress: string | null;
  error: Error | null;

  connect: (userAddress: string) => Promise<void>;
  disconnect: () => void;
  syncNow: () => Promise<void>;
}

const RemoteStorageContext = createContext<RemoteStorageContextValue | null>(null);

export function RemoteStorageProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<RemoteStorage | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Initialize RemoteStorage
    const rs = new RemoteStorage();
    rs.access.claim('vif-todos', 'rw');
    rs.caching.enable('/vif-todos/');

    // Event listeners
    rs.on('connected', () => {
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
    });

    rs.on('disconnected', () => {
      setIsConnected(false);
      setUserAddress(null);
    });

    rs.on('error', (err) => {
      setError(err);
      setIsConnecting(false);
    });

    setClient(rs);

    return () => {
      rs.disconnect();
    };
  }, []);

  const connect = async (address: string) => {
    if (!client) return;

    setIsConnecting(true);
    setError(null);

    try {
      await client.connect(address);
      setUserAddress(address);
    } catch (err) {
      setError(err as Error);
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (!client) return;
    client.disconnect();
  };

  const syncNow = async () => {
    if (!client) return;
    await client.sync();
  };

  return (
    <RemoteStorageContext.Provider
      value={{
        client,
        isConnected,
        isConnecting,
        userAddress,
        error,
        connect,
        disconnect,
        syncNow,
      }}
    >
      {children}
    </RemoteStorageContext.Provider>
  );
}

export function useRemoteStorage() {
  const context = useContext(RemoteStorageContext);
  if (!context) {
    throw new Error('useRemoteStorage must be used within RemoteStorageProvider');
  }
  return context;
}
```

#### Sync Status UI Component
```typescript
// components/remote-storage-status.tsx
export function RemoteStorageStatus() {
  const { isConnected, isConnecting, userAddress, error, syncNow } = useRemoteStorage();
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncNow();
      setLastSync(new Date());
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isConnected) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span className="text-muted-foreground">
          Connected to {userAddress}
        </span>
      </div>

      {lastSync && (
        <span className="text-muted-foreground">
          Last sync: {formatDistanceToNow(lastSync, { addSuffix: true })}
        </span>
      )}

      <Button
        size="sm"
        variant="ghost"
        onClick={handleSync}
        disabled={isSyncing}
      >
        {isSyncing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      </Button>

      {error && (
        <div className="text-destructive">
          Sync error: {error.message}
        </div>
      )}
    </div>
  );
}
```

#### Conflict Resolution
```typescript
// lib/services/sync-service.ts
export type ConflictResolutionStrategy =
  | 'last-write-wins'
  | 'manual'
  | 'merge';

export interface SyncConflict {
  localVersion: ActiveTodo;
  remoteVersion: ActiveTodo;
  resolvedVersion?: ActiveTodo;
}

export class SyncService {
  constructor(
    private strategy: ConflictResolutionStrategy = 'last-write-wins'
  ) {}

  async sync(
    localTodos: ActiveTodo[],
    remoteTodos: ActiveTodo[]
  ): Promise<{
    merged: ActiveTodo[];
    conflicts: SyncConflict[];
  }> {
    const conflicts: SyncConflict[] = [];
    const merged = new Map<string, ActiveTodo>();

    // Add all local todos
    localTodos.forEach(todo => merged.set(todo.id, todo));

    // Process remote todos
    for (const remoteTodo of remoteTodos) {
      const localTodo = merged.get(remoteTodo.id);

      if (!localTodo) {
        // New remote todo
        merged.set(remoteTodo.id, remoteTodo);
      } else if (localTodo.updatedAt !== remoteTodo.updatedAt) {
        // Conflict detected
        const resolved = await this.resolveConflict(localTodo, remoteTodo);

        if (resolved) {
          merged.set(remoteTodo.id, resolved);
        } else {
          conflicts.push({
            localVersion: localTodo,
            remoteVersion: remoteTodo,
          });
        }
      }
    }

    return {
      merged: Array.from(merged.values()),
      conflicts,
    };
  }

  private async resolveConflict(
    local: ActiveTodo,
    remote: ActiveTodo
  ): Promise<ActiveTodo | null> {
    switch (this.strategy) {
      case 'last-write-wins':
        return new Date(local.updatedAt) > new Date(remote.updatedAt)
          ? local
          : remote;

      case 'merge':
        // Merge non-conflicting fields
        return {
          ...local,
          ...remote,
          // Keep most recent update
          updatedAt: new Date(local.updatedAt) > new Date(remote.updatedAt)
            ? local.updatedAt
            : remote.updatedAt,
          // Combine text if different
          text: local.text !== remote.text
            ? `${local.text} / ${remote.text}`
            : local.text,
        };

      case 'manual':
        // Return null to indicate manual resolution needed
        return null;
    }
  }
}
```

#### Background Sync with Service Worker
```typescript
// public/sw.js
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-todos') {
    event.waitUntil(syncTodos());
  }
});

async function syncTodos() {
  const cache = await caches.open('vif-sync-queue');
  const requests = await cache.keys();

  for (const request of requests) {
    try {
      await fetch(request.clone());
      await cache.delete(request);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}

// In app code
if ('serviceWorker' in navigator && 'SyncManager' in window) {
  navigator.serviceWorker.ready.then((registration) => {
    return registration.sync.register('sync-todos');
  });
}
```

### Implementation Benefits
- Explicit connection state
- Better error handling
- User awareness of sync status
- Conflict resolution
- Offline-first with background sync

### Estimated Effort
- **Complexity**: High
- **Time**: 5-7 days
- **Risk**: Medium

---

## 7. Performance Optimizations

### Current Issues
- Entire todo list re-renders on any change
- No virtualization for long lists
- No memoization
- Unnecessary re-computations

### Proposed Solutions

#### Virtual List Rendering
```typescript
// components/todo/VirtualTodoList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualTodoList({ todos }: { todos: ActiveTodo[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: todos.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Estimated height of each todo item
    overscan: 5, // Render 5 extra items above/below viewport
  });

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <TodoItem todo={todos[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### Memoized Todo Items
```typescript
// components/todo/TodoItem.tsx
import { memo } from 'react';

export const TodoItem = memo(
  function TodoItem({ todo }: { todo: ActiveTodo }) {
    const handleToggle = useCallback(() => {
      // Toggle logic
    }, [todo.id]);

    const handleEdit = useCallback((updates: Partial<ActiveTodo>) => {
      // Edit logic
    }, [todo.id]);

    return (
      <div className="todo-item">
        <Checkbox checked={todo.completed} onCheckedChange={handleToggle} />
        <span>{todo.emoji}</span>
        <EditableText text={todo.text} onSave={(text) => handleEdit({ text })} />
        {todo.time && <Badge>{todo.time}</Badge>}
      </div>
    );
  },
  // Custom comparison function
  (prevProps, nextProps) => {
    return (
      prevProps.todo.id === nextProps.todo.id &&
      prevProps.todo.text === nextProps.todo.text &&
      prevProps.todo.completed === nextProps.todo.completed &&
      prevProps.todo.emoji === nextProps.todo.emoji &&
      prevProps.todo.time === nextProps.todo.time &&
      prevProps.todo.updatedAt === nextProps.todo.updatedAt
    );
  }
);
```

#### Debounced LocalStorage Writes
```typescript
// lib/hooks/use-debounced-storage.ts
import { useEffect, useRef } from 'react';
import { debounce } from 'lodash-es';

export function useDebouncedStorage<T>(
  key: string,
  value: T,
  delay: number = 500
) {
  const debouncedSave = useRef(
    debounce((value: T) => {
      localStorage.setItem(key, JSON.stringify(value));
    }, delay)
  ).current;

  useEffect(() => {
    debouncedSave(value);

    return () => {
      debouncedSave.cancel();
    };
  }, [value, debouncedSave]);
}
```

#### Lazy Loading
```typescript
// components/todo/index.tsx
import { lazy, Suspense } from 'react';

const RemoteStorageWidget = lazy(() => import('remotestoragejs-widget'));
const EmojiPicker = lazy(() => import('./EmojiPicker'));
const Calendar = lazy(() => import('./Calendar'));

export function Todo() {
  return (
    <div>
      {/* Core UI loads immediately */}
      <TodoInput />
      <TodoList />

      {/* Heavy components load on demand */}
      <Suspense fallback={<Skeleton />}>
        {showEmojiPicker && <EmojiPicker />}
      </Suspense>

      <Suspense fallback={null}>
        {showCalendar && <Calendar />}
      </Suspense>

      <Suspense fallback={null}>
        {isRemoteStorageEnabled && <RemoteStorageWidget />}
      </Suspense>
    </div>
  );
}
```

#### useTransition for Non-Urgent Updates
```typescript
// components/todo/index.tsx
import { useTransition } from 'react';

export function Todo() {
  const [isPending, startTransition] = useTransition();

  const handleSort = (sortBy: SortOption) => {
    startTransition(() => {
      // This update is marked as non-urgent
      setSortBy(sortBy);
    });
  };

  return (
    <div>
      <SortDropdown onChange={handleSort} disabled={isPending} />
      {isPending && <Spinner />}
      <TodoList />
    </div>
  );
}
```

#### Service Worker for Offline Support
```typescript
// public/sw.js
const CACHE_NAME = 'vif-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  // Add other static assets
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }

      // Clone the request
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest).then((response) => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});
```

#### Bundle Analysis & Code Splitting
```typescript
// next.config.ts
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

const config = {
  webpack: (config, { isServer }) => {
    if (process.env.ANALYZE) {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer
            ? '../analyze/server.html'
            : './analyze/client.html',
        })
      );
    }

    // Optimize icon imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '@phosphor-icons/react': '@phosphor-icons/react/dist/icons',
    };

    return config;
  },
};

export default config;
```

### Implementation Benefits
- Smooth scrolling with 1000+ todos
- Faster initial load time
- Reduced re-renders
- Better offline experience
- Smaller bundle size

### Estimated Effort
- **Complexity**: Medium
- **Time**: 3-5 days
- **Risk**: Low

---

## 8. Architecture Separation

### Current Issues
- Business logic mixed in components
- `components/todo/index.tsx` is 900+ lines
- Hard to test
- Tight coupling

### Proposed Structure

```
lib/
├── services/
│   ├── todo-service.ts          # CRUD operations
│   ├── ai-service.ts            # AI interaction layer
│   ├── storage-service.ts       # Storage abstraction
│   ├── sync-service.ts          # RemoteStorage sync
│   └── date-service.ts          # Date/time utilities
│
├── state/
│   ├── todo-store.ts            # Zustand store
│   ├── ui-store.ts              # UI state (modals, loading, etc.)
│   └── selectors.ts             # Derived state selectors
│
├── actions/
│   ├── index.ts                 # Action handler coordinator
│   ├── add-todo.ts              # Add todo action
│   ├── delete-todo.ts           # Delete todo action
│   ├── mark-todo.ts             # Mark complete/incomplete
│   ├── edit-todo.ts             # Edit todo action
│   ├── clear-todos.ts           # Clear todos action
│   └── sort-todos.ts            # Sort action
│
├── utils/
│   ├── todo.ts                  # Todo-specific utilities
│   ├── date.ts                  # Date formatting/parsing
│   └── validators.ts            # Input validation
│
└── hooks/
    ├── use-todos.ts             # Main todos hook
    ├── use-voice-input.ts       # Voice command hook
    └── use-sync.ts              # Sync hook
```

#### Service Layer Example
```typescript
// lib/services/todo-service.ts
export class TodoService {
  constructor(
    private storage: StorageService,
    private sync: SyncService
  ) {}

  async getAll(): Promise<ActiveTodo[]> {
    return this.storage.getTodos();
  }

  async getById(id: string): Promise<ActiveTodo | null> {
    const todos = await this.getAll();
    return todos.find(t => t.id === id) || null;
  }

  async create(data: CreateTodoData): Promise<ActiveTodo> {
    const todo: ActiveTodo = {
      id: nanoid(),
      text: data.text,
      completed: false,
      emoji: data.emoji,
      date: data.date,
      time: data.time,
      timezone: data.timezone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const todos = await this.getAll();
    const updated = [...todos, todo];
    await this.storage.setTodos(updated);
    await this.sync.syncIfConnected(updated);

    return todo;
  }

  async update(id: string, updates: Partial<ActiveTodo>): Promise<ActiveTodo> {
    const todos = await this.getAll();
    const index = todos.findIndex(t => t.id === id);

    if (index === -1) {
      throw new Error(`Todo ${id} not found`);
    }

    const updated = {
      ...todos[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    todos[index] = updated;
    await this.storage.setTodos(todos);
    await this.sync.syncIfConnected(todos);

    return updated;
  }

  async delete(id: string): Promise<void> {
    const todos = await this.getAll();
    const filtered = todos.filter(t => t.id !== id);

    await this.storage.setTodos(filtered);
    await this.sync.syncIfConnected(filtered);
  }

  async markComplete(id: string, completed: boolean): Promise<ActiveTodo> {
    return this.update(id, { completed });
  }

  async clear(filter: 'all' | 'completed' | 'incomplete'): Promise<void> {
    const todos = await this.getAll();

    const filtered = todos.filter(todo => {
      switch (filter) {
        case 'all': return false;
        case 'completed': return !todo.completed;
        case 'incomplete': return todo.completed;
      }
    });

    await this.storage.setTodos(filtered);
    await this.sync.syncIfConnected(filtered);
  }
}
```

#### Simplified Component
```typescript
// components/todo/index.tsx (after refactor)
export function Todo() {
  const { todos, isLoading } = useTodos();
  const { handleVoiceCommand } = useVoiceInput();
  const [input, setInput] = useState('');

  const handleSubmit = async () => {
    if (!input.trim()) return;

    try {
      await handleAction(input);
      setInput('');
    } catch (error) {
      toast.error('Failed to process command');
    }
  };

  return (
    <div>
      <TodoInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        onVoiceCommand={handleVoiceCommand}
        isLoading={isLoading}
      />

      <TodoFilters />

      {isLoading ? (
        <TodoSkeleton />
      ) : todos.length === 0 ? (
        <EmptyState />
      ) : (
        <TodoList todos={todos} />
      )}
    </div>
  );
}
```

#### Custom Hook
```typescript
// lib/hooks/use-todos.ts
export function useTodos() {
  const todos = useTodoStore((state) => state.active);
  const selectedDate = useTodoStore((state) => state.selectedDate);
  const sortBy = useTodoStore((state) => state.sortBy);

  const filteredTodos = useMemo(() => {
    const filtered = filterTodosByDate(todos, selectedDate);
    return sortTodos(filtered, sortBy);
  }, [todos, selectedDate, sortBy]);

  const progress = useMemo(() => {
    return calculateProgress(filteredTodos);
  }, [filteredTodos]);

  return {
    todos: filteredTodos,
    allTodos: todos,
    progress,
    isLoading: useTodoStore((state) => state.isLoading),
  };
}
```

### Implementation Benefits
- Separation of concerns
- Easier testing
- Reusable business logic
- Smaller components
- Clear dependencies

### Estimated Effort
- **Complexity**: High
- **Time**: 7-10 days
- **Risk**: Medium (large refactor)

---

## 9. Error Handling & Observability

### Current Issues
- No error boundaries
- Limited error logging
- No production error tracking
- No performance monitoring

### Proposed Solutions

#### Error Boundary
```typescript
// components/error-boundary.tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);

    // Send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      logError(error, errorInfo);
    }

    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <Button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### Error Logging Service
```typescript
// lib/services/error-service.ts
export interface ErrorLog {
  message: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: string;
  userAgent: string;
  url: string;
}

class ErrorService {
  private logs: ErrorLog[] = [];
  private maxLogs = 50;

  log(error: Error, context?: Record<string, any>) {
    const log: ErrorLog = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.logs.push(log);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Persist to localStorage
    localStorage.setItem('vif-error-logs', JSON.stringify(this.logs));

    // Send to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToSentry(log);
    }

    console.error('Error logged:', log);
  }

  private async sendToSentry(log: ErrorLog) {
    // Integration with Sentry or similar
    if (typeof window.Sentry !== 'undefined') {
      window.Sentry.captureException(new Error(log.message), {
        contexts: {
          error: log,
        },
      });
    }
  }

  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem('vif-error-logs');
  }
}

export const errorService = new ErrorService();
export const logError = (error: Error, context?: Record<string, any>) => {
  errorService.log(error, context);
};
```

#### Analytics Service
```typescript
// lib/services/analytics-service.ts
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: string;
}

class AnalyticsService {
  track(eventName: string, properties?: Record<string, any>) {
    const event: AnalyticsEvent = {
      name: eventName,
      properties,
      timestamp: new Date().toISOString(),
    };

    console.log('Analytics event:', event);

    // Send to Vercel Analytics
    if (typeof window.va !== 'undefined') {
      window.va('event', eventName, properties);
    }

    // Send to custom analytics
    this.sendToBackend(event);
  }

  private async sendToBackend(event: AnalyticsEvent) {
    // Optional: send to your own analytics endpoint
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
    } catch (error) {
      // Silently fail analytics
      console.warn('Analytics failed:', error);
    }
  }
}

export const analytics = new AnalyticsService();

// Usage examples
analytics.track('todo_added', { method: 'text', hasEmoji: true });
analytics.track('voice_command_used', { duration: 3.5 });
analytics.track('ai_parsing_failed', { input: 'user text' });
```

#### Performance Monitoring
```typescript
// lib/services/performance-service.ts
export class PerformanceService {
  measureAction(name: string, action: () => Promise<void>) {
    const start = performance.now();

    return action().finally(() => {
      const duration = performance.now() - start;

      console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);

      // Track slow operations
      if (duration > 1000) {
        analytics.track('slow_operation', {
          operation: name,
          duration,
        });
      }

      // Send to performance monitoring
      if (typeof window.webVitals !== 'undefined') {
        window.webVitals.track(name, duration);
      }
    });
  }

  trackWebVitals() {
    // Track Core Web Vitals
    if ('web-vital' in window) {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(console.log);
        getFID(console.log);
        getFCP(console.log);
        getLCP(console.log);
        getTTFB(console.log);
      });
    }
  }
}

export const performanceService = new PerformanceService();
```

### Implementation Benefits
- Catch and report production errors
- Performance insights
- User behavior analytics
- Proactive issue detection

### Estimated Effort
- **Complexity**: Low-Medium
- **Time**: 2-3 days
- **Risk**: Low

---

## 10. Security Enhancements

### Current Issues
- API keys stored in plain text (RemoteStorage)
- No Content Security Policy
- No rate limiting
- Potential XSS vulnerabilities in AI responses

### Proposed Solutions

#### Encrypt API Keys
```typescript
// lib/services/encryption-service.ts
export class EncryptionService {
  private async getKey(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('vif-salt'), // Use unique salt in production
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  async encrypt(data: string, password: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await this.getKey(password);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(data)
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  }

  async decrypt(encrypted: string, password: string): Promise<string> {
    const decoder = new TextDecoder();
    const key = await this.getKey(password);

    // Decode from base64
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));

    // Extract IV and data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return decoder.decode(decrypted);
  }
}

export const encryptionService = new EncryptionService();
```

#### Content Security Policy
```typescript
// next.config.ts
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://api.openai.com https://api.anthropic.com;
  media-src 'self' blob:;
  worker-src 'self' blob:;
`;

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim(),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(self), geolocation=()',
  },
];

const config = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

#### Rate Limiting
```typescript
// lib/services/rate-limiter.ts
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  isAllowed(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);

    if (validRequests.length >= limit) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(key, validRequests);

    return true;
  }

  getRemainingTime(key: string, limit: number, windowMs: number): number {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    if (requests.length < limit) {
      return 0;
    }

    const oldestRequest = requests[0];
    return Math.max(0, windowMs - (now - oldestRequest));
  }
}

// Usage
const aiRateLimiter = new RateLimiter();

export async function determineActionWithRateLimit(...args) {
  if (!aiRateLimiter.isAllowed('ai-calls', 10, 60000)) {
    const remainingMs = aiRateLimiter.getRemainingTime('ai-calls', 10, 60000);
    throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(remainingMs / 1000)}s`);
  }

  return determineAction(...args);
}
```

#### Input Sanitization
```typescript
// lib/utils/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code'],
    ALLOWED_ATTR: [],
  });
}

export function sanitizeTodoText(text: string): string {
  // Remove any HTML tags
  const withoutHtml = text.replace(/<[^>]*>/g, '');

  // Limit length
  const maxLength = 500;
  const truncated = withoutHtml.slice(0, maxLength);

  // Remove potentially dangerous characters
  return truncated.replace(/[<>]/g, '');
}

export function validateApiKey(key: string): boolean {
  // Check format
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
    return false;
  }

  // Check length
  if (key.length < 20 || key.length > 200) {
    return false;
  }

  return true;
}
```

### Implementation Benefits
- Protected API keys
- XSS prevention
- Request rate limiting
- OWASP compliance

### Estimated Effort
- **Complexity**: Medium
- **Time**: 3-4 days
- **Risk**: Low

---

## 11. Voice Command Reliability

### Current Issues
- No audio level detection (sends silence)
- Single audio format fallback
- No visual feedback during recording
- Limited error handling

### Proposed Solutions

#### Audio Level Visualization
```typescript
// hooks/use-audio-visualizer.ts
export function useAudioVisualizer(stream: MediaStream | null) {
  const [audioLevel, setAudioLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!stream) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 256;
    source.connect(analyser);

    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray);

      // Calculate average level
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(average / 255); // Normalize to 0-1

      animationRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audioContext.close();
    };
  }, [stream]);

  return audioLevel;
}

// Component
export function VoiceVisualizer({ isRecording, stream }) {
  const audioLevel = useAudioVisualizer(stream);

  return (
    <div className="flex gap-1 items-end h-8">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="w-2 bg-primary rounded-full transition-all"
          style={{
            height: `${Math.max(10, audioLevel * 100 * (i + 1) / 5)}%`,
          }}
        />
      ))}
    </div>
  );
}
```

#### Silence Detection
```typescript
// lib/services/audio-service.ts
export class AudioService {
  private silenceThreshold = 0.01; // Adjust based on testing
  private minSilenceDuration = 2000; // 2 seconds
  private silenceStart: number | null = null;

  detectSilence(audioLevel: number): boolean {
    const now = Date.now();

    if (audioLevel < this.silenceThreshold) {
      if (!this.silenceStart) {
        this.silenceStart = now;
      } else if (now - this.silenceStart > this.minSilenceDuration) {
        return true;
      }
    } else {
      this.silenceStart = null;
    }

    return false;
  }

  async hasAudioContent(audioBlob: Blob): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const audioContext = new AudioContext();

        audioContext.decodeAudioData(arrayBuffer, (buffer) => {
          // Check if audio has content
          const channelData = buffer.getChannelData(0);
          const maxAmplitude = Math.max(...channelData.map(Math.abs));

          resolve(maxAmplitude > this.silenceThreshold);
        });
      };

      reader.readAsArrayBuffer(audioBlob);
    });
  }
}

export const audioService = new AudioService();
```

#### Multiple Format Support
```typescript
// hooks/use-speech-recognition.ts (enhanced)
export function useSpeechRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const getSupportedMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav',
    ];

    return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      if (!mimeType) {
        throw new Error('No supported audio format found');
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);

      // Monitor silence
      const silenceInterval = setInterval(() => {
        if (audioService.detectSilence(audioLevel)) {
          stopRecording();
          clearInterval(silenceInterval);
        }
      }, 500);

    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });

        // Check if audio has content
        const hasContent = await audioService.hasAudioContent(audioBlob);
        if (!hasContent) {
          console.warn('No audio content detected');
          resolve(null);
          return;
        }

        // Transcribe
        try {
          const text = await transcribeAudio(audioBlob);
          resolve(text);
        } catch (error) {
          reject(error);
        } finally {
          // Cleanup
          streamRef.current?.getTracks().forEach(track => track.stop());
          streamRef.current = null;
          setIsRecording(false);
        }
      };

      mediaRecorder.stop();
    });
  };

  return {
    isRecording,
    audioLevel,
    stream: streamRef.current,
    startRecording,
    stopRecording,
  };
}
```

#### Push-to-Talk Option
```typescript
// components/todo/MicButton.tsx (enhanced)
export function MicButton() {
  const { isRecording, startRecording, stopRecording } = useSpeechRecognition();
  const [mode, setMode] = useState<'toggle' | 'push-to-talk'>('toggle');

  const handleMouseDown = () => {
    if (mode === 'push-to-talk' && !isRecording) {
      startRecording();
    }
  };

  const handleMouseUp = async () => {
    if (mode === 'push-to-talk' && isRecording) {
      const text = await stopRecording();
      if (text) {
        onTranscription(text);
      }
    }
  };

  const handleClick = async () => {
    if (mode === 'toggle') {
      if (isRecording) {
        const text = await stopRecording();
        if (text) {
          onTranscription(text);
        }
      } else {
        await startRecording();
      }
    }
  };

  return (
    <div>
      <Button
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        className={isRecording ? 'recording' : ''}
      >
        <Microphone weight={isRecording ? 'fill' : 'regular'} />
      </Button>

      <DropdownMenu>
        <DropdownMenuItem onClick={() => setMode('toggle')}>
          Toggle mode
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setMode('push-to-talk')}>
          Push-to-talk mode
        </DropdownMenuItem>
      </DropdownMenu>
    </div>
  );
}
```

#### Web Speech API Fallback
```typescript
// lib/services/transcription-service.ts
export class TranscriptionService {
  async transcribe(audioBlob: Blob): Promise<string> {
    // Try Whisper API first
    try {
      return await this.transcribeWithWhisper(audioBlob);
    } catch (error) {
      console.warn('Whisper transcription failed, trying Web Speech API');
      return await this.transcribeWithWebSpeech(audioBlob);
    }
  }

  private async transcribeWithWhisper(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const data = await response.json();
    return data.text;
  }

  private async transcribeWithWebSpeech(audioBlob: Blob): Promise<string> {
    if (!('webkitSpeechRecognition' in window)) {
      throw new Error('Web Speech API not supported');
    }

    return new Promise((resolve, reject) => {
      const recognition = new webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      recognition.onerror = (event) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      // Convert blob to audio element and play
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.play();
      recognition.start();
    });
  }
}

export const transcriptionService = new TranscriptionService();
```

### Implementation Benefits
- Better voice UX
- Reduced wasted API calls
- Visual feedback
- Fallback options
- Multiple input modes

### Estimated Effort
- **Complexity**: Medium
- **Time**: 3-4 days
- **Risk**: Low

---

## 12. Data Model Versioning

### Current Issues
- No schema versioning
- No migration strategy
- Breaking changes break app
- No backward compatibility

### Proposed Solutions

#### Versioned Schema
```typescript
// types/versioned-todo.ts
export const TODO_SCHEMA_VERSION = 2;

export interface TodoV1 {
  id: string;
  text: string;
  completed: boolean;
  emoji?: string;
  date: Date;
  time?: string;
  removed?: boolean;
}

export interface TodoV2 {
  version: 2;
  id: string;
  text: string;
  completed: boolean;
  emoji?: string;
  date: string;        // Changed to ISO string
  time?: string;
  timezone: string;    // New field
  createdAt: string;   // New field
  updatedAt: string;   // New field
  removed?: boolean;
}

export type TodoItem = TodoV2;
export type LegacyTodoItem = TodoV1 | TodoV2;
```

#### Migration System
```typescript
// lib/migrations/todo-migrations.ts
export interface Migration {
  version: number;
  migrate: (data: any) => any;
  rollback?: (data: any) => any;
}

export const migrations: Migration[] = [
  {
    version: 1,
    migrate: (todo: any) => {
      // V0 -> V1: Add version field
      return {
        ...todo,
        version: 1,
      };
    },
  },
  {
    version: 2,
    migrate: (todo: any) => {
      // V1 -> V2: Date objects to ISO strings, add timestamps
      const now = new Date().toISOString();

      return {
        ...todo,
        version: 2,
        date: todo.date instanceof Date
          ? todo.date.toISOString()
          : todo.date,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        createdAt: now,
        updatedAt: now,
      };
    },
    rollback: (todo: any) => {
      // V2 -> V1: ISO strings back to Date objects
      return {
        ...todo,
        version: 1,
        date: new Date(todo.date),
      };
    },
  },
];

export function migrateTodo(todo: any): TodoItem {
  const currentVersion = todo.version || 0;

  if (currentVersion === TODO_SCHEMA_VERSION) {
    return todo as TodoItem;
  }

  let migrated = { ...todo };

  // Apply migrations sequentially
  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      migrated = migration.migrate(migrated);
    }
  }

  return migrated as TodoItem;
}

export function migrateTodoArray(todos: any[]): TodoItem[] {
  return todos.map(migrateTodo);
}
```

#### Storage with Auto-Migration
```typescript
// lib/services/storage-service.ts
export class StorageService {
  private readonly TODOS_KEY = 'vif-todos';
  private readonly VERSION_KEY = 'vif-schema-version';

  getTodos(): TodoItem[] {
    const stored = localStorage.getItem(this.TODOS_KEY);
    if (!stored) return [];

    try {
      const parsed = JSON.parse(stored);
      const migrated = migrateTodoArray(parsed);

      // Update version
      this.setSchemaVersion(TODO_SCHEMA_VERSION);

      // Persist migrated data
      if (migrated !== parsed) {
        this.setTodos(migrated);
      }

      return migrated;
    } catch (error) {
      console.error('Failed to load todos:', error);
      return [];
    }
  }

  setTodos(todos: TodoItem[]): void {
    // Validate schema
    todos.forEach(todo => {
      if (todo.version !== TODO_SCHEMA_VERSION) {
        throw new Error(`Invalid todo version: ${todo.version}`);
      }
    });

    localStorage.setItem(this.TODOS_KEY, JSON.stringify(todos));
    this.setSchemaVersion(TODO_SCHEMA_VERSION);
  }

  private getSchemaVersion(): number {
    const version = localStorage.getItem(this.VERSION_KEY);
    return version ? parseInt(version, 10) : 0;
  }

  private setSchemaVersion(version: number): void {
    localStorage.setItem(this.VERSION_KEY, version.toString());
  }

  needsMigration(): boolean {
    return this.getSchemaVersion() < TODO_SCHEMA_VERSION;
  }

  async backup(): Promise<void> {
    const todos = this.getTodos();
    const backup = {
      version: TODO_SCHEMA_VERSION,
      timestamp: new Date().toISOString(),
      todos,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vif-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async restore(file: File): Promise<void> {
    const text = await file.text();
    const backup = JSON.parse(text);

    if (!backup.todos || !Array.isArray(backup.todos)) {
      throw new Error('Invalid backup file');
    }

    const migrated = migrateTodoArray(backup.todos);
    this.setTodos(migrated);
  }
}

export const storageService = new StorageService();
```

#### Migration Notification UI
```typescript
// components/migration-notice.tsx
export function MigrationNotice() {
  const [show, setShow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (storageService.needsMigration()) {
      setShow(true);
    }
  }, []);

  const handleMigrate = async () => {
    setIsLoading(true);

    try {
      // Backup first
      await storageService.backup();

      // Migrate
      const todos = storageService.getTodos();

      toast.success('Data migrated successfully');
      setShow(false);
    } catch (error) {
      toast.error('Migration failed. Your backup has been downloaded.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!show) return null;

  return (
    <Alert>
      <AlertTitle>Update Available</AlertTitle>
      <AlertDescription>
        Your todo data needs to be updated to the latest format.
        A backup will be created automatically.
      </AlertDescription>
      <div className="mt-4 flex gap-2">
        <Button onClick={handleMigrate} disabled={isLoading}>
          {isLoading ? 'Migrating...' : 'Update Now'}
        </Button>
        <Button variant="outline" onClick={() => setShow(false)}>
          Remind Me Later
        </Button>
      </div>
    </Alert>
  );
}
```

### Implementation Benefits
- Safe schema evolution
- Backward compatibility
- Automatic migrations
- Data integrity
- User confidence

### Estimated Effort
- **Complexity**: Medium
- **Time**: 3-4 days
- **Risk**: Medium (data migration)

---

## Quick Wins

High-impact improvements that require minimal effort:

### 1. Extract Action Handlers
**Effort**: 1 day | **Impact**: High | **Risk**: Low

Move action processing logic from `components/todo/index.tsx` to separate handler functions in `lib/actions/`. Makes code testable and maintainable.

### 2. Add Error Boundaries
**Effort**: 0.5 days | **Impact**: High | **Risk**: Low

Wrap main components in error boundaries to prevent white screen crashes. Improves production reliability immediately.

### 3. Implement Undo/Redo
**Effort**: 1 day | **Impact**: Medium | **Risk**: Low

LocalStorage already has full history capability. Add undo/redo stack with keyboard shortcuts (Cmd+Z).

```typescript
// Simple implementation
const [history, setHistory] = useState<TodoItem[][]>([]);
const [historyIndex, setHistoryIndex] = useState(-1);

const undo = () => {
  if (historyIndex > 0) {
    setHistoryIndex(historyIndex - 1);
    setTodos(history[historyIndex - 1]);
  }
};

const redo = () => {
  if (historyIndex < history.length - 1) {
    setHistoryIndex(historyIndex + 1);
    setTodos(history[historyIndex + 1]);
  }
};
```

### 4. Add Search
**Effort**: 0.5 days | **Impact**: Medium | **Risk**: Low

Filter existing todos array by search term. Add to UI as input field.

```typescript
const [searchTerm, setSearchTerm] = useState('');

const filteredTodos = useMemo(() => {
  return todos.filter(todo =>
    todo.text.toLowerCase().includes(searchTerm.toLowerCase())
  );
}, [todos, searchTerm]);
```

### 5. Archive View
**Effort**: 1 day | **Impact**: Medium | **Risk**: Low

Add UI toggle to show/hide `removed: true` items. Allows users to restore deleted todos.

```typescript
const [showArchived, setShowArchived] = useState(false);

const visibleTodos = useMemo(() => {
  return todos.filter(todo => showArchived || !todo.removed);
}, [todos, showArchived]);
```

### 6. Keyboard Shortcuts
**Effort**: 0.5 days | **Impact**: Medium | **Risk**: Low

Add shortcuts for common actions:
- `N`: New todo
- `Cmd+K`: Search
- `Cmd+Z`: Undo
- `Cmd+Shift+Z`: Redo
- `/`: Focus input

### 7. Export Data
**Effort**: 0.5 days | **Impact**: Low | **Risk**: Low

Download todos as JSON/CSV for backup.

```typescript
function exportTodos() {
  const dataStr = JSON.stringify(todos, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vif-todos.json';
  a.click();
}
```

### 8. Add Loading Skeletons
**Effort**: 0.5 days | **Impact**: Low | **Risk**: Low

Replace loading spinners with skeleton screens for better perceived performance.

### 9. Toast Notifications
**Effort**: 0.5 days | **Impact**: Low | **Risk**: Low

Add toast notifications for actions (todo added, deleted, etc.) using Sonner.

```typescript
import { toast } from 'sonner';

toast.success('Todo added');
toast.error('Failed to process command');
```

### 10. Add Data Attributes for Testing
**Effort**: 0.5 days | **Impact**: Medium | **Risk**: Low

Add `data-testid` attributes to enable E2E testing.

---

## Implementation Roadmap

### Phase 1: Foundation (2-3 weeks)
**Goal**: Improve code quality and testability

1. **Architecture Separation** (#8)
   - Extract services and action handlers
   - Set up proper folder structure
   - Move business logic out of components

2. **Testing Infrastructure** (#5)
   - Set up Vitest and Playwright
   - Write unit tests for utilities
   - Add CI/CD pipeline

3. **Error Handling** (#9)
   - Add error boundaries
   - Implement error logging
   - Set up Sentry integration

4. **Quick Wins**
   - Extract action handlers
   - Add error boundaries
   - Implement undo/redo
   - Add search

### Phase 2: Reliability (2-3 weeks)
**Goal**: Make the app more robust

5. **State Management** (#1)
   - Migrate to Zustand
   - Implement optimistic updates
   - Add proper state persistence

6. **AI Reliability** (#2)
   - Add retry logic
   - Implement fallback parser
   - Add query caching
   - Implement confidence scoring

7. **Type Safety** (#4)
   - Separate active/archived collections
   - Add runtime validation
   - Improve type definitions

8. **Data Versioning** (#12)
   - Implement migration system
   - Add schema versioning
   - Create backup/restore

### Phase 3: Performance (1-2 weeks)
**Goal**: Optimize for scale

9. **Performance Optimizations** (#7)
   - Add virtual scrolling
   - Memoize components
   - Implement lazy loading
   - Add service worker

10. **Quick Wins**
    - Keyboard shortcuts
    - Export data
    - Toast notifications
    - Loading skeletons

### Phase 4: Advanced Features (2-3 weeks)
**Goal**: Enhance functionality

11. **Date/Time Handling** (#3)
    - Centralize date logic
    - Migrate to Luxon
    - Add recurring tasks
    - Improve timezone support

12. **RemoteStorage** (#6)
    - Create React Context
    - Add sync status UI
    - Implement conflict resolution
    - Add background sync

13. **Voice Commands** (#11)
    - Add audio visualization
    - Implement silence detection
    - Add push-to-talk mode
    - Web Speech API fallback

14. **Security** (#10)
    - Encrypt API keys
    - Add CSP headers
    - Implement rate limiting
    - Input sanitization

### Phase 5: Polish (1 week)
**Goal**: Production-ready

15. **Final Testing**
    - E2E test coverage
    - Performance audit
    - Security audit
    - Accessibility audit

16. **Documentation**
    - Update README
    - API documentation
    - Contributing guide
    - User guide

---

## Success Metrics

### Code Quality
- Test coverage > 80%
- Type coverage > 95%
- Zero high-severity security issues
- Lighthouse score > 95

### Performance
- Time to Interactive < 2s
- First Contentful Paint < 1s
- Largest Contentful Paint < 2.5s
- Handle 1000+ todos smoothly

### Reliability
- Error rate < 0.1%
- Uptime > 99.9%
- Zero data loss incidents
- All edge cases handled

### User Experience
- Voice command success rate > 90%
- AI parsing accuracy > 95%
- Average action completion time < 3s
- User satisfaction > 4.5/5

---

## Conclusion

This roadmap provides a structured path to significantly improve Vif's architecture, reliability, and user experience. The recommendations prioritize:

1. **Quick wins** for immediate impact
2. **Foundation** for long-term maintainability
3. **Reliability** for production readiness
4. **Performance** for scalability
5. **Advanced features** for differentiation

Each improvement is designed to be implemented incrementally without breaking existing functionality. The modular approach allows for parallel development and gradual rollout.

**Recommended Starting Point**: Begin with Phase 1 (Foundation) to establish solid architecture and testing infrastructure. This enables safer implementation of subsequent phases.

---

**Document Status**: Draft
**Next Review**: After Phase 1 completion
**Feedback**: Open for team discussion and prioritization
