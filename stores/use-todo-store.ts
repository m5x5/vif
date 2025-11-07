import { create } from 'zustand';
import type RemoteStorage from 'remotestoragejs';
import { format } from 'date-fns';
import { TodoItem, SortOption } from '@/types';
import { serializeTodo, sortTodos } from '@/lib/utils/todo';
import { determineAction } from '@/app/actions';
import { useUIStore } from './use-ui-store';

interface TodoStore {
  // State
  todos: TodoItem[];
  selectedDate: Date;
  sortBy: SortOption;

  // RemoteStorage config
  remoteStorage: RemoteStorage | null;
  apiKey: string;

  // Internal refs (for managing async operations)
  isInitialized: boolean;
  isSaving: boolean;
  isLoading: boolean;

  // Setters
  setRemoteStorage: (rs: RemoteStorage | null) => void;
  setApiKey: (key: string) => void;
  setSelectedDate: (date: Date) => void;
  setSortBy: (option: SortOption) => void;

  // Todo CRUD operations
  addTodo: (todo: TodoItem) => Promise<void>;
  updateTodo: (todo: TodoItem) => Promise<void>;
  deleteTodo: (id: string) => void;
  toggleTodo: (id: string) => void;
  setAllTodos: (todos: TodoItem[]) => Promise<void>;

  // Bulk operations
  clearAllTodos: () => void;
  clearCompletedTodos: () => void;
  clearIncompleteTodos: () => void;

  // RemoteStorage operations
  loadTodos: () => Promise<void>;

  // AI actions
  handleAction: (text: string, emoji: string) => Promise<void>;

  // Selectors (computed)
  getTodosForDate: (date?: Date) => TodoItem[];
  getSortedTodos: (date?: Date) => TodoItem[];
  getDatesWithTodos: () => Set<string>;
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  // Initial state
  todos: [],
  selectedDate: new Date(),
  sortBy: 'newest',
  remoteStorage: null,
  apiKey: '',
  isInitialized: false,
  isSaving: false,
  isLoading: false,

  // Setters
  setRemoteStorage: (rs) => {
    set({ remoteStorage: rs });
    if (rs) {
      // Set up change listener for external changes
      rs.onChange('/todonna/', () => {
        const { isInitialized, isSaving, isLoading } = get();
        // Don't reload if we're currently saving (prevents loops)
        if (isInitialized && !isSaving && !isLoading) {
          console.log('RemoteStorage changed externally, reloading...');
          get().loadTodos();
        }
      });

      // Initial load
      get().loadTodos();
    }
  },

  setApiKey: (key) => set({ apiKey: key }),

  setSelectedDate: (date) => set({ selectedDate: date }),

  setSortBy: (option) => set({ sortBy: option }),

  // Load todos from RemoteStorage using Todonna module
  loadTodos: async () => {
    const { remoteStorage, isLoading: currentlyLoading } = get();

    if (!remoteStorage || currentlyLoading) return;

    set({ isLoading: true });

    // Only show loading indicator for initial load
    const isInitialized = get().isInitialized;
    if (!isInitialized) {
      useUIStore.getState().setIsLoadingTodonna(true);
    }

    try {
      // Use the Todonna module API
      const todos = await remoteStorage.todonna.getAll();
      
      console.log(`Loaded ${todos.length} todos from RemoteStorage`);
      set({ todos, isInitialized: true, isLoading: false });
      useUIStore.getState().setIsLoadingTodonna(false);
    } catch (error) {
      console.error('Failed to load todos:', error);
      set({ todos: [], isInitialized: true, isLoading: false });
      useUIStore.getState().setIsLoadingTodonna(false);
    }
  },

  // Add a new todo using Todonna module
  addTodo: async (todo: TodoItem) => {
    const { remoteStorage, todos } = get();
    if (!remoteStorage) return;

    set({ isSaving: true });

    try {
      // Optimistically update local state first
      set({ todos: [...todos, serializeTodo(todo)] });

      // Use Todonna module API
      await remoteStorage.todonna.add(todo);

      console.log(`Added todo: ${todo.text}`);
    } catch (error) {
      console.error('Failed to add todo:', error);
      // Rollback on error
      set({ todos: todos.filter((t) => t.id !== todo.id) });
    } finally {
      set({ isSaving: false });
    }
  },

  // Update an existing todo using Todonna module
  updateTodo: async (todo: TodoItem) => {
    const { remoteStorage, todos } = get();
    if (!remoteStorage) return;

    set({ isSaving: true });
    const previousTodos = todos;

    try {
      // Optimistically update local state first
      set({
        todos: todos.map((t) => (t.id === todo.id ? serializeTodo(todo) : t)),
      });

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
      console.error('Failed to update todo:', error);
      // Rollback on error
      set({ todos: previousTodos });
    } finally {
      set({ isSaving: false });
    }
  },

  // Delete a todo (soft delete by updating with removed flag)
  deleteTodo: (id: string) => {
    const todo = get().todos.find((t) => t.id === id);
    if (todo) {
      get().updateTodo({ ...todo, removed: true });
    }
  },

  // Toggle todo completion
  toggleTodo: (id: string) => {
    const todo = get().todos.find((t) => t.id === id);
    if (todo) {
      get().updateTodo({ ...todo, completed: !todo.completed });
    }
  },

