import { create } from 'zustand';

interface UIStore {
  // Edit state (scoped to a single todo)
  editingTodoId: string | null;
  editText: string;
  editEmoji: string;
  editTime: string;

  // Loading states
  isLoading: boolean;
  isLoadingTodonna: boolean;

  // Edit actions
  startEditing: (id: string, text: string, emoji?: string, time?: string) => void;
  setEditText: (text: string) => void;
  setEditEmoji: (emoji: string) => void;
  setEditTime: (time: string) => void;
  cancelEditing: () => void;

  // Loading actions
  setIsLoading: (loading: boolean) => void;
  setIsLoadingTodonna: (loading: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // Initial state
  editingTodoId: null,
  editText: '',
  editEmoji: '',
  editTime: '',
  isLoading: false,
  isLoadingTodonna: true,

  // Edit actions
  startEditing: (id: string, text: string, emoji?: string, time?: string) =>
    set({
      editingTodoId: id,
      editText: text,
      editEmoji: emoji || '',
      editTime: time || '',
    }),

  setEditText: (text: string) => set({ editText: text }),

  setEditEmoji: (emoji: string) => set({ editEmoji: emoji }),

  setEditTime: (time: string) => set({ editTime: time }),

  cancelEditing: () =>
    set({
      editingTodoId: null,
      editText: '',
      editEmoji: '',
      editTime: '',
    }),

  // Loading actions
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),

  setIsLoadingTodonna: (loading: boolean) => set({ isLoadingTodonna: loading }),
}));