  // Bulk update todos using Todonna module
  setAllTodos: async (newTodos: TodoItem[]) => {
    const { remoteStorage, todos } = get();
    if (!remoteStorage) return;

    set({ isSaving: true });
    const previousTodos = todos;

    try {
      // Optimistically update local state first
      set({ todos: newTodos.filter((t) => !t.removed).map(serializeTodo) });

      // Use Todonna module's replaceAll for efficient bulk operations
      await remoteStorage.todonna.replaceAll(newTodos.filter((t) => !t.removed));

      console.log(`Bulk updated ${newTodos.length} todos`);
    } catch (error) {
      console.error('Failed to bulk update todos:', error);
      // Rollback on error
      set({ todos: previousTodos });
    } finally {
      set({ isSaving: false });
    }
  },

  // Bulk operations using Todonna module
  clearAllTodos: async () => {
    const { remoteStorage, selectedDate } = get();
    if (!remoteStorage) return;

    set({ isSaving: true });

    try {
      await remoteStorage.todonna.clearByDate(selectedDate);
      // Reload to sync state
      await get().loadTodos();
    } catch (error) {
      console.error('Failed to clear todos:', error);
    } finally {
      set({ isSaving: false });
    }
  },

  clearCompletedTodos: async () => {
    const { remoteStorage, selectedDate } = get();
    if (!remoteStorage) return;

    set({ isSaving: true });

    try {
      await remoteStorage.todonna.clearCompletedByDate(selectedDate);
      // Reload to sync state
      await get().loadTodos();
    } catch (error) {
      console.error('Failed to clear completed todos:', error);
    } finally {
      set({ isSaving: false });
    }
  },

  clearIncompleteTodos: async () => {
    const { remoteStorage, selectedDate } = get();
    if (!remoteStorage) return;

    set({ isSaving: true });

    try {
      await remoteStorage.todonna.clearIncompleteByDate(selectedDate);
      // Reload to sync state
      await get().loadTodos();
    } catch (error) {
      console.error('Failed to clear incomplete todos:', error);
    } finally {
      set({ isSaving: false });
    }
  },

  // AI action handler
  handleAction: async (text: string, emoji: string) => {
    if (!text.trim()) return;

    const { todos, selectedDate, apiKey } = get();

    useUIStore.getState().setIsLoading(true);

    let newTodos = [...todos];

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Filter todos for the selected date
      const filteredTodos = todos.filter((todo) => {
        const todoDate = new Date(todo.date);
        return (
          todoDate.toDateString() === selectedDate.toDateString() &&
          !todo.removed
        );
      });

      const actions = (
        await determineAction(
          text,
          emoji || '',
          filteredTodos,
          'vif-openai',
          timezone,
          apiKey
        )
      ).actions;

      for (const action of actions) {
        switch (action.action) {
          case 'add':
            const todoDate = action.targetDate
              ? new Date(action.targetDate)
              : selectedDate;
            const newTodo = serializeTodo({
              id: Math.random().toString(36).substring(7),
              text: action.text || text,
              completed: false,
              emoji: action.emoji || emoji,
              date: todoDate,
              time: action.time,
            });
            newTodos.push(newTodo);
            break;

          case 'delete':
            if (action.todoId) {
              get().deleteTodo(action.todoId);
            }
            break;

          case 'mark':
            if (action.todoId) {
              newTodos = newTodos.map((todo) =>
                todo.id === action.todoId
                  ? {
                      ...todo,
                      completed:
                        action.status === 'complete'
                          ? true
                          : action.status === 'incomplete'
                          ? false
                          : !todo.completed,
                    }
                  : todo
              );
            }
            break;

          case 'sort':
            if (action.sortBy) {
              set({ sortBy: action.sortBy });
            }
            break;

          case 'edit':
            if (action.todoId && action.text) {
              const todo = todos.find((t) => t.id === action.todoId);
              if (todo) {
                const updated = serializeTodo({
                  ...todo,
                  text: action.text,
                  emoji: action.emoji || todo.emoji,
                  date: action.targetDate ? new Date(action.targetDate) : todo.date,
                  time: action.time || todo.time,
                  completed: action.status === 'complete' ? true : todo.completed,
                });
                await get().updateTodo(updated);
              }
            }
            break;

          case 'clear':
            if (action.listToClear === 'all') {
              await get().clearAllTodos();
            } else if (action.listToClear === 'completed') {
              await get().clearCompletedTodos();
            } else if (action.listToClear === 'incomplete') {
              await get().clearIncompleteTodos();
            }
            break;
        }
      }

      await get().setAllTodos(newTodos);
    } catch (error) {
      console.error('AI Action failed:', error);
      // Fallback: just add the todo as-is
      const fallbackTodo = serializeTodo({
        id: Math.random().toString(36).substring(7),
        text,
        completed: false,
        emoji,
        date: selectedDate,
      });
      await get().addTodo(fallbackTodo);
    } finally {
      useUIStore.getState().setIsLoading(false);
    }
  },

  // Selectors
  getTodosForDate: (date?: Date) => {
    const { todos, selectedDate } = get();
    const targetDate = date || selectedDate;

    return todos.filter((todo) => {
      const todoDate = new Date(todo.date);
      return (
        todoDate.toDateString() === targetDate.toDateString() &&
        !todo.removed
      );
    });
  },

  getSortedTodos: (date?: Date) => {
    const { sortBy } = get();
    const filteredTodos = get().getTodosForDate(date);
    return sortTodos(filteredTodos, sortBy);
  },

  getDatesWithTodos: () => {
    const { todos } = get();
    const dates = new Set<string>();

    todos.forEach((todo) => {
      if (!todo.removed) {
        const dateStr = format(new Date(todo.date), 'yyyy-MM-dd');
        dates.add(dateStr);
      }
    });

    return dates;
  },
}));
